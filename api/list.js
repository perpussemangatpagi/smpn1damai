export default async function handler(req, res) {
  const token = process.env.GITHUB_PAT;
  const repo = 'perpussemangatpagi/smpn1damai';
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/contents/content/berita`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
}
