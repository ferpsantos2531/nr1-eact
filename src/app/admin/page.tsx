"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import GeoTab from "@/components/GeoTab"

/* ─── Types ──────────────────────────────────────────────── */
type Stats = {
  totalUsuarios: number
  totalEmpresas: number
  totalRespostas: number
  totalRelatorios: number
  empresasComRelatorio: number
  empresasSemResposta: number
  mediaPlataforma: number | null
  distribuicao: { grave: number; critico: number; satisfatorio: number }
  mediasPorDimensao: { organizacao: number | null; condicoes: number | null; relacoes: number | null }
  ultimosRelatorios: Array<{ empresa: string; media: number; categoria: string; data: string }>
  topRisco: Array<{ nome: string; media: number; categoria: string }>
  topSaudaveis: Array<{ nome: string; media: number; categoria: string }>
  questoesCriticas: Array<{ questao: string; media: number | null; dimensao: string }>
  tendenciaMensal: Array<{ mes: string; count: number; avgMediaGeral: number | null }>
}

type Usuario = {
  id: string; email: string; isAdmin: boolean; createdAt: string
  totalEmpresas: number; totalRespostas: number
  empresas: Array<{ id: string; nome: string; totalRespostas: number; ultimoRelatorio: { mediaGeral: number; categoria: string } | null }>
}

type Empresa = {
  id: string; nome: string; cnpj: string | null; tamanho: string | null
  usuarioEmail: string; createdAt: string; totalRespostas: number
  ultimoRelatorio: { id: string; mediaGeral: number; categoria: string; createdAt: string } | null
}

type ChatMessage = { role: "user" | "assistant"; content: string }

/* ─── Icons ──────────────────────────────────────────────── */
const IconUsers = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
)
const IconBuilding = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M9 3h6a2 2 0 012 2v16H7V5a2 2 0 012-2zM9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1"/>
  </svg>
)
const IconClipboard = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
  </svg>
)
const IconChart = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
  </svg>
)
const IconChevron = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
  </svg>
)

/* ─── Helpers ────────────────────────────────────────────── */
const COR: Record<string, string> = { grave: "#DC2626", critico: "#D97706", satisfatorio: "#059669" }
const LABEL: Record<string, string> = { grave: "Grave", critico: "Crítico", satisfatorio: "Satisfatório" }
const BADGE_BG: Record<string, string> = { grave: "#FEF2F2", critico: "#FFFBEB", satisfatorio: "#ECFDF5" }

function Badge({ cat }: { cat: string }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: BADGE_BG[cat], color: COR[cat] }}>
      {LABEL[cat]}
    </span>
  )
}

function ScoreBar({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value === null) return <span className="text-xs" style={{ color: "#9f9f9f" }}>—</span>
  const pct = (value / max) * 100
  const cor = value >= 3.7 ? "#DC2626" : value >= 2.3 ? "#D97706" : "#059669"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#f1f1f1" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color: cor }}>{value.toFixed(2)}</span>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: "#006635" }} />
      <h3 className="font-black text-base" style={{ color: "#1a1a1a" }}>{children}</h3>
    </div>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

function fmtMes(ym: string) {
  const [y, m] = ym.split("-")
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  return `${meses[parseInt(m) - 1]}/${y.slice(2)}`
}

/* ─── Chat helpers ───────────────────────────────────────── */
function parseInsight(content: string): { body: string; insight: string | null } {
  const lines = content.split("\n")
  const idx = lines.findIndex(l => l.includes("💡"))
  if (idx === -1) return { body: content, insight: null }
  const insightLine = lines[idx].replace(/💡\s*\*?\*?Próximo insight:?\*?\*?\s*/i, "").trim()
  const body = lines.slice(0, idx).join("\n").trimEnd()
  return { body, insight: insightLine || null }
}

function renderFormatted(text: string) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} className="space-y-1 my-2 ml-2">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#006635" }} />
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  lines.forEach((line, i) => {
    if (/^[-•]\s/.test(line)) {
      listItems.push(line.replace(/^[-•]\s/, ""))
    } else {
      flushList(String(i))
      if (!line.trim()) {
        if (elements.length > 0) elements.push(<div key={`sp-${i}`} className="h-1" />)
      } else if (/^#{1,3}\s/.test(line)) {
        const txt = line.replace(/^#{1,3}\s/, "")
        elements.push(
          <p key={i} className="font-bold text-sm mb-1" style={{ color: "#1a1a1a" }}
            dangerouslySetInnerHTML={{ __html: txt.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        )
      } else {
        elements.push(
          <p key={i} className="text-sm leading-relaxed" style={{ color: "#374151" }}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
        )
      }
    }
  })
  flushList("end")
  return <div className="space-y-0.5">{elements}</div>
}

/* ─── Typing Indicator ───────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-2 h-2 rounded-full"
          style={{
            background: "#006635",
            animation: `bounce 1s infinite`,
            animationDelay: `${i * 0.15}s`,
          }} />
      ))}
      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"dashboard" | "empresas" | "usuarios" | "chat" | "geografico">("dashboard")
  const [stats, setStats] = useState<Stats | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [busca, setBusca] = useState("")
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; nome: string; respostas: number } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)

  const SUGESTOES = [
    "Quais empresas precisam de atenção imediata?",
    "Faça um resumo executivo da plataforma",
    "Análise por dimensão de trabalho",
    "Tendência e evolução da plataforma",
  ]

  useEffect(() => {
    async function load() {
      try {
        const [sRes, uRes, eRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/usuarios"),
          fetch("/api/admin/empresas"),
        ])
        if (sRes.status === 401) { router.push("/login"); return }
        if (sRes.status === 403) { setErro("Acesso restrito a administradores."); return }
        const [s, u, e] = await Promise.all([sRes.json(), uRes.json(), eRes.json()])
        setStats(s)
        setUsuarios(u.usuarios ?? [])
        setEmpresas(e.empresas ?? [])
      } catch {
        setErro("Erro ao carregar dados.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, chatLoading])

  async function sendChat(texto: string) {
    if (!texto.trim() || chatLoading) return
    const userMsg: ChatMessage = { role: "user", content: texto.trim() }
    const newHistory = [...chatMessages, userMsg]
    setChatMessages(newHistory)
    setChatInput("")
    setChatLoading(true)

    // Add empty assistant message to stream into
    const aiIdx = newHistory.length
    setChatMessages(prev => [...prev, { role: "assistant", content: "" }])

    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensagem: texto.trim(),
          historico: chatMessages, // history before this message
        }),
      })

      if (!res.ok) throw new Error("Erro na requisição")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const snap = accumulated
        setChatMessages(prev => {
          const updated = [...prev]
          updated[aiIdx] = { role: "assistant", content: snap }
          return updated
        })
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev]
        updated[aiIdx] = { role: "assistant", content: "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente." }
        return updated
      })
    } finally {
      setChatLoading(false)
    }
  }

  async function excluirEmpresa() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/empresa/${confirmDelete.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { alert(data.error || "Erro ao excluir"); return }
      setEmpresas(prev => prev.filter(e => e.id !== confirmDelete.id))
      setDeleteResult(
        `"${data.empresa}" excluída com sucesso. ` +
        `${data.respostasExcluidas} resposta(s), ${data.relatoriosExcluidos} relatório(s) removidos.` +
        (data.usuarioExcluido ? " Usuário sem outras empresas também foi excluído." : "")
      )
      setConfirmDelete(null)
      setTimeout(() => setDeleteResult(null), 6000)
    } catch { alert("Erro de conexão") }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg font-black mb-2">Acesso Negado</p>
        <p className="mb-4" style={{ color: "#505050" }}>{erro}</p>
        <button onClick={() => router.push("/dashboard")} className="btn-green px-6 py-2">
          Voltar ao início
        </button>
      </div>
    </div>
  )

  const total = (stats?.distribuicao.grave ?? 0) + (stats?.distribuicao.critico ?? 0) + (stats?.distribuicao.satisfatorio ?? 0)
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0

  const empresasFiltradas = empresas.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase()) ||
    e.usuarioEmail.toLowerCase().includes(busca.toLowerCase())
  )
  const usuariosFiltrados = usuarios.filter(u =>
    u.email.toLowerCase().includes(busca.toLowerCase())
  )

  const top8Questoes = stats?.questoesCriticas.filter(q => q.media !== null).slice(0, 8) ?? []
  const maxQuestaoMedia = top8Questoes.reduce((max, q) => Math.max(max, q.media ?? 0), 0) || 5

  const maxTendencia = stats?.tendenciaMensal.reduce((max, m) => Math.max(max, m.count), 1) ?? 1

  /* Gráfico de evolução SVG */
  function TendenciaLineChart({ data }: { data: Stats["tendenciaMensal"] }) {
    const W = 560, H = 190
    const PAD = { top: 32, bottom: 46, left: 36, right: 16 }
    const cW = W - PAD.left - PAD.right
    const cH = H - PAD.top - PAD.bottom
    const MIN_V = 1, MAX_V = 5

    function yp(v: number) {
      return PAD.top + (1 - (v - MIN_V) / (MAX_V - MIN_V)) * cH
    }
    function xp(i: number) {
      return PAD.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
    }

    const y37 = yp(3.7), y23 = yp(2.3)

    const pts = data.map((d, i) => ({
      x: xp(i), y: d.avgMediaGeral !== null && d.count > 0 ? yp(d.avgMediaGeral) : null,
      val: d.avgMediaGeral !== null && d.count > 0 ? d.avgMediaGeral : null,
      mes: d.mes, count: d.count,
    }))
    const validPts = pts.filter(p => p.y !== null)

    const linePath = validPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
    const areaPath = validPts.length > 1
      ? `${linePath} L${validPts[validPts.length - 1].x},${PAD.top + cH} L${validPts[0].x},${PAD.top + cH}Z`
      : ""

    const firstVal = validPts[0]?.val ?? null
    const lastVal = validPts[validPts.length - 1]?.val ?? null
    const trendDelta = firstVal !== null && lastVal !== null && validPts.length > 1 ? lastVal - firstVal : null

    function dotColor(v: number) {
      return v >= 3.7 ? "#dc2626" : v >= 2.3 ? "#d97706" : "#059669"
    }

    return (
      <div>
        {/* Trend badge */}
        {trendDelta !== null && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
              style={{
                background: trendDelta < -0.05 ? "#dcfce7" : trendDelta > 0.05 ? "#fee2e2" : "#f1f5f9",
                color: trendDelta < -0.05 ? "#15803d" : trendDelta > 0.05 ? "#dc2626" : "#64748b",
              }}>
              {trendDelta < -0.05 ? "↘ Melhora" : trendDelta > 0.05 ? "↗ Piora" : "→ Estável"}
              <span className="font-black ml-1">
                {trendDelta < -0.05 || trendDelta > 0.05
                  ? `${Math.abs(trendDelta).toFixed(2)} pts`
                  : "sem variação significativa"}
              </span>
              <span className="font-normal" style={{ color: "inherit", opacity: 0.7 }}>
                {" "}no período
              </span>
            </span>
            <span className="text-xs" style={{ color: "#9f9f9f" }}>
              {fmtMes(data[0].mes)} → {fmtMes(data[data.length - 1].mes)}
            </span>
          </div>
        )}

        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {/* Background zones */}
          <rect x={PAD.left} y={PAD.top} width={cW} height={y37 - PAD.top} fill="#fef2f2" opacity={0.6} />
          <rect x={PAD.left} y={y37} width={cW} height={y23 - y37} fill="#fffbeb" opacity={0.6} />
          <rect x={PAD.left} y={y23} width={cW} height={PAD.top + cH - y23} fill="#f0fdf4" opacity={0.6} />

          {/* Zone border lines */}
          <line x1={PAD.left} y1={y37} x2={PAD.left + cW} y2={y37} stroke="#dc2626" strokeWidth={1} strokeDasharray="5,3" opacity={0.35} />
          <line x1={PAD.left} y1={y23} x2={PAD.left + cW} y2={y23} stroke="#059669" strokeWidth={1} strokeDasharray="5,3" opacity={0.35} />

          {/* Zone labels on right */}
          <text x={PAD.left + cW - 2} y={PAD.top + 10} textAnchor="end" fontSize={9} fill="#dc2626" opacity={0.75} fontWeight="600">Grave ≥3,7</text>
          <text x={PAD.left + cW - 2} y={(y37 + y23) / 2 + 3} textAnchor="end" fontSize={9} fill="#d97706" opacity={0.75} fontWeight="600">Crítico</text>
          <text x={PAD.left + cW - 2} y={PAD.top + cH - 4} textAnchor="end" fontSize={9} fill="#059669" opacity={0.75} fontWeight="600">Satisfatório &lt;2,3</text>

          {/* Y axis ticks */}
          {[1, 2, 2.3, 3, 3.7, 4, 5].map(v => (
            <g key={v}>
              <line x1={PAD.left - 3} y1={yp(v)} x2={PAD.left} y2={yp(v)} stroke="#c8c8c8" strokeWidth={1} />
              {[1, 2.3, 3.7, 5].includes(v) && (
                <text x={PAD.left - 5} y={yp(v) + 3} textAnchor="end" fontSize={8} fill="#9f9f9f">
                  {v.toFixed(1).replace(".", ",")}
                </text>
              )}
            </g>
          ))}

          {/* Y axis line */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH} stroke="#e8e8e8" strokeWidth={1} />

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="#3b82f6" opacity={0.07} />}

          {/* Line */}
          {linePath && validPts.length > 1 && (
            <path d={linePath} fill="none" stroke="#1d4ed8" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Delta arrows between consecutive valid points */}
          {validPts.map((p, i) => {
            if (i === 0) return null
            const prev = validPts[i - 1]
            if (prev.val === null || p.val === null) return null
            const delta = p.val - prev.val
            const midX = (p.x + prev.x) / 2
            const midY = Math.min(p.y!, prev.y!) - 14
            const deltaCol = delta < -0.05 ? "#15803d" : delta > 0.05 ? "#dc2626" : "#94a3b8"
            const arrow = delta < -0.05 ? "↘" : delta > 0.05 ? "↗" : "→"
            return (
              <g key={i}>
                <rect x={midX - 14} y={midY - 9} width={28} height={13} rx={4}
                  fill={delta < -0.05 ? "#dcfce7" : delta > 0.05 ? "#fee2e2" : "#f1f5f9"} />
                <text x={midX} y={midY} textAnchor="middle" fontSize={9} fill={deltaCol} fontWeight="bold">
                  {arrow} {Math.abs(delta).toFixed(1)}
                </text>
              </g>
            )
          })}

          {/* Data points */}
          {pts.map((p, i) => (
            <g key={i}>
              {/* Vertical grid */}
              <line x1={p.x} y1={PAD.top} x2={p.x} y2={PAD.top + cH}
                stroke="#e8e8e8" strokeWidth={1} strokeDasharray="2,4" opacity={0.6} />

              {/* Month label */}
              <text x={p.x} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight="500">
                {fmtMes(p.mes)}
              </text>
              {/* Report count */}
              <text x={p.x} y={H - PAD.bottom + 27} textAnchor="middle" fontSize={9} fill="#c8c8c8">
                {p.count > 0 ? `${p.count} rel.` : "sem dados"}
              </text>

              {p.y !== null && p.val !== null && (
                <>
                  {/* Outer ring */}
                  <circle cx={p.x} cy={p.y} r={9} fill={dotColor(p.val)} opacity={0.15} />
                  {/* Dot */}
                  <circle cx={p.x} cy={p.y} r={6} fill="white" stroke={dotColor(p.val)} strokeWidth={2.5} />
                  {/* Value label */}
                  <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize={11} fill={dotColor(p.val)} fontWeight="bold">
                    {p.val.toFixed(2).replace(".", ",")}
                  </text>
                </>
              )}

              {p.y === null && (
                <text x={p.x} y={PAD.top + cH / 2} textAnchor="middle" fontSize={9} fill="#c8c8c8">—</text>
              )}
            </g>
          ))}
        </svg>

        <div className="flex gap-4 mt-1 text-xs" style={{ color: "#9f9f9f" }}>
          <span>↘ = melhora (valor menor)</span>
          <span>↗ = piora (valor maior)</span>
          <span>· Números acima dos pontos = média do mês</span>
        </div>
      </div>
    )
  }

  const TABS = [
    { key: "dashboard", label: "Visão Geral", icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
    )},
    { key: "empresas", label: "Empresas", icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M9 3h6a2 2 0 012 2v16H7V5a2 2 0 012-2zM9 12h1m4 0h1"/></svg>
    )},
    { key: "usuarios", label: "Usuários", icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
    )},
    { key: "chat", label: "Analista IA", badge: true, icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
    )},
    { key: "geografico", label: "Geográfico", icon: (
      <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
    )},
  ] as const

  return (
    <div className="min-h-screen" style={{ background: "#f9fafb" }}>

      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/abrasel-logo.svg" alt="Abrasel" width={100} height={20}
              style={{ filter: "brightness(0) invert(1)" }} />
            <div className="h-5 w-px" style={{ background: "rgba(255,255,255,0.3)" }} />
            <div>
              <div className="text-white text-sm font-semibold leading-tight">Painel Administrativo · Abrasel</div>
              {stats && (
                <div className="text-xs leading-tight" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {stats.totalEmpresas} empresas · {stats.totalRespostas} respondentes
                </div>
              )}
            </div>
          </div>
          <button onClick={() => router.push("/dashboard")}
            className="text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            ← Sair do Admin
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ background: "#e8e8e8" }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setBusca("") }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t.key ? "#fff" : "transparent",
                color: tab === t.key ? "#006635" : "#6b7280",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.10)" : "none",
              }}>
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
              {"badge" in t && t.badge && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{ background: "#f48131", color: "#fff", fontSize: "0.6rem" }}>
                  BETA
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB: DASHBOARD ─────────────────────────────── */}
        {tab === "dashboard" && stats && (
          <div className="space-y-6">

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {([
                { label: "Usuários cadastrados", value: stats.totalUsuarios, Icon: IconUsers, accentColor: "#006635", accentBg: "#e8f5ee", toTab: "usuarios" },
                { label: "Empresas cadastradas", value: stats.totalEmpresas, Icon: IconBuilding, accentColor: "#2563eb", accentBg: "#eff6ff", toTab: "empresas" },
                { label: "Total de respondentes", value: stats.totalRespostas, Icon: IconClipboard, accentColor: "#d97706", accentBg: "#fffbeb", toTab: "empresas" },
                { label: "Relatórios gerados", value: stats.totalRelatorios, Icon: IconChart, accentColor: "#7c3aed", accentBg: "#f5f3ff", toTab: "empresas" },
              ] as const).map(k => (
                <button key={k.label} onClick={() => setTab(k.toTab)}
                  className="rounded-xl border bg-white px-5 py-5 text-left transition-all hover:shadow-md group"
                  style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", borderTop: `3px solid ${k.accentColor}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: k.accentBg, color: k.accentColor }}>
                      <k.Icon />
                    </div>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: k.accentColor }}>
                      <IconChevron />
                    </span>
                  </div>
                  <div className="text-3xl font-black mb-0.5" style={{ color: "#1a1a1a" }}>{k.value}</div>
                  <div className="text-xs font-medium" style={{ color: "#6b7280" }}>{k.label}</div>
                </button>
              ))}
            </div>

            {/* Row 2: Média geral + Distribuição */}
            <div className="grid sm:grid-cols-2 gap-6">

              {/* Média e dimensões */}
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Média Geral da Plataforma</SectionHeading>
                <p className="text-xs mb-4" style={{ color: "#9f9f9f" }}>
                  Baseado nos últimos relatórios de cada empresa
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-5xl font-black"
                    style={{ color: stats.mediaPlataforma === null ? "#9f9f9f" : stats.mediaPlataforma >= 3.7 ? "#DC2626" : stats.mediaPlataforma >= 2.3 ? "#D97706" : "#059669" }}>
                    {stats.mediaPlataforma?.toFixed(2) ?? "—"}
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "#9f9f9f" }}>Escala 1 a 5</div>
                    <div className="text-xs mt-0.5" style={{ color: "#9f9f9f" }}>
                      {stats.empresasComRelatorio} empresa{stats.empresasComRelatorio !== 1 ? "s" : ""} avaliada{stats.empresasComRelatorio !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Organização do Trabalho", val: stats.mediasPorDimensao.organizacao },
                    { label: "Condições de Trabalho", val: stats.mediasPorDimensao.condicoes },
                    { label: "Relações Socioprofissionais", val: stats.mediasPorDimensao.relacoes },
                  ].map(d => (
                    <div key={d.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: "#505050" }}>{d.label}</span>
                      </div>
                      <ScoreBar value={d.val} />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t text-xs" style={{ borderColor: "#f1f1f1", color: "#9f9f9f" }}>
                  ≥ 3,7 Grave · 2,3 – 3,69 Crítico · &lt; 2,3 Satisfatório
                </div>
              </div>

              {/* Distribuição */}
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Distribuição por Classificação</SectionHeading>
                <p className="text-xs mb-4" style={{ color: "#9f9f9f" }}>
                  {stats.empresasComRelatorio} empresa{stats.empresasComRelatorio !== 1 ? "s" : ""} com relatório gerado
                </p>
                <div className="space-y-4">
                  {([
                    { key: "satisfatorio", label: "Satisfatório" },
                    { key: "critico", label: "Crítico" },
                    { key: "grave", label: "Grave" },
                  ] as const).map(({ key, label }) => {
                    const n = stats.distribuicao[key]
                    const p = pct(n)
                    return (
                      <div key={key}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-semibold" style={{ color: COR[key] }}>{label}</span>
                          <span className="text-sm font-black" style={{ color: COR[key] }}>{n} empresa{n !== 1 ? "s" : ""} · {p}%</span>
                        </div>
                        <div className="h-3 rounded-full" style={{ background: "#f1f1f1" }}>
                          <div className="h-3 rounded-full transition-all"
                            style={{ width: `${p}%`, background: COR[key] }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 pt-4 border-t grid grid-cols-2 gap-3" style={{ borderColor: "#f1f1f1" }}>
                  <div className="text-center p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                    <div className="text-lg font-black" style={{ color: "#006635" }}>{stats.empresasComRelatorio}</div>
                    <div className="text-xs" style={{ color: "#9f9f9f" }}>Com relatório</div>
                  </div>
                  <div className="text-center p-3 rounded-xl" style={{ background: "#f9fafb" }}>
                    <div className="text-lg font-black" style={{ color: "#9f9f9f" }}>{stats.empresasSemResposta}</div>
                    <div className="text-xs" style={{ color: "#9f9f9f" }}>Sem respostas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Top Risco + Top Saudáveis */}
            <div className="grid sm:grid-cols-2 gap-6">

              {/* Empresas em Maior Risco */}
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Empresas em Maior Risco</SectionHeading>
                {stats.topRisco.length === 0 ? (
                  <div className="py-8 text-center">
                    <svg className="w-8 h-8 mx-auto mb-2" style={{ color: "#d1d5db" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    <p className="text-sm" style={{ color: "#9f9f9f" }}>Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topRisco.map((empresa, i) => (
                      <div key={i} className="flex items-center gap-3 py-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ background: "#FEF2F2", color: "#DC2626" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>{empresa.nome}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-black" style={{ color: COR[empresa.categoria] }}>
                            {empresa.media.toFixed(2)}
                          </span>
                          <Badge cat={empresa.categoria} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Melhores Resultados */}
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Melhores Resultados</SectionHeading>
                {stats.topSaudaveis.length === 0 ? (
                  <div className="py-8 text-center">
                    <svg className="w-8 h-8 mx-auto mb-2" style={{ color: "#d1d5db" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                    <p className="text-sm" style={{ color: "#9f9f9f" }}>Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topSaudaveis.map((empresa, i) => (
                      <div key={i} className="flex items-center gap-3 py-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                          style={{ background: "#ECFDF5", color: "#059669" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>{empresa.nome}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-black" style={{ color: COR[empresa.categoria] }}>
                            {empresa.media.toFixed(2)}
                          </span>
                          <Badge cat={empresa.categoria} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 4: Questões Mais Críticas — horizontal bar chart */}
            {top8Questoes.length > 0 && (
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Questões Mais Críticas</SectionHeading>
                <p className="text-xs mb-4" style={{ color: "#9f9f9f" }}>
                  Top 8 questões com maior média entre todos os respondentes (maior = ocorre com mais frequência)
                </p>
                <div className="space-y-3">
                  {top8Questoes.map((q, i) => {
                    const med = q.media ?? 0
                    const cor = med >= 3.7 ? "#DC2626" : med >= 2.3 ? "#D97706" : "#059669"
                    const bg = med >= 3.7 ? "#FEF2F2" : med >= 2.3 ? "#FFFBEB" : "#ECFDF5"
                    const widthPct = (med / maxQuestaoMedia) * 100
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs leading-tight flex-1" style={{ color: "#505050" }}>
                            {q.questao}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-black" style={{ color: cor }}>{med.toFixed(2)}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: bg, color: cor, fontSize: "0.65rem" }}>
                              {q.dimensao.split(" ")[0]}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: "#f1f1f1" }}>
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${widthPct}%`, background: cor }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Row 5: Evolução da Média Geral */}
            {stats.tendenciaMensal.length > 0 && (
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Evolução da Média Geral</SectionHeading>
                <p className="text-xs mb-4" style={{ color: "#9f9f9f" }}>
                  Média de risco psicossocial da plataforma nos últimos 6 meses — valor menor indica melhora
                </p>
                <TendenciaLineChart data={stats.tendenciaMensal} />
              </div>
            )}

            {/* Últimas avaliações */}
            {stats.ultimosRelatorios.length > 0 && (
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Últimas Avaliações Geradas</SectionHeading>
                <div className="divide-y" style={{ borderColor: "#f1f1f1" }}>
                  {stats.ultimosRelatorios.map((r, i) => (
                    <div key={i} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#1a1a1a" }}>{r.empresa}</p>
                        <p className="text-xs" style={{ color: "#9f9f9f" }}>{fmt(r.data)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black" style={{ color: COR[r.categoria] }}>
                          {r.media.toFixed(2)}
                        </span>
                        <Badge cat={r.categoria} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: EMPRESAS ──────────────────────────────── */}
        {tab === "empresas" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="font-black text-lg" style={{ color: "#1a1a1a" }}>
                Todas as Empresas <span className="text-base font-normal" style={{ color: "#9f9f9f" }}>({empresas.length})</span>
              </h2>
              <input
                value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar empresa ou email..."
                className="border rounded-lg px-3 py-2 text-sm w-64"
                style={{ borderColor: "#e8e8e8", outline: "none" }}
              />
            </div>

            <div className="rounded-xl border bg-white overflow-hidden"
              style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #f1f1f1" }}>
                      {["Empresa", "Responsável", "Porte", "Respondentes", "Média", "Classificação", "Data", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap"
                          style={{ color: "#6b7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empresasFiltradas.map((e, i) => (
                      <tr key={e.id}
                        style={{
                          background: i % 2 === 0 ? "#fff" : "#fafafa",
                          borderBottom: i < empresasFiltradas.length - 1 ? "1px solid #f1f1f1" : "none",
                        }}
                        className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 font-semibold" style={{ color: "#1a1a1a", maxWidth: 180 }}>
                          <span className="block truncate">{e.nome}</span>
                        </td>
                        <td className="px-4 py-3" style={{ color: "#6b7280" }}>
                          <span className="text-xs">{e.usuarioEmail}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#6b7280" }}>
                          {e.tamanho ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold" style={{ color: "#1a1a1a" }}>
                          {e.totalRespostas}
                        </td>
                        <td className="px-4 py-3 font-black text-center"
                          style={{ color: e.ultimoRelatorio ? COR[e.ultimoRelatorio.categoria] : "#9f9f9f" }}>
                          {e.ultimoRelatorio?.mediaGeral.toFixed(2) ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          {e.ultimoRelatorio ? <Badge cat={e.ultimoRelatorio.categoria} /> : (
                            <span className="text-xs" style={{ color: "#9f9f9f" }}>Sem relatório</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#9f9f9f" }}>
                          {fmt(e.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {e.ultimoRelatorio && (
                              <button
                                onClick={() => router.push(`/relatorio/${e.ultimoRelatorio!.id}`)}
                                className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-colors"
                                style={{ background: "#f0f7f3", color: "#006635" }}>
                                Ver relatório
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDelete({ id: e.id, nome: e.nome, respostas: e.totalRespostas })}
                              className="p-1.5 rounded-lg transition-colors hover:bg-red-50"
                              title="Excluir empresa"
                              style={{ color: "#dc2626" }}>
                              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {empresasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <svg className="w-8 h-8 mx-auto mb-2" style={{ color: "#d1d5db" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                          <p className="text-sm" style={{ color: "#9f9f9f" }}>Nenhuma empresa encontrada.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: USUÁRIOS ──────────────────────────────── */}
        {tab === "usuarios" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="font-black text-lg" style={{ color: "#1a1a1a" }}>
                Todos os Usuários <span className="text-base font-normal" style={{ color: "#9f9f9f" }}>({usuarios.length})</span>
              </h2>
              <input
                value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por email..."
                className="border rounded-lg px-3 py-2 text-sm w-64"
                style={{ borderColor: "#e8e8e8", outline: "none" }}
              />
            </div>

            {usuariosFiltrados.length === 0 ? (
              <div className="rounded-xl border bg-white px-6 py-12 text-center"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <svg className="w-8 h-8 mx-auto mb-2" style={{ color: "#d1d5db" }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
                <p className="text-sm" style={{ color: "#9f9f9f" }}>Nenhum usuário encontrado.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {usuariosFiltrados.map((u, idx) => (
                  <div key={u.id} className="rounded-xl border bg-white px-5 py-4"
                    style={{
                      borderColor: "#e8e8e8",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    }}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{u.email}</span>
                          {u.isAdmin && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: "#eff6ff", color: "#2563eb" }}>Admin</span>
                          )}
                        </div>
                        <span className="text-xs" style={{ color: "#9f9f9f" }}>
                          Cadastrado em {fmt(u.createdAt)} · {u.totalEmpresas} empresa{u.totalEmpresas !== 1 ? "s" : ""} · {u.totalRespostas} respondente{u.totalRespostas !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {u.empresas.length > 0 && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: "#f1f1f1" }}>
                        <div className="space-y-2">
                          {u.empresas.map(e => (
                            <div key={e.id} className="flex items-center justify-between gap-4 py-1 rounded-lg px-2 hover:bg-gray-50 transition-colors">
                              <span className="text-sm" style={{ color: "#505050" }}>{e.nome}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs" style={{ color: "#9f9f9f" }}>
                                  {e.totalRespostas} resp.
                                </span>
                                {e.ultimoRelatorio ? (
                                  <>
                                    <span className="text-sm font-black"
                                      style={{ color: COR[e.ultimoRelatorio.categoria] }}>
                                      {e.ultimoRelatorio.mediaGeral.toFixed(2)}
                                    </span>
                                    <Badge cat={e.ultimoRelatorio.categoria} />
                                  </>
                                ) : (
                                  <span className="text-xs" style={{ color: "#9f9f9f" }}>Sem relatório</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ANALISTA IA ───────────────────────────── */}
        {tab === "chat" && (
          <div className="flex flex-col gap-3" style={{ height: "calc(100vh - 220px)", minHeight: 520 }}>

            {/* Header card */}
            <div className="rounded-xl border bg-white px-5 py-4 flex items-center justify-between"
              style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm"
                  style={{ background: "#e8f5ee", color: "#006635" }}>IA</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm" style={{ color: "#1a1a1a" }}>Analista IA</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "#f48131", color: "#fff", fontSize: "0.6rem" }}>BETA</span>
                  </div>
                  <p className="text-xs" style={{ color: "#9f9f9f" }}>Acesso completo aos dados · Responde em tempo real</p>
                </div>
              </div>
              {chatMessages.length > 0 && (
                <button onClick={() => setChatMessages([])}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: "#f9fafb", color: "#6b7280", border: "1px solid #e8e8e8" }}>
                  Nova conversa
                </button>
              )}
            </div>

            {/* Chat area */}
            <div className="flex-1 rounded-xl border bg-white overflow-y-auto px-4 py-5"
              style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

              {/* Empty state + suggestions */}
              {chatMessages.length === 0 && (
                <div className="h-full flex flex-col justify-center">
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 font-black text-xl"
                      style={{ background: "#e8f5ee", color: "#006635" }}>IA</div>
                    <p className="font-semibold mb-1" style={{ color: "#1a1a1a" }}>O que você quer saber?</p>
                    <p className="text-sm" style={{ color: "#9f9f9f" }}>Escolha uma sugestão ou escreva sua pergunta</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto w-full">
                    {SUGESTOES.map((s, i) => (
                      <button key={i} onClick={() => sendChat(s)}
                        className="text-left text-sm rounded-xl px-4 py-3 font-medium transition-all hover:shadow-sm flex items-center gap-3"
                        style={{ background: "#f9fafb", border: "1px solid #e8e8e8", color: "#374151" }}>
                        <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-black"
                          style={{ background: "#e8f5ee", color: "#006635" }}>{i + 1}</span>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="space-y-5">
                {chatMessages.map((msg, i) => {
                  const isLast = i === chatMessages.length - 1
                  const isStreaming = isLast && chatLoading

                  if (msg.role === "user") {
                    return (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-medium"
                          style={{ background: "#006635", color: "#fff", borderBottomRightRadius: 6 }}>
                          {msg.content}
                        </div>
                      </div>
                    )
                  }

                  const { body, insight } = parseInsight(msg.content)
                  const showChips = !isStreaming && msg.content.length > 0

                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                        style={{ background: "#e8f5ee", color: "#006635" }}>IA</div>
                      <div className="flex-1 min-w-0">
                        {/* Main response card */}
                        <div className="rounded-2xl px-4 py-3.5"
                          style={{ background: "#f9fafb", border: "1px solid #eee", borderBottomLeftRadius: 6 }}>
                          {msg.content ? renderFormatted(body) : null}
                        </div>

                        {/* Insight chip + extra suggestions */}
                        {showChips && (
                          <div className="mt-3 space-y-2">
                            {insight && (
                              <div>
                                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: "#9f9f9f" }}>
                                  <span>💡</span> Próximo insight sugerido
                                </p>
                                <button onClick={() => sendChat(insight)}
                                  className="text-left text-sm rounded-xl px-4 py-2.5 font-medium w-full transition-all hover:shadow-sm flex items-center justify-between gap-3"
                                  style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#c2410c" }}>
                                  <span>{insight}</span>
                                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="flex-shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                                </button>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold mb-1.5" style={{ color: "#9f9f9f" }}>Outras perguntas</p>
                              <div className="flex flex-wrap gap-2">
                                {SUGESTOES.filter(s => !chatMessages.some(m => m.role === "user" && m.content === s)).slice(0, 3).map((s, j) => (
                                  <button key={j} onClick={() => sendChat(s)}
                                    className="text-xs px-3 py-1.5 rounded-full font-medium transition-all hover:shadow-sm"
                                    style={{ background: "#f9fafb", border: "1px solid #e8e8e8", color: "#374151" }}>
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {chatLoading && chatMessages[chatMessages.length - 1]?.content === "" && (
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                      style={{ background: "#e8f5ee", color: "#006635" }}>IA</div>
                    <div className="rounded-2xl px-4" style={{ background: "#f9fafb", border: "1px solid #eee" }}>
                      <TypingDots />
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input area */}
            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput) } }}
                placeholder="Faça uma pergunta sobre os dados da plataforma..."
                disabled={chatLoading}
                className="flex-1 border rounded-xl px-4 py-3 text-sm"
                style={{ borderColor: "#e8e8e8", outline: "none", background: chatLoading ? "#f9fafb" : "#fff" }}
              />
              <button
                onClick={() => sendChat(chatInput)}
                disabled={chatLoading || !chatInput.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                style={{
                  background: chatLoading || !chatInput.trim() ? "#e8e8e8" : "#006635",
                  color: chatLoading || !chatInput.trim() ? "#9f9f9f" : "#fff",
                  cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                }}>
                {chatLoading
                  ? <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#9f9f9f", borderTopColor: "transparent" }} />
                  : <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg><span className="hidden sm:inline">Enviar</span></>
                }
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Toast de resultado da exclusão */}
      {deleteResult && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium max-w-lg text-center"
          style={{ background: "#1a1a1a", color: "#fff" }}>
          ✓ {deleteResult}
        </div>
      )}

      {/* ── TAB: GEOGRÁFICO ─────────────────────────────── */}
      {tab === "geografico" && (
        <GeoTab />
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            {/* Ícone de aviso */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "#fef2f2" }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-center mb-1" style={{ color: "#1a1a1a" }}>
              Excluir empresa?
            </h2>
            <p className="text-center text-sm mb-4" style={{ color: "#6b7280" }}>
              Esta ação é <strong>irreversível</strong>.
            </p>

            {/* Detalhes do que será excluído */}
            <div className="rounded-xl p-4 mb-5 space-y-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
              <p className="text-sm font-bold" style={{ color: "#dc2626" }}>
                Será excluído permanentemente:
              </p>
              <div className="space-y-1 text-sm" style={{ color: "#7f1d1d" }}>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  Empresa: <strong>{confirmDelete.nome}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  {confirmDelete.respostas} resposta{confirmDelete.respostas !== 1 ? "s" : ""} de funcionários
                </div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  Todos os relatórios gerados
                </div>
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  Usuário responsável (se não tiver outras empresas)
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: "#f1f1f1", color: "#505050" }}>
                Cancelar
              </button>
              <button onClick={excluirEmpresa} disabled={deleting}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                style={{ background: "#dc2626", color: "#fff", opacity: deleting ? 0.7 : 1 }}>
                {deleting
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Excluindo...</>
                  : <><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Excluir definitivamente</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
