import { useState } from 'react'

const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractHashtags(text) {
  return [...new Set((text.match(/#[\w\u00C0-\u024F]+/g) || []))]
}

function extractMentions(text) {
  return [...new Set((text.match(/@[\w.]+/g) || []))]
}

function cleanDescription(text) {
  return text.replace(/#[\w\u00C0-\u024F]+/g, '').replace(/@[\w.]+/g, '').trim()
}

function formatNumber(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

// ── Resolver URL corta ────────────────────────────────────────────────────────
// vt.tiktok.com y vm.tiktok.com son redirects — los resolvemos
// pasando la URL directamente a la API que maneja redirects internamente.
// Si la API falla con URL corta, intentamos con un proxy de resolución.
async function resolveUrl(url) {
  // La API de RapidAPI tiktok-scraper7 acepta URLs cortas directamente
  // pero como fallback usamos allorigins para resolver el redirect
  const shortDomains = ['vt.tiktok.com', 'vm.tiktok.com', 'www.tiktok.com/t/']
  const isShort = shortDomains.some(d => url.includes(d))

  if (!isShort) return url

  try {
    // allorigins actúa como proxy y sigue los redirects
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const res = await fetch(proxyUrl)
    const data = await res.json()
    // La URL final viene en data.status.url
    if (data?.status?.url && data.status.url.includes('tiktok.com')) {
      return data.status.url
    }
  } catch (_) {
    // Si el proxy falla, devolvemos la URL original y dejamos que la API lo intente
  }
  return url
}

// ── Sub-componentes ───────────────────────────────────────────────────────────
function CopyBlock({ label, content, mono = false }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={styles.block}>
      <div style={styles.blockHeader}>
        <span style={styles.blockLabel}>{label}</span>
        <button
          onClick={handleCopy}
          style={{ ...styles.copyBtn, ...(copied ? styles.copyBtnSuccess : {}) }}
        >
          {copied ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>
      <p style={{ ...styles.blockContent, ...(mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : {}) }}>
        {content || <span style={{ color: 'var(--muted)' }}>—</span>}
      </p>
    </div>
  )
}

function StatPill({ label, value }) {
  return (
    <div style={styles.statPill}>
      <span style={styles.statValue}>{formatNumber(value)}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [copiedAll, setCopiedAll] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('Extrayendo...')

  const isValidTikTok = (u) =>
    u.includes('tiktok.com') || u.includes('vm.tiktok') || u.includes('vt.tiktok')

  const handleFetch = async () => {
    if (!url.trim()) return setError('Pega un enlace de TikTok.')
    if (!isValidTikTok(url)) return setError('El enlace no parece ser de TikTok.')
    if (!API_KEY) return setError('Falta la API Key en las variables de entorno.')

    setError('')
    setResult(null)
    setLoading(true)
    setLoadingMsg('Resolviendo enlace...')

    try {
      // Paso 1: resolver URL corta si aplica
      const resolvedUrl = await resolveUrl(url.trim())
      setLoadingMsg('Extrayendo datos del video...')

      // Paso 2: llamar a la API con la URL resuelta
      const res = await fetch(
        `https://tiktok-scraper7.p.rapidapi.com/?url=${encodeURIComponent(resolvedUrl)}&hd=1`,
        {
          headers: {
            'X-RapidAPI-Key': API_KEY,
            'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com',
          },
        }
      )
      const json = await res.json()

      if (json.code !== 0 || !json.data) {
        // Si falla con URL resuelta, intentar con la URL original directamente
        if (resolvedUrl !== url.trim()) {
          setLoadingMsg('Reintentando con URL original...')
          const res2 = await fetch(
            `https://tiktok-scraper7.p.rapidapi.com/?url=${encodeURIComponent(url.trim())}&hd=1`,
            {
              headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com',
              },
            }
          )
          const json2 = await res2.json()
          if (json2.code !== 0 || !json2.data) {
            throw new Error('No se pudo obtener el video. Prueba con la URL completa del video.')
          }
          processResult(json2.data)
          return
        }
        throw new Error(json.msg || 'No se pudo obtener el video.')
      }

      processResult(json.data)
    } catch (e) {
      setError(e.message || 'Error al conectar con la API.')
    } finally {
      setLoading(false)
    }
  }

  const processResult = (d) => {
    const desc = d.title || ''
    setResult({
      description: desc,
      descClean: cleanDescription(desc),
      hashtags: extractHashtags(desc).join(' '),
      mentions: extractMentions(desc).join(' '),
      author: d.author?.nickname || '',
      authorId: d.author?.unique_id ? `@${d.author.unique_id}` : '',
      cover: d.cover,
      plays: d.play_count,
      likes: d.digg_count,
      comments: d.comment_count,
      shares: d.share_count,
      music: d.music_info?.title ? `${d.music_info.title} · ${d.music_info.author}` : '',
    })
  }

  const handleCopyAll = async () => {
    if (!result) return
    const text = [
      `📝 DESCRIPCIÓN COMPLETA:\n${result.description}`,
      result.hashtags ? `\n#️⃣ HASHTAGS:\n${result.hashtags}` : '',
      result.mentions ? `\n👤 MENCIONES:\n${result.mentions}` : '',
      result.music ? `\n🎵 AUDIO:\n${result.music}` : '',
      `\n👤 CREADOR: ${result.author} (${result.authorId})`,
    ].filter(Boolean).join('\n')

    await navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2500)
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleFetch() }

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>Tik</span>
          <span style={styles.logoAccent}>Copy</span>
        </div>
        <p style={styles.tagline}>Extrae el texto de cualquier TikTok al instante</p>
      </header>

      {/* Search */}
      <main style={styles.main}>
        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="url"
            placeholder="https://vt.tiktok.com/... o enlace completo"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError('') }}
            onKeyDown={handleKeyDown}
          />
          <button
            style={{ ...styles.fetchBtn, ...(loading ? styles.fetchBtnDisabled : {}) }}
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? <Spinner /> : '↗'}
          </button>
        </div>

        {/* Tip de URLs cortas */}
        {!result && !loading && !error && (
          <p style={styles.tip}>✓ Soporta enlaces cortos (vt.tiktok.com) y completos</p>
        )}

        {error && <p style={styles.error}>⚠ {error}</p>}

        {/* Loading state */}
        {loading && (
          <div style={styles.loadingState}>
            <p style={styles.loadingMsg}>{loadingMsg}</p>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div style={styles.resultCard}>
            <div style={styles.videoMeta}>
              {result.cover && (
                <img src={result.cover} alt="cover" style={styles.cover} />
              )}
              <div style={styles.videoInfo}>
                <p style={styles.authorName}>{result.author}</p>
                <p style={styles.authorId}>{result.authorId}</p>
                <div style={styles.stats}>
                  <StatPill label="plays" value={result.plays} />
                  <StatPill label="likes" value={result.likes} />
                  <StatPill label="coms" value={result.comments} />
                  <StatPill label="shares" value={result.shares} />
                </div>
              </div>
            </div>

            <button
              style={{ ...styles.copyAllBtn, ...(copiedAll ? styles.copyAllBtnSuccess : {}) }}
              onClick={handleCopyAll}
            >
              {copiedAll ? '✓ Todo copiado al portapapeles' : '⎘ Copiar todo'}
            </button>

            <CopyBlock label="Descripción completa" content={result.description} />
            {result.descClean && result.descClean !== result.description && (
              <CopyBlock label="Solo el texto (sin hashtags ni menciones)" content={result.descClean} />
            )}
            {result.hashtags && (
              <CopyBlock label="Hashtags" content={result.hashtags} />
            )}
            {result.mentions && (
              <CopyBlock label="Menciones" content={result.mentions} />
            )}
            {result.music && (
              <CopyBlock label="Audio / Música" content={result.music} />
            )}
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎵</span>
            <p style={styles.emptyText}>
              Pega el enlace de un TikTok y extrae su descripción, hashtags y menciones con un clic.
            </p>
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        Desarrollado por <span style={{ color: 'var(--blue)' }}>Penagos Lab</span> · Una unidad de Penagos Studio
      </footer>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 18, height: 18,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 600,
    margin: '0 auto',
    padding: '0 16px',
  },
  header: {
    padding: '40px 0 24px',
    textAlign: 'center',
  },
  logo: {
    fontFamily: 'var(--font-display)',
    fontSize: '2.2rem',
    fontWeight: 700,
    letterSpacing: '-0.03em',
    marginBottom: 8,
  },
  logoMark: { color: '#F0F0F0' },
  logoAccent: { color: '#F5C518' },
  tagline: {
    color: '#6B6B6B',
    fontSize: '0.9rem',
  },
  main: { flex: 1, paddingBottom: 32 },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    background: '#141414',
    border: '1px solid #2A2A2A',
    borderRadius: 12,
    padding: '14px 16px',
    color: '#F0F0F0',
    fontSize: '0.95rem',
    outline: 'none',
  },
  fetchBtn: {
    background: '#1B4FD8',
    border: 'none',
    borderRadius: 12,
    width: 52,
    height: 52,
    color: '#fff',
    fontSize: '1.3rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fetchBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  tip: {
    fontSize: '0.75rem',
    color: '#3d6b3d',
    marginBottom: 16,
    paddingLeft: 4,
  },
  error: {
    color: '#F87171',
    fontSize: '0.85rem',
    marginBottom: 12,
    padding: '10px 14px',
    background: 'rgba(248,113,113,0.08)',
    borderRadius: 8,
    border: '1px solid rgba(248,113,113,0.2)',
  },
  loadingState: {
    textAlign: 'center',
    padding: '32px 0',
  },
  loadingMsg: {
    color: '#6B6B6B',
    fontSize: '0.88rem',
    marginTop: 12,
  },
  resultCard: {
    background: '#141414',
    border: '1px solid #2A2A2A',
    borderRadius: 16,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  videoMeta: {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
  },
  cover: {
    width: 72,
    height: 96,
    objectFit: 'cover',
    borderRadius: 8,
    flexShrink: 0,
    border: '1px solid #2A2A2A',
  },
  videoInfo: { flex: 1, minWidth: 0 },
  authorName: {
    fontWeight: 600,
    fontSize: '1rem',
    marginBottom: 2,
    color: '#F0F0F0',
  },
  authorId: {
    color: '#1B4FD8',
    fontSize: '0.82rem',
    marginBottom: 10,
  },
  stats: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    background: '#1E1E1E',
    border: '1px solid #2A2A2A',
    borderRadius: 8,
    padding: '4px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 48,
  },
  statValue: {
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#F5C518',
  },
  statLabel: {
    fontSize: '0.65rem',
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  copyAllBtn: {
    background: '#1B4FD8',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    width: '100%',
  },
  copyAllBtnSuccess: { background: '#16A34A' },
  block: {
    background: '#1E1E1E',
    border: '1px solid #2A2A2A',
    borderRadius: 10,
    padding: 14,
  },
  blockHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    color: '#6B6B6B',
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid #2A2A2A',
    borderRadius: 6,
    padding: '4px 10px',
    color: '#F0F0F0',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  copyBtnSuccess: {
    background: 'rgba(34,197,94,0.15)',
    borderColor: '#22C55E',
    color: '#22C55E',
  },
  blockContent: {
    fontSize: '0.88rem',
    lineHeight: 1.6,
    color: '#F0F0F0',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  },
  emptyState: {
    marginTop: 48,
    textAlign: 'center',
    padding: '0 16px',
  },
  emptyIcon: { fontSize: '2.5rem', display: 'block', marginBottom: 16 },
  emptyText: {
    color: '#6B6B6B',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    maxWidth: 320,
    margin: '0 auto',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0',
    fontSize: '0.75rem',
    color: '#6B6B6B',
    borderTop: '1px solid #2A2A2A',
    marginTop: 'auto',
  },
}
