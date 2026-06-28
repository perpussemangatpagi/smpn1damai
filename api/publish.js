export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Dilarang masuk!' });

  const { username, password, title, body, imageBase64, imageName } = req.body;
  
  // 1. Verifikasi keamanan berlapis (Validasi Ulang)
  const usersList = JSON.parse(process.env.CMS_USERS || '[]');
  const user = usersList.find(u => u.user === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Penyusup terdeteksi!' });

  // NAMA AUTHOR TERKUNCI MATI DARI SERVER (Tidak bisa diakali dari web)
  const author = user.nama; 
  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai'; // Sesuaikan repo kamu

  // 2. Siapkan penamaan file
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const fileName = `${dateStr}-${slug}.md`;
  
  let thumbnailPath = '';

  try {
    // 3. Upload Gambar (Jika ada)
    if (imageBase64 && imageName) {
       const imgExt = imageName.split('.').pop();
       const finalImgName = `${date.getTime()}-${slug}.${imgExt}`;
       thumbnailPath = `/images/${finalImgName}`;

       await fetch(`https://api.github.com/repos/${repo}/contents/images/${finalImgName}`, {
         method: 'PUT',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({
           message: `Upload foto: ${title}`,
           content: imageBase64.split(',')[1], 
           branch: 'main'
         })
       });
    }

    // 4. Rakit file Markdown
    const markdownContent = `---
title: "${title}"
date: "${date.toISOString()}"
thumbnail: "${thumbnailPath}"
author: "${author}"
---

${body}`;

    const encodedContent = Buffer.from(markdownContent, 'utf8').toString('base64');

    // 5. Upload Teks Berita
    const mdResponse = await fetch(`https://api.github.com/repos/${repo}/contents/content/berita/${fileName}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Berita Baru oleh ${author}`,
        content: encodedContent,
        branch: 'main'
      })
    });

    if(!mdResponse.ok) throw new Error('Gagal menyambung ke GitHub');
    res.status(200).json({ success: true, message: 'Berita Mantap Mengudara!' });
  } catch (error) {
     res.status(500).json({ error: error.message });
  }
}
