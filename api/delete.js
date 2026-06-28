export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password, path, sha } = req.body;
  
  const usersList = JSON.parse(process.env.CMS_USERS || '[]');
  const user = usersList.find(u => u.user === username && u.pass === password);
  if (!user) return res.status(401).json({ error: 'Akses ditolak' });

  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai';
  try {
    await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Hapus berita oleh ${user.nama}`, sha: sha, branch: 'main' })
    });
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
