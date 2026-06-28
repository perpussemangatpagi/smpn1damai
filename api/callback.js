export default async function handler(req, res) {
  const { code } = req.query;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });
    
    const data = await response.json();
    
    // Kode ini bertugas mengirim Token kembali ke jendela CMS
    const script = `
      <script>
        const message = { token: '${data.access_token}', provider: 'github' };
        window.opener.postMessage('authorization:github:success:' + JSON.stringify(message), '*');
        window.close();
      </script>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(script);
  } catch (error) {
    res.status(500).send('Login Gagal. Silakan tutup jendela ini dan coba lagi.');
  }
}
