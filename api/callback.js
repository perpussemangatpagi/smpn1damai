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
    
    if (data.access_token) {
      const script = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Login Berhasil! 🚀</h2>
          <p>Meneruskan kunci ke CMS...</p>
          <script>
            // 1. Siapkan format pesan yang dimengerti Sveltia CMS
            const tokenMsg = 'authorization:github:success:{"token":"${data.access_token}","provider":"github"}';
            
            // 2. Lemparkan paksa ke jendela utama
            window.opener.postMessage(tokenMsg, '*');
            
            // 3. Jendela ini harusnya ditutup otomatis sama Sveltia. 
            // Tapi kalau Sveltia malas, kita tutup paksa dalam 2 detik!
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(script);
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send('<h2 style="color:red;">Gagal Login</h2><pre>' + JSON.stringify(data, null, 2) + '</pre>');
    }
  } catch (error) {
    res.status(500).send('Error Server.');
  }
}
