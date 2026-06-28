export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Dilarang masuk!' });
  
  const { username, password } = req.body;
  const usersList = JSON.parse(process.env.CMS_USERS || '[]');
  
  // Cari user yang cocok
  const user = usersList.find(u => u.user === username && u.pass === password);

  if (user) {
    res.status(200).json({ success: true, author: user.nama });
  } else {
    res.status(401).json({ success: false, error: 'Username atau Password salah bre!' });
  }
}
