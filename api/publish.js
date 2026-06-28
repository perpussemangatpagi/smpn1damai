export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { username, password, title, body, imageBase64, imageName, updateSha, updatePath } = req.body;
  
  const usersList = JSON.parse(process.env.CMS_USERS || '[]');
  const user = usersList.find(u => u.user === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Penyusup terdeteksi!' });

  const author = user.nama; 
  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai'; 

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  
  // Kalau lagi update, pertahankan nama file lamanya. Kalau baru, bikin baru.
  const fileName = updatePath ? updatePath.split('/').pop() : `${dateStr}-${slug}.md`;
  const targetPath = updatePath ? updatePath : `content/berita/${fileName}`;
  
  let thumbnailPath = '';

  try {
    const uploadTasks = [];

    if (imageBase64 && imageName) {
       const imgExt = imageName.split('.').pop();
       const finalImgName = `${date.getTime()}-${slug}.${imgExt}`;
       thumbnailPath = `/images/${finalImgName}`;

       uploadTasks.push(
         fetch(`https://api.github.com/repos/${repo}/contents/images/${finalImgName}`, {
           method: 'PUT',
           headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
           body: JSON.stringify({ message: `Upload foto: ${title}`, content: imageBase64.split(',')[1], branch: 'main' })
         })
       );
    }

    const markdownContent = `---\ntitle: "${title}"\ndate: "${date.toISOString()}"\nthumbnail: "${thumbnailPath}"\nauthor: "${author}"\n---\n\n${body}`;
    const encodedContent = Buffer.from(markdownContent, 'utf8').toString('base64');

    const filePayload = { message: `Update oleh ${author}`, content: encodedContent, branch: 'main' };
    if (updateSha) filePayload.sha = updateSha; // Kunci sakti untuk menimpa file lama

    uploadTasks.push(
      fetch(`https://api.github.com/repos/${repo}/contents/${targetPath}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(filePayload)
      })
    );

    const responses = await Promise.all(uploadTasks);
    for (const response of responses) {
        if (!response.ok) throw new Error('Gagal menyambung ke GitHub');
    }

    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
