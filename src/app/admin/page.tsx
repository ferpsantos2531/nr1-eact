"use client"
import { useEffect, useState } from "react"
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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

/* ─── Main ───────────────────────────────────────────────── */
export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"dashboard" | "empresas" | "usuarios">("dashboard")
  const [stats, setStats] = useState<Stats | null>(null)
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [busca, setBusca] = useState("")

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-lg font-black mb-2">🔒 Acesso Negado</p>
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

  return (
    <div className="min-h-screen" style={{ background: "#f9fafb" }}>

      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image src="/abrasel-logo.svg" alt="Abrasel" width={100} height={20}
              style={{ filter: "brightness(0) invert(1)" }} />
            <div className="h-5 w-px" style={{ background: "rgba(255,255,255,0.3)" }} />
            <span className="text-white text-sm font-semibold opacity-90">Painel Administrativo</span>
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
          {(["dashboard", "empresas", "usuarios"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setBusca("") }}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize"
              style={{
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#006635" : "#6b7280",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {t === "dashboard" ? "Visão Geral" : t === "empresas" ? "Empresas" : "Usuários"}
            </button>
          ))}
        </div>

        {/* ── TAB: DASHBOARD ─────────────────────────────── */}
        {tab === "dashboard" && stats && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Usuários cadastrados", value: stats.totalUsuarios, icon: "👤" },
                { label: "Empresas cadastradas", value: stats.totalEmpresas, icon: "🏢" },
                { label: "Total de respondentes", value: stats.totalRespostas, icon: "📋" },
                { label: "Relatórios gerados", value: stats.totalRelatorios, icon: "📊" },
              ].map(k => (
                <div key={k.label} className="card text-center">
                  <div className="text-2xl mb-1">{k.icon}</div>
                  <div className="text-3xl font-black mb-1" style={{ color: "#006635" }}>{k.value}</div>
                  <div className="text-xs" style={{ color: "#6b7280" }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Linha 2: Média geral + Distribuição */}
            <div className="grid sm:grid-cols-2 gap-6">

              {/* Média e dimensões */}
              <div className="card">
                <h3 className="font-black mb-1" style={{ color: "#1a1a1a" }}>Média Geral da Plataforma</h3>
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
              <div className="card">
                <h3 className="font-black mb-1" style={{ color: "#1a1a1a" }}>Distribuição por Classificação</h3>
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

            {/* Últimas avaliações */}
            {stats.ultimosRelatorios.length > 0 && (
              <div className="card">
                <h3 className="font-black mb-4" style={{ color: "#1a1a1a" }}>Últimas Avaliações Geradas</h3>
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

            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f1f1f1" }}>
                      {["Empresa", "Responsável", "Porte", "Respondentes", "Média", "Classificação", "Data", ""].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap"
                          style={{ color: "#6b7280" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empresasFiltradas.map((e, i) => (
                      <tr key={e.id}
                        style={{ borderBottom: i < empresasFiltradas.length - 1 ? "1px solid #f9fafb" : "none" }}
                        className="hover:bg-gray-50 transition-colors">
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
                              className="text-xs px-2 py-1 rounded-lg font-medium whitespace-nowrap"
                              style={{ background: "#f0f7f3", color: "#006635" }}>
                              Ver relatório
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {empresasFiltradas.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: "#9f9f9f" }}>
                        Nenhuma empresa encontrada.
                      </td></tr>
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

            <div className="space-y-3">
              {usuariosFiltrados.map(u => (
                <div key={u.id} className="card">
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
                          <div key={e.id} className="flex items-center justify-between gap-4 py-1">
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
              {usuariosFiltrados.length === 0 && (
                <div className="card text-center py-8">
                  <p className="text-sm" style={{ color: "#9f9f9f" }}>Nenhum usuário encontrado.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
