"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

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
  const [tab, setTab] = useState<"dashboard" | "empresas" | "usuarios" | "chat">("dashboard")
  const [stats, setStats] = useState<Stats | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [busca, setBusca] = useState("")

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

  const TABS = [
    { key: "dashboard", label: "Visão Geral" },
    { key: "empresas", label: "Empresas" },
    { key: "usuarios", label: "Usuários" },
    { key: "chat", label: "Analista IA" },
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
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: tab === t.key ? "#fff" : "transparent",
                color: tab === t.key ? "#006635" : "#6b7280",
                boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: DASHBOARD ─────────────────────────────── */}
        {tab === "dashboard" && stats && (
          <div className="space-y-6">

            {/* Row 1: KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Usuários cadastrados", value: stats.totalUsuarios, icon: "👤", bg: "linear-gradient(135deg,#f0f9f4,#e6f4ed)" },
                { label: "Empresas cadastradas", value: stats.totalEmpresas, icon: "🏢", bg: "linear-gradient(135deg,#f0f9f4,#e6f4ed)" },
                { label: "Total de respondentes", value: stats.totalRespostas, icon: "📋", bg: "linear-gradient(135deg,#fff7ed,#fef3e2)" },
                { label: "Relatórios gerados", value: stats.totalRelatorios, icon: "📊", bg: "linear-gradient(135deg,#f0f9f4,#e6f4ed)" },
              ].map(k => (
                <div key={k.label} className="rounded-xl border px-4 py-5 text-center"
                  style={{ background: k.bg, borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div className="text-2xl mb-1">{k.icon}</div>
                  <div className="text-3xl font-black mb-1" style={{ color: "#006635" }}>{k.value}</div>
                  <div className="text-xs" style={{ color: "#6b7280" }}>{k.label}</div>
                </div>
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
                    <div className="text-3xl mb-2">📊</div>
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
                    <div className="text-3xl mb-2">🏆</div>
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

            {/* Row 5: Tendência Mensal */}
            {stats.tendenciaMensal.length > 0 && (
              <div className="rounded-xl border bg-white px-6 py-5"
                style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <SectionHeading>Tendência Mensal</SectionHeading>
                <p className="text-xs mb-4" style={{ color: "#9f9f9f" }}>
                  Relatórios gerados e média geral por mês nos últimos 6 meses
                </p>
                <div className="flex items-end gap-3 h-32">
                  {stats.tendenciaMensal.map((m, i) => {
                    const barHeight = maxTendencia > 0 ? (m.count / maxTendencia) * 100 : 0
                    const cor = m.avgMediaGeral !== null
                      ? m.avgMediaGeral >= 3.7 ? "#DC2626" : m.avgMediaGeral >= 2.3 ? "#D97706" : "#059669"
                      : "#e8e8e8"
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-xs font-bold" style={{ color: cor, fontSize: "0.65rem" }}>
                          {m.avgMediaGeral !== null ? m.avgMediaGeral.toFixed(1) : ""}
                        </div>
                        <div className="w-full flex items-end" style={{ height: "80px" }}>
                          <div className="w-full rounded-t-md transition-all"
                            style={{
                              height: m.count > 0 ? `${Math.max(barHeight, 8)}%` : "4px",
                              background: m.count > 0 ? cor : "#e8e8e8",
                            }} />
                        </div>
                        <div className="text-xs text-center" style={{ color: "#6b7280", fontSize: "0.65rem" }}>
                          {fmtMes(m.mes)}
                        </div>
                        <div className="text-xs font-semibold" style={{ color: "#1a1a1a", fontSize: "0.7rem" }}>
                          {m.count > 0 ? `${m.count}` : "—"}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 text-xs" style={{ color: "#9f9f9f" }}>
                  Barras: volume de relatórios · Número acima: média geral do mês · Cor: classificação predominante
                </div>
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
                          {e.ultimoRelatorio && (
                            <button
                              onClick={() => router.push(`/relatorio/${e.ultimoRelatorio!.id}`)}
                              className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap transition-colors"
                              style={{ background: "#f0f7f3", color: "#006635" }}>
                              Ver relatório
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {empresasFiltradas.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <div className="text-3xl mb-2">🔍</div>
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
                <div className="text-3xl mb-2">👤</div>
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
          <div className="flex flex-col" style={{ height: "calc(100vh - 220px)", minHeight: 500 }}>

            {/* Sugestões */}
            {chatMessages.length === 0 && (
              <div className="mb-4">
                <div className="rounded-xl border bg-white px-6 py-5 mb-4"
                  style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: "#006635" }} />
                    <h3 className="font-black text-base" style={{ color: "#1a1a1a" }}>Analista IA</h3>
                  </div>
                  <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
                    Faça perguntas sobre os dados da plataforma. O analista tem acesso a todos os dados das empresas, médias, classificações e tendências.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {SUGESTOES.map((s, i) => (
                    <button key={i} onClick={() => sendChat(s)}
                      className="text-left text-sm rounded-xl border px-4 py-3 font-medium transition-all hover:shadow-md"
                      style={{
                        borderColor: "#006635",
                        color: "#006635",
                        background: "#f0f9f4",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat area */}
            <div className="flex-1 rounded-xl border bg-white overflow-y-auto px-4 py-4 space-y-4"
              style={{ borderColor: "#e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>

              {chatMessages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center" style={{ color: "#9f9f9f" }}>
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-sm">Selecione uma sugestão ou escreva sua pergunta abaixo</p>
                  </div>
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mr-2 flex-shrink-0 mt-0.5"
                      style={{ background: "#006635", color: "#fff" }}>
                      IA
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    <div
                      className="px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
                      style={msg.role === "user" ? {
                        background: "#006635",
                        color: "#fff",
                        borderBottomRightRadius: 4,
                      } : {
                        background: "#fff",
                        color: "#1a1a1a",
                        border: "1px solid #e8e8e8",
                        borderLeft: "3px solid #006635",
                        borderBottomLeftRadius: 4,
                      }}>
                      {msg.content || (msg.role === "assistant" && i === chatMessages.length - 1 && chatLoading ? null : msg.content)}
                    </div>
                  </div>
                </div>
              ))}

              {chatLoading && chatMessages[chatMessages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mr-2 flex-shrink-0 mt-0.5"
                    style={{ background: "#006635", color: "#fff" }}>
                    IA
                  </div>
                  <div className="rounded-2xl border" style={{ borderColor: "#e8e8e8", borderLeft: "3px solid #006635" }}>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div className="mt-3 flex gap-2">
              <input
                ref={chatInputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput) } }}
                placeholder="Faça uma pergunta sobre os dados da plataforma..."
                disabled={chatLoading}
                className="flex-1 border rounded-xl px-4 py-3 text-sm"
                style={{
                  borderColor: "#e8e8e8",
                  outline: "none",
                  background: chatLoading ? "#f9fafb" : "#fff",
                }}
              />
              <button
                onClick={() => sendChat(chatInput)}
                disabled={chatLoading || !chatInput.trim()}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: chatLoading || !chatInput.trim() ? "#e8e8e8" : "#006635",
                  color: chatLoading || !chatInput.trim() ? "#9f9f9f" : "#fff",
                  cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                }}>
                {chatLoading ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: "#9f9f9f", borderTopColor: "transparent" }} />
                ) : "Enviar"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
