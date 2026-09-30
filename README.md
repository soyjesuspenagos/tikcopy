# TikCopy 🎵

> Extrae el texto de cualquier TikTok al instante — descripción, hashtags, menciones y audio desde un enlace.

![TikCopy Preview](https://img.shields.io/badge/estado-MVP-yellow?style=flat-square) ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react) ![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite) [![Deploy](https://img.shields.io/badge/deploy-Vercel-black?style=flat-square&logo=vercel)](https://tikcopy.vercel.app)

🔗 **[tikcopy.vercel.app](https://tikcopy.vercel.app)**

---

## ¿Qué es TikCopy?

Los creadores de contenido en TikTok suelen escribir descripciones largas con prompts, recursos e información valiosa — pero la app no permite copiar ese texto. TikCopy resuelve ese problema: pega el enlace del video y extrae todo el contenido textual en segundos, listo para copiar desde cualquier dispositivo.

## Funcionalidades

- 📝 **Descripción completa** del video
- ✂️ **Texto limpio** sin hashtags ni menciones
- **#️⃣ Hashtags** separados y listos para reutilizar
- **👤 Menciones** extraídas automáticamente
- **🎵 Audio / Música** usada en el video
- **📊 Métricas** del video (plays, likes, comentarios, shares)
- **⎘ Copiar todo** con un solo clic
- Diseño **dark mode**, mobile-first

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite |
| Estilos | CSS vanilla (design tokens) |
| API | TikTok Scraper via RapidAPI |
| Deploy | Vercel |

## Estructura del proyecto

```
tiktok-copy-tool/
├── src/
│   ├── App.jsx        # Componente principal y lógica
│   ├── main.jsx       # Entry point
│   └── index.css      # Estilos globales y tokens
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

## Roadmap

- [ ] Extensión de Chrome con botón flotante en TikTok Web
- [ ] Soporte para Instagram Reels
- [ ] Soporte para YouTube Shorts
- [ ] Historial de extracciones
- [ ] Modo batch (múltiples URLs)

---

Desarrollado por **[Penagos Lab](https://penagos.studio)** · Una unidad de Penagos Studio
