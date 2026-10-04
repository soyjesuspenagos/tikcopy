export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'URL requerida' })
  }

  // Validar que sea una URL de TikTok
  const isTikTok = ['tiktok.com', 'vm.tiktok', 'vt.tiktok'].some(d => url.includes(d))
  if (!isTikTok) {
    return res.status(400).json({ error: 'URL no válida' })
  }

  try {
    const response = await fetch(
      `https://tiktok-scraper7.p.rapidapi.com/?url=${encodeURIComponent(url)}&hd=1`,
      {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, // ← sin VITE_, es server-side
          'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com',
        },
      }
    )

    const data = await response.json()
    return res.status(200).json(data)

  } catch (error) {
    return res.status(500).json({ error: 'Error al conectar con la API' })
  }
}
