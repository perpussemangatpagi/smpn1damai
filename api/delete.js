export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password, path, sha } = req.body;
  
  const usersList = JSON.parse(process.env.CMS_USERS || '[]');
  const user = usersList.find(u => u.user === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Akses ditolak' });

  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai'; // Sesuaikan jika beda

  try {
    // 1. INTIP DULU ISI BERITANYA (Buat nyari link fotonya)
    const getMd = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let imagePath = null;
    if (getMd.ok) {
        const mdData = await getMd.json();
        const content = Buffer.from(mdData.content, 'base64').toString('utf8');
        const thumbMatch = content.match(/thumbnail:\s*"(.*?)"/);
        if (thumbMatch && thumbMatch[1]) imagePath = thumbMatch[1];
    }

    // 2. HAPUS FILE TEKS BERITANYA
    const delMd = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Hapus berita oleh ${user.nama}`, sha: sha, branch: 'main' })
    });

    if (!delMd.ok) throw new Error('Gagal menghapus berita');

    // 3. HAPUS FOTONYA JUGA KE AKAR-AKARNYA (Kalau ada)
    if (imagePath) {
        const cleanImgPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
        const getImg = await fetch(`https://api.github.com/repos/${repo}/contents/${cleanImgPath}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (getImg.ok) {
            const imgData = await getImg.json();
            await fetch(`https://api.github.com/repos/${repo}/contents/${cleanImgPath}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Hapus foto otomatis oleh ${user.nama}`, sha: imgData.sha, branch: 'main' })
            });
        }
    }

    res.status(200).json({ success: true });
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
}
