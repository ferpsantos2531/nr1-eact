"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"

type HistoricoItem = {
  id: string
  mediaGeral: number
  mediaDimensao1: number
  mediaDimensao2: number
  mediaDimensao3: number
  categoria: string
  totalRespostas: number
  createdAt: string
}

type Empresa = {
  id: string
  nome: string
  email: string
  cnpj: string | null
  setor: string | null
  tamanho: string | null
  surveyToken: string
  totalRespostas: number
  createdAt: string
  historico: HistoricoItem[]
}

const CAT_CONFIG: Record<string, { label: string; cor: string; bg: string; emoji: string }> = {
  grave:        { label: "Grave",        cor: "#dc2626", bg: "#fef2f2", emoji: "🔴" },
  critico:      { label: "Crítico",      cor: "#d97706", bg: "#fffbeb", emoji: "🟡" },
  satisfatorio: { label: "Satisfatório", cor: "#059669", bg: "#ecfdf5", emoji: "🟢" },
}

const DIM_NAMES = ["Org. do Trabalho", "Condições", "Relações"]

function MiniBar({ valor, max = 5 }: { valor: number; max?: number }) {
  const pct = (valor / max) * 100
  const color = valor >= 3.7 ? "#dc2626" : valor >= 2.3 ? "#d97706" : "#006635"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{valor.toFixed(1)}</span>
    </div>
  )
}

export default function EmpresaDashboard() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState("")
  const [copied, setCopied] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState("")

  useEffect(() => {
    Promise.all([
      fetch(`/api/empresa?id=${id}`).then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([data, me]) => {
      if (data.error) { setErro(data.error); return }
      setEmpresa(data)
      setSurveyUrl(`${window.location.origin}/pesquisa/${data.surveyToken}`)
      setIsAdmin(me.isAdmin === true)
    })
      .catch(() => setErro("Erro ao carregar dados"))
      .finally(() => setLoading(false))
  }, [id])

  async function gerarRelatorio() {
    setGerando(true); setErro("")
    try {
      const res = await fetch("/api/relatorio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: id }),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao gerar relatório"); return }
      router.push(`/relatorio/${data.relatorioId}`)
    } catch { setErro("Erro de conexão. Tente novamente.") }
    finally { setGerando(false) }
  }

  function copiarLink() {
    navigator.clipboard.writeText(surveyUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  if (erro && !empresa) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="mb-4" style={{ color: "#dc2626" }}>{erro}</p>
        <button onClick={() => router.push("/")} className="btn-green">Voltar ao início</button>
      </div>
    </div>
  )

  const podeGerar = (empresa?.totalRespostas ?? 0) >= 3
  const historico = empresa?.historico ?? []
  const ultimo = historico[0]
  const penultimo = historico[1]
  const evolucao = ultimo && penultimo ? ultimo.mediaGeral - penultimo.mediaGeral : null

  return (
    <main className="min-h-screen" style={{ background: "#f9fafb" }}>
      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Image src="/abrasel-logo.svg" alt="Abrasel" width={110} height={22}
            style={{ filter: "brightness(0) invert(1)" }} />
          <button onClick={() => router.push("/dashboard")} className="text-green-100 text-sm hover:text-white">
            ← Meus estabelecimentos
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Título */}
        <div className="mb-8">
          <div className="title-line" />
          <h1 className="text-2xl font-black mb-1">{empresa?.nome}</h1>
          <p className="text-sm" style={{ color: "#505050" }}>
            Cadastrada em {new Date(empresa?.createdAt ?? "").toLocaleDateString("pt-BR")}
          </p>
        </div>

        {/* Cards de status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-4xl font-black mb-1" style={{ color: "#006635" }}>
              {empresa?.totalRespostas ?? 0}
            </div>
            <div className="text-sm" style={{ color: "#505050" }}>Respostas recebidas</div>
            {!podeGerar && <div className="text-xs mt-1" style={{ color: "#d97706" }}>Mínimo: 3</div>}
          </div>

          <div className="card text-center">
            <div className="text-4xl font-black mb-1" style={{ color: "#006635" }}>
              {historico.length}
            </div>
            <div className="text-sm" style={{ color: "#505050" }}>Relatórios gerados</div>
          </div>

          <div className="card text-center">
            {evolucao !== null ? (
              <>
                <div className="text-4xl font-black mb-1"
                  style={{ color: evolucao < 0 ? "#006635" : evolucao > 0 ? "#dc2626" : "#9f9f9f" }}>
                  {evolucao < 0 ? "↑" : evolucao > 0 ? "↓" : "→"} {Math.abs(evolucao).toFixed(2)}
                </div>
                <div className="text-xs font-semibold mb-0.5"
                  style={{ color: evolucao < 0 ? "#006635" : evolucao > 0 ? "#dc2626" : "#9f9f9f" }}>
                  {evolucao < 0 ? "Melhora" : evolucao > 0 ? "Piora" : "Estável"}
                </div>
                <div className="text-xs" style={{ color: "#9f9f9f" }}>Evolução vs Anterior</div>
              </>
            ) : (
              <>
                <div className="text-3xl mb-1" style={{ color: "#c8c8c8" }}>—</div>
                <div className="text-xs" style={{ color: "#9f9f9f" }}>Evolução vs Anterior</div>
                <div className="text-xs mt-0.5" style={{ color: "#c8c8c8" }}>Gere 2+ relatórios</div>
              </>
            )}
          </div>
        </div>

        {/* Botão ver respostas detalhadas — somente admin */}
        {isAdmin && (empresa?.totalRespostas ?? 0) > 0 && (
          <div className="mb-6">
            <button
              onClick={() => router.push(`/respostas/${id}`)}
              className="w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all hover:shadow-md"
              style={{ background: "#fff", borderColor: "#006635", color: "#006635" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: "#e8f5ee" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "#006635" }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm">Ver respostas individuais</div>
                  <div className="text-xs mt-0.5" style={{ color: "#505050" }}>
                    Tabela completa com todas as {empresa?.totalRespostas} respostas · Exportar CSV
                  </div>
                </div>
              </div>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Link da pesquisa */}
          <div className="card">
            <h2 className="font-bold mb-1">Link da pesquisa</h2>
            <p className="text-sm mb-3" style={{ color: "#505050" }}>
              Compartilhe com seus funcionários. As respostas são <strong>anônimas</strong>.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md px-3 py-2.5 text-xs font-mono truncate"
                style={{ background: "#f9fafb", border: "1.5px solid #e8e8e8", color: "#006635" }}>
                {surveyUrl}
              </div>
              <button onClick={copiarLink}
                className="px-4 rounded-md text-sm font-semibold transition-all"
                style={{ background: copied ? "#e8f5ee" : "#f1f1f1", color: copied ? "#006635" : "#505050" }}>
                {copied ? "✓" : "Copiar"}
              </button>
            </div>
          </div>

          {/* Gerar relatório */}
          <div className="card">
            <h2 className="font-bold mb-1">Gerar novo relatório</h2>
            <p className="text-sm mb-3" style={{ color: "#505050" }}>
              Cada geração é salva no histórico para acompanhar a evolução.
            </p>
            {erro && (
              <div className="rounded-md px-4 py-2 text-sm mb-3"
                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                {erro}
              </div>
            )}
            {!podeGerar && (
              <div className="rounded-md px-3 py-2 text-sm mb-3"
                style={{ background: "#fff4ec", color: "#b74b00", border: "1px solid #fde8d0" }}>
                Aguardando {3 - (empresa?.totalRespostas ?? 0)} resposta(s) para liberar.
              </div>
            )}
            <button onClick={gerarRelatorio} disabled={!podeGerar || gerando} className="btn-primary w-full">
              {gerando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Gerando com IA...
                </span>
              ) : "Gerar relatório →"}
            </button>
          </div>
        </div>

        {/* Histórico */}
        {historico.length > 0 && (
          <div className="card">
            <h2 className="font-bold mb-5">Histórico de relatórios</h2>

            {/* Gráfico de evolução */}
            {historico.length > 1 && (() => {
              const data = [...historico].reverse()
              const W = 560, H = 190
              const PAD = { top: 32, bottom: 46, left: 36, right: 16 }
              const cW = W - PAD.left - PAD.right
              const cH = H - PAD.top - PAD.bottom

              function yp(v: number) {
                return PAD.top + (1 - (v - 1) / 4) * cH
              }
              function xp(i: number) {
                return PAD.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2)
              }

              const y37 = yp(3.7), y23 = yp(2.3)
              const pts = data.map((r, i) => ({
                x: xp(i), y: yp(r.mediaGeral), val: r.mediaGeral,
                label: new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                id: r.id,
              }))

              const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
              const areaPath = `${linePath} L${pts[pts.length - 1].x},${PAD.top + cH} L${pts[0].x},${PAD.top + cH}Z`

              const firstVal = pts[0].val, lastVal = pts[pts.length - 1].val
              const trendDelta = lastVal - firstVal

              function dotColor(v: number) {
                return v >= 3.7 ? "#dc2626" : v >= 2.3 ? "#d97706" : "#006635"
              }

              return (
                <div className="mb-6 p-4 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e8e8e8" }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#505050" }}>
                      Evolução da Média Geral
                    </p>
                    <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                      style={{
                        background: trendDelta < -0.05 ? "#dcfce7" : trendDelta > 0.05 ? "#fee2e2" : "#f1f5f9",
                        color: trendDelta < -0.05 ? "#15803d" : trendDelta > 0.05 ? "#dc2626" : "#64748b",
                      }}>
                      {trendDelta < -0.05 ? "↑ Melhora" : trendDelta > 0.05 ? "↓ Piora" : "→ Estável"}
                      {Math.abs(trendDelta) > 0.05 && (
                        <span className="font-black ml-1">{Math.abs(trendDelta).toFixed(2)} pts</span>
                      )}
                    </span>
                  </div>

                  <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
                    {/* Zonas de fundo */}
                    <rect x={PAD.left} y={PAD.top} width={cW} height={y37 - PAD.top} fill="#fef2f2" opacity={0.6} />
                    <rect x={PAD.left} y={y37} width={cW} height={y23 - y37} fill="#fffbeb" opacity={0.6} />
                    <rect x={PAD.left} y={y23} width={cW} height={PAD.top + cH - y23} fill="#f0fdf4" opacity={0.6} />

                    {/* Linhas de referência */}
                    <line x1={PAD.left} y1={y37} x2={PAD.left + cW} y2={y37} stroke="#dc2626" strokeWidth={1} strokeDasharray="5,3" opacity={0.35} />
                    <line x1={PAD.left} y1={y23} x2={PAD.left + cW} y2={y23} stroke="#059669" strokeWidth={1} strokeDasharray="5,3" opacity={0.35} />

                    {/* Labels de zona */}
                    <text x={PAD.left + cW - 2} y={PAD.top + 10} textAnchor="end" fontSize={9} fill="#dc2626" opacity={0.75} fontWeight="600">Grave ≥3,7</text>
                    <text x={PAD.left + cW - 2} y={(y37 + y23) / 2 + 3} textAnchor="end" fontSize={9} fill="#d97706" opacity={0.75} fontWeight="600">Crítico</text>
                    <text x={PAD.left + cW - 2} y={PAD.top + cH - 4} textAnchor="end" fontSize={9} fill="#059669" opacity={0.75} fontWeight="600">Satisfatório &lt;2,3</text>

                    {/* Eixo Y */}
                    {[1, 2.3, 3.7, 5].map(v => (
                      <g key={v}>
                        <line x1={PAD.left - 3} y1={yp(v)} x2={PAD.left} y2={yp(v)} stroke="#c8c8c8" strokeWidth={1} />
                        <text x={PAD.left - 5} y={yp(v) + 3} textAnchor="end" fontSize={8} fill="#9f9f9f">
                          {v.toFixed(1).replace(".", ",")}
                        </text>
                      </g>
                    ))}
                    <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH} stroke="#e8e8e8" strokeWidth={1} />

                    {/* Área + Linha */}
                    <path d={areaPath} fill="#3b82f6" opacity={0.07} />
                    <path d={linePath} fill="none" stroke="#1d4ed8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

                    {/* Deltas entre pontos */}
                    {pts.map((p, i) => {
                      if (i === 0) return null
                      const prev = pts[i - 1]
                      const delta = p.val - prev.val
                      const midX = (p.x + prev.x) / 2
                      const midY = Math.min(p.y, prev.y) - 14
                      const col = delta < -0.05 ? "#15803d" : delta > 0.05 ? "#dc2626" : "#94a3b8"
                      const arrow = delta < -0.05 ? "↑" : delta > 0.05 ? "↓" : "→"
                      return (
                        <g key={i}>
                          <rect x={midX - 14} y={midY - 9} width={28} height={13} rx={4}
                            fill={delta < -0.05 ? "#dcfce7" : delta > 0.05 ? "#fee2e2" : "#f1f5f9"} />
                          <text x={midX} y={midY} textAnchor="middle" fontSize={9} fill={col} fontWeight="bold">
                            {arrow} {Math.abs(delta).toFixed(2)}
                          </text>
                        </g>
                      )
                    })}

                    {/* Pontos e labels */}
                    {pts.map((p, i) => (
                      <g key={i} style={{ cursor: "pointer" }} onClick={() => router.push(`/relatorio/${p.id}`)}>
                        <line x1={p.x} y1={PAD.top} x2={p.x} y2={PAD.top + cH} stroke="#e8e8e8" strokeWidth={1} strokeDasharray="2,4" opacity={0.6} />
                        <text x={p.x} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={10} fill="#6b7280" fontWeight="500">{p.label}</text>
                        <text x={p.x} y={H - PAD.bottom + 26} textAnchor="middle" fontSize={9} fill="#c8c8c8">
                          {i === pts.length - 1 ? "mais recente" : `rel. ${i + 1}`}
                        </text>
                        <circle cx={p.x} cy={p.y} r={9} fill={dotColor(p.val)} opacity={0.15} />
                        <circle cx={p.x} cy={p.y} r={6} fill="white" stroke={dotColor(p.val)} strokeWidth={2.5} />
                        <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize={11} fill={dotColor(p.val)} fontWeight="bold">
                          {p.val.toFixed(2).replace(".", ",")}
                        </text>
                      </g>
                    ))}
                  </svg>

                  <p className="text-xs mt-1" style={{ color: "#9f9f9f" }}>
                    Clique em um ponto para ver o relatório · ↑ melhora · ↓ piora
                  </p>
                </div>
              )
            })()}

            {/* Lista */}
            <div className="space-y-3">
              {historico.map((r, i) => {
                const cfg = CAT_CONFIG[r.categoria] ?? CAT_CONFIG.satisfatorio
                return (
                  <div key={r.id} className="flex items-center gap-4 p-4 rounded-lg border transition-colors hover:border-gray-300 cursor-pointer"
                    style={{ border: "1px solid #e8e8e8" }}
                    onClick={() => router.push(`/relatorio/${r.id}`)}>
                    <div className="text-2xl">{cfg.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold">
                          {i === 0 ? "Mais recente" : `Relatório ${historico.length - i}`}
                        </span>
                        <span className="badge text-xs" style={{ background: cfg.bg, color: cfg.cor }}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: "#9f9f9f" }}>
                        {new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        {" · "}{r.totalRespostas} respondentes
                      </div>
                      <div className="mt-2 space-y-1">
                        {DIM_NAMES.map((nm, di) => (
                          <div key={nm} className="flex items-center gap-2">
                            <span className="text-xs w-28 shrink-0" style={{ color: "#505050" }}>{nm}</span>
                            <MiniBar valor={[r.mediaDimensao1, r.mediaDimensao2, r.mediaDimensao3][di]} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black" style={{ color: cfg.cor }}>{r.mediaGeral.toFixed(2)}</div>
                      <div className="text-xs" style={{ color: "#9f9f9f" }}>/ 5,00</div>
                      <div className="text-xs mt-1" style={{ color: "#006635" }}>Ver →</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
