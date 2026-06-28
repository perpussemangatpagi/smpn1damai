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
    
    // SKENARIO 1: SUKSES MENDAPATKAN TOKEN
    if (data.access_token) {
      const script = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Login Berhasil! 🚀</h2>
          <p>Menghubungkan ke sistem CMS sekolah...</p>
          <script>
            const message = { token: '${data.access_token}', provider: 'github' };
            // Kirim token kembali ke Sveltia
            window.opener.postMessage('authorization:github:success:' + JSON.stringify(message), '*');
            
            // Beri jeda 1.5 detik agar CMS sempat menangkap sinyal sebelum window ditutup
            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(script);
    } 
    // SKENARIO 2: GAGAL DARI GITHUB
    else {
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(`
        <div style="font-family: sans-serif; padding: 20px;">
          <h2 style="color: red;">⚠️ Gagal Mendapatkan Token</h2>
          <p>Ini balasan dari server GitHub:</p>
          <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px;">${JSON.stringify(data, null, 2)}</pre>
          <p><b>Solusi:</b> Kemungkinan besar kode <code>GITHUB_CLIENT_SECRET</code> di Vercel kurang tepat. Coba buat (generate) Client Secret baru di GitHub, lalu paste ulang di Vercel tanpa ada spasi lebih.</p>
        </div>
      `);
    }
  } catch (error) {
    res.status(500).send('Terjadi kesalahan pada koneksi server API.');
  }
}
