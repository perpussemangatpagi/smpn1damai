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
      // SKENARIO SUKSES: Lakukan Handshake dengan Sveltia CMS
      const script = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Login Berhasil! 🚀</h2>
          <p>Sedang mengirim kunci ke CMS (Jangan tutup jendela ini)...</p>
          <script>
            (function() {
              function receiveMessage(e) {
                // 3. Ketika CMS menjawab "Saya siap", lemparkan tokennya!
                if (e.data === "authorizing:github") {
                  window.opener.postMessage(
                    'authorization:github:success:{"token":"${data.access_token}","provider":"github"}',
                    e.origin
                  );
                  // Hapus pendengar pesan, biarkan Sveltia yang menutup jendela ini
                  window.removeEventListener("message", receiveMessage);
                }
              }
              
              // 1. Pasang telinga untuk menunggu balasan dari CMS utama
              window.addEventListener("message", receiveMessage, false);
              
              // 2. Teriak ke CMS utama: "Halo, saya sudah siap bawa token nih!"
              window.opener.postMessage("authorizing:github", "*");
            })();
          </script>
        </body>
        </html>
      `;
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(script);
    } else {
      // SKENARIO GAGAL
      res.setHeader('Content-Type', 'text/html');
      res.status(200).send('<h2 style="color:red;">Gagal Mendapatkan Token</h2><pre>' + JSON.stringify(data, null, 2) + '</pre>');
    }
  } catch (error) {
    res.status(500).send('Terjadi kesalahan pada koneksi server API.');
  }
}
