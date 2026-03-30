"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

type Empresa = {
  id: string
  nome: string
  tamanho: string | null
  surveyToken: string
  createdAt: string
  totalRespostas: number
  ultimoRelatorio: { mediaGeral: number; categoria: string; createdAt: string } | null
}

type Usuario = { id: string; email: string }

const CAT_CONFIG: Record<string, { cor: string; bg: string; emoji: string; label: string }> = {
  grave:        { cor: "#dc2626", bg: "#fef2f2", emoji: "🔴", label: "Grave" },
  critico:      { cor: "#d97706", bg: "#fffbeb", emoji: "🟡", label: "Crítico" },
  satisfatorio: { cor: "#059669", bg: "#ecfdf5", emoji: "🟢", label: "Satisfatório" },
}

const TAMANHOS: Record<string, string> = {
  "1-10": "1–10 func.", "11-50": "11–50 func.", "51-200": "51–200 func.",
  "201-500": "201–500 func.", "500+": "500+ func.",
}

export default function Dashboard() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [showNovaEmpresa, setShowNovaEmpresa] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/dashboard").then(r => r.json()),
    ]).then(([user, data]) => {
      if (user.error) { router.push("/login"); return }
      setUsuario(user)
      setEmpresas(data.empresas ?? [])
    }).catch(() => router.push("/login"))
    .finally(() => setLoading(false))
  }, [router])

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  return (
    <main className="min-h-screen" style={{ background: "#f9fafb" }}>
      {/* Beta banner */}
      <div className="w-full text-center py-2 text-xs font-semibold"
        style={{ background: "#fff4ec", color: "#b74b00", borderBottom: "1px solid #fde8d0" }}>
        🧪 Versão Beta — Ferramenta em fase de testes. Seus dados estão seguros.
      </div>

      <header style={{ background: "#006635" }} className="px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Image src="/abrasel-logo.svg" alt="Abrasel" width={110} height={22}
            style={{ filter: "brightness(0) invert(1)" }} />
          <div className="flex items-center gap-4">
            <span className="text-green-200 text-sm hidden sm:block">{usuario?.email}</span>
            <button onClick={logout} className="text-green-100 text-sm hover:text-white">Sair</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <div className="title-line" />
            <h1 className="text-2xl font-black mb-1">Minhas Empresas</h1>
            <p className="text-sm" style={{ color: "#505050" }}>
              {empresas.length === 0
                ? "Nenhuma empresa cadastrada ainda."
                : `${empresas.length} empresa${empresas.length > 1 ? "s" : ""} cadastrada${empresas.length > 1 ? "s" : ""}`}
            </p>
          </div>
          <button onClick={() => setShowNovaEmpresa(true)} className="btn-primary shrink-0">
            + Nova empresa
          </button>
        </div>

        {/* Modal nova empresa */}
        {showNovaEmpresa && (
          <NovaEmpresaModal
            onClose={() => setShowNovaEmpresa(false)}
            onSuccess={(empresa) => {
              setEmpresas(prev => [empresa, ...prev])
              setShowNovaEmpresa(false)
            }}
          />
        )}

        {/* Lista de empresas */}
        {empresas.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-4xl mb-4">🏢</p>
            <h2 className="font-black text-lg mb-2">Cadastre sua primeira empresa</h2>
            <p className="text-sm mb-6" style={{ color: "#505050" }}>
              Clique em "Nova empresa" para começar a avaliação NR-1.
            </p>
            <button onClick={() => setShowNovaEmpresa(true)} className="btn-green">
              + Cadastrar empresa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {empresas.map(e => {
              const cat = e.ultimoRelatorio
                ? CAT_CONFIG[e.ultimoRelatorio.categoria] ?? CAT_CONFIG.satisfatorio
                : null
              return (
                <div key={e.id} className="card cursor-pointer hover:border-green-200 transition-all"
                  onClick={() => router.push(`/empresa/${e.id}`)}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-black text-lg leading-tight">{e.nome}</h2>
                      <p className="text-xs mt-0.5" style={{ color: "#9f9f9f" }}>
                        {e.tamanho ? TAMANHOS[e.tamanho] ?? e.tamanho : "Tamanho não informado"}
                        {" · "}Desde {new Date(e.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
                      </p>
                    </div>
                    {cat && (
                      <span className="badge shrink-0" style={{ background: cat.bg, color: cat.cor }}>
                        {cat.emoji} {cat.label}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg p-3 text-center" style={{ background: "#f9fafb" }}>
                      <div className="text-2xl font-black" style={{ color: "#006635" }}>
                        {e.totalRespostas}
                      </div>
                      <div className="text-xs" style={{ color: "#9f9f9f" }}>respostas</div>
                    </div>
                    <div className="rounded-lg p-3 text-center" style={{ background: "#f9fafb" }}>
                      {e.ultimoRelatorio ? (
                        <>
                          <div className="text-2xl font-black" style={{ color: cat?.cor }}>
                            {e.ultimoRelatorio.mediaGeral.toFixed(2)}
                          </div>
                          <div className="text-xs" style={{ color: "#9f9f9f" }}>última média</div>
                        </>
                      ) : (
                        <>
                          <div className="text-2xl font-black" style={{ color: "#c8c8c8" }}>—</div>
                          <div className="text-xs" style={{ color: "#9f9f9f" }}>sem relatório</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: e.totalRespostas >= 3 ? "#006635" : "#d97706" }}>
                      {e.totalRespostas >= 3 ? "✓ Pronto para gerar relatório" : `Aguardando ${3 - e.totalRespostas} resposta(s)`}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "#006635" }}>Abrir →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

function NovaEmpresaModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (empresa: Empresa) => void
}) {
  const [form, setForm] = useState({ nome: "", cnpj: "", telefone: "", tamanho: "" })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro("")
    try {
      const res = await fetch("/api/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao cadastrar"); return }
      onSuccess({
        id: data.id, nome: form.nome, tamanho: form.tamanho || null,
        surveyToken: data.surveyToken, createdAt: new Date().toISOString(),
        totalRespostas: 0, ultimoRelatorio: null,
      })
    } catch { setErro("Erro de conexão.") }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-md card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg">Nova empresa</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: "#9f9f9f" }}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="label">Nome da empresa *</label>
            <input className="input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
              placeholder="Ex: Restaurante do João" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">CNPJ</label>
              <input className="input" value={form.cnpj} onChange={e => setForm({...form, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <div>
            <label className="label">Nº de funcionários</label>
            <select className="input" value={form.tamanho} onChange={e => setForm({...form, tamanho: e.target.value})}>
              <option value="">Selecione...</option>
              {[["1-10","1–10"],["11-50","11–50"],["51-200","51–200"],["201-500","201–500"],["500+","500+"]].map(([v,l]) => (
                <option key={v} value={v}>{l} funcionários</option>
              ))}
            </select>
          </div>
          {erro && <p className="text-sm" style={{ color: "#dc2626" }}>{erro}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-green flex-1">
              {loading ? "Salvando..." : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
