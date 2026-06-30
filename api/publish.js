export default async function handler(req, res) {
  // Hanya menerima metode POST
  if (req.method !== 'POST') return res.status(405).end();
  
  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai'; // Repo HTML Asli
  
  try {
    // Tangkap tambahan data 'date' dari CMS
    const { username, password, title, body, images, updateSha, updatePath, oldImage, imageToDelete, date } = req.body;
    
    // 1. Cek Kredensial User
    const usersList = JSON.parse(process.env.CMS_USERS || '[]');
    const user = usersList.find(u => u.user === username && u.pass === password);
    if (!user) return res.status(401).json({ error: 'Akses ditolak' });

    let finalImagePath = oldImage || '';

    // 2. Eksekusi Mati Foto Lama (Kalau ada perintah)
    if (imageToDelete) {
       try {
          const fileReq = await fetch(`https://api.github.com/repos/${repo}/contents/${imageToDelete}`, { headers: { Authorization: `Bearer ${token}` } });
          if (fileReq.ok) {
             const fileData = await fileReq.json();
             await fetch(`https://api.github.com/repos/${repo}/contents/${imageToDelete}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Hapus foto lama oleh admin', sha: fileData.sha, branch: 'main' })
             });
          }
          if (finalImagePath === imageToDelete) finalImagePath = '';
       } catch(e) { console.log(e); }
    }

    // 3. Upload Foto Baru (Kalau ada)
    if (images && images.length > 0) {
       const img = images[0];
       const imgName = `content/gambar/${Date.now()}-${img.name.replace(/[^a-zA-Z0-9.]/g, '-')}`;
       const base64Data = img.base64.split(',')[1];
       
       const imgReq = await fetch(`https://api.github.com/repos/${repo}/contents/${imgName}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Upload foto dokumentasi', content: base64Data, branch: 'main' })
       });
       if (imgReq.ok) finalImagePath = `/${imgName}`;
    }

    // 4. Rakit File Markdown
    // Ambil tanggal dari input CMS, kalau gagal fallback ke hari ini
    const dateStr = date || new Date().toISOString().split('T')[0];
    
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Path filenya sekarang otomatis ikut tanggal yang dipilih di kalender CMS
    const filePath = updatePath || `content/berita/${dateStr}-${safeTitle}.md`;
    
    const markdownContent = `---\ntitle: "${title}"\nauthor: "${user.nama}"\ndate: "${dateStr}"\nthumbnail: "${finalImagePath}"\n---\n\n${body}`;
    const encodedContent = Buffer.from(markdownContent, 'utf8').toString('base64');
    
    const payload = {
       message: updateSha ? `Update berita: ${title}` : `Publish berita baru: ${title}`,
       content: encodedContent,
       branch: 'main'
    };
    if (updateSha) payload.sha = updateSha;

    const saveRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
       method: 'PUT',
       headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
       body: JSON.stringify(payload)
    });

    if (!saveRes.ok) throw new Error('Gagal menyimpan file Teks ke GitHub');
    
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
