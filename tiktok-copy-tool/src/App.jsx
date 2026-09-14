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

  const isValidTikTok = (u) => u.includes('tiktok.com') || u.includes('vm.tiktok')

  const handleFetch = async () => {
    if (!url.trim()) return setError('Pega un enlace de TikTok.')
    if (!isValidTikTok(url)) return setError('El enlace no parece ser de TikTok.')
    if (!API_KEY) return setError('Falta la API Key en las variables de entorno.')

    setError('')
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch(
        `https://tiktok-scraper7.p.rapidapi.com/?url=${encodeURIComponent(url)}&hd=1`,
        {
          headers: {
            'X-RapidAPI-Key': API_KEY,
            'X-RapidAPI-Host': 'tiktok-scraper7.p.rapidapi.com',
          },
        }
      )
      const json = await res.json()

      if (json.code !== 0 || !json.data) {
        throw new Error(json.msg || 'No se pudo obtener el video.')
      }

      const d = json.data
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
        fullText: desc,
      })
    } catch (e) {
      setError(e.message || 'Error al conectar con la API.')
    } finally {
      setLoading(false)
    }
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
            placeholder="https://www.tiktok.com/@usuario/video/..."
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

        {error && <p style={styles.error}>⚠ {error}</p>}

        {/* Resultado */}
        {result && (
          <div style={styles.resultCard}>
            {/* Meta del video */}
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
                  <StatPill label="comments" value={result.comments} />
                  <StatPill label="shares" value={result.shares} />
                </div>
              </div>
            </div>

            {/* Botón copiar todo */}
            <button
              style={{ ...styles.copyAllBtn, ...(copiedAll ? styles.copyAllBtnSuccess : {}) }}
              onClick={handleCopyAll}
            >
              {copiedAll ? '✓ Todo copiado al portapapeles' : '⎘ Copiar todo'}
            </button>

            {/* Bloques */}
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
            <p style={styles.emptyText}>Pega el enlace de un TikTok y extrae su descripción, hashtags y menciones con un clic.</p>
          </div>
        )}
      </main>

      {/* Footer */}
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
  logoMark: { color: 'var(--white)' },
  logoAccent: { color: 'var(--yellow)' },
  tagline: {
    color: 'var(--muted)',
    fontSize: '0.9rem',
    fontWeight: 400,
  },
  main: { flex: 1, paddingBottom: 32 },
  inputRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '14px 16px',
    color: 'var(--white)',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  fetchBtn: {
    background: 'var(--blue)',
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
    transition: 'opacity 0.2s',
  },
  fetchBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: {
    color: '#F87171',
    fontSize: '0.85rem',
    marginBottom: 12,
    padding: '10px 14px',
    background: 'rgba(248,113,113,0.08)',
    borderRadius: 8,
    border: '1px solid rgba(248,113,113,0.2)',
  },
  resultCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
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
    border: '1px solid var(--border)',
  },
  videoInfo: { flex: 1, minWidth: 0 },
  authorName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: '1rem',
    marginBottom: 2,
  },
  authorId: {
    color: 'var(--blue)',
    fontSize: '0.82rem',
    marginBottom: 10,
  },
  stats: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '4px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 48,
  },
  statValue: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '0.85rem',
    color: 'var(--yellow)',
  },
  statLabel: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  copyAllBtn: {
    background: 'var(--blue)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    width: '100%',
    transition: 'background 0.2s',
  },
  copyAllBtnSuccess: { background: '#16A34A' },
  block: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
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
    color: 'var(--muted)',
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '4px 10px',
    color: 'var(--white)',
    fontSize: '0.75rem',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  copyBtnSuccess: {
    background: 'rgba(34,197,94,0.15)',
    borderColor: 'var(--success)',
    color: 'var(--success)',
  },
  blockContent: {
    fontSize: '0.88rem',
    lineHeight: 1.6,
    color: 'var(--white)',
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
    color: 'var(--muted)',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    maxWidth: 320,
    margin: '0 auto',
  },
  footer: {
    textAlign: 'center',
    padding: '20px 0',
    fontSize: '0.75rem',
    color: 'var(--muted)',
    borderTop: '1px solid var(--border)',
  },
}
