export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Sekarang menerima 'images' dalam bentuk Array
  const { username, password, title, body, images, updateSha, updatePath, oldImage, imageToDelete } = req.body;
  
  const usersList = JSON.parse(process.env.CMS_USERS || '[]');
  const user = usersList.find(u => u.user === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Penyusup terdeteksi!' });

  const author = user.nama; 
  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai'; 

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  
  const fileName = updatePath ? updatePath.split('/').pop() : `${dateStr}-${slug}.md`;
  const targetPath = updatePath ? updatePath : `content/berita/${fileName}`;
  
  let thumbnailPath = oldImage || ''; 
  let appendedGallery = "";

  try {
    // 1. UNGGAH BANYAK FOTO (Secara Berurutan/Antre biar nggak dimarahi GitHub)
    if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
            const imgExt = images[i].name.split('.').pop();
            const finalImgName = `${date.getTime()}-${i}-${slug}.${imgExt}`; // Ditambah index -i- biar unik
            const currentImgPath = `/images/${finalImgName}`;

            const imgRes = await fetch(`https://api.github.com/repos/${repo}/contents/images/${finalImgName}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Upload foto ${i+1}: ${title}`, content: images[i].base64.split(',')[1], branch: 'main' })
            });
            
            if (!imgRes.ok) throw new Error('Gagal mengunggah foto ke-' + (i+1));

            // Aturan Main: Foto Pertama jadi Sampul, sisanya masuk ke isi berita!
            if (i === 0) {
                thumbnailPath = currentImgPath;
            } else {
                appendedGallery += `\n\n![Dokumentasi Tambahan](${currentImgPath})`;
            }
        }
    }

    // 2. UNGGAH TEKS BERITA + FOTO TAMBAHAN
    const finalBody = body + appendedGallery; // Gabung teks asli dengan galeri foto
    const markdownContent = `---\ntitle: "${title}"\ndate: "${date.toISOString()}"\nthumbnail: "${thumbnailPath}"\nauthor: "${author}"\n---\n\n${finalBody}`;
    const encodedContent = Buffer.from(markdownContent, 'utf8').toString('base64');

    const filePayload = { message: `Update oleh ${author}`, content: encodedContent, branch: 'main' };
    if (updateSha) filePayload.sha = updateSha; 

    const mdRes = await fetch(`https://api.github.com/repos/${repo}/contents/${targetPath}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(filePayload)
    });
    if (!mdRes.ok) throw new Error('Gagal menyimpan teks berita');

    // 3. HAPUS FOTO LAMA JIKA ADA
    if (imageToDelete) {
        try {
            const cleanDelPath = imageToDelete.startsWith('/') ? imageToDelete.substring(1) : imageToDelete;
            const getOldImg = await fetch(`https://api.github.com/repos/${repo}/contents/${cleanDelPath}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (getOldImg.ok) {
                const oldImgData = await getOldImg.json();
                await fetch(`https://api.github.com/repos/${repo}/contents/${cleanDelPath}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `Sapu bersih foto lama oleh ${author}`, sha: oldImgData.sha, branch: 'main' })
                });
            }
        } catch (e) { /* Abaikan */ }
    }

    res.status(200).json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
}
