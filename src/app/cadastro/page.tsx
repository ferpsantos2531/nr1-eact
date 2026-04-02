"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"
import { consultarCNPJ } from "@/lib/cnpj"

const TAMANHOS = [
  { value: "1-10",    label: "1 a 10 funcionários" },
  { value: "11-50",   label: "11 a 50 funcionários" },
  { value: "51-200",  label: "51 a 200 funcionários" },
  { value: "201-500", label: "201 a 500 funcionários" },
  { value: "500+",    label: "Acima de 500 funcionários" },
]

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

export default function CadastroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [form, setForm] = useState({
    nomeEmpresa: "", email: "", senha: "", cnpj: "", telefone: "", tamanho: "",
    razaoSocial: "", cidade: "", estado: "",
  })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [cnpjStatus, setCnpjStatus] = useState<"idle" | "loading" | "ok" | "inativo" | "error">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Consulta CNPJ automaticamente quando atinge 14 dígitos
  useEffect(() => {
    const digits = form.cnpj.replace(/\D/g, "")
    if (digits.length < 14) { setCnpjStatus("idle"); return }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setCnpjStatus("loading")
      const data = await consultarCNPJ(digits)
      if (!data) {
        setCnpjStatus("error")
        return
      }
      setCnpjStatus(data.ativo ? "ok" : "inativo")
      const nome = data.nomeFantasia || data.razaoSocial
      setForm(prev => ({
        ...prev,
        nomeEmpresa: prev.nomeEmpresa || nome,
        razaoSocial: data.razaoSocial,
        cidade: data.cidade,
        estado: data.estado,
      }))
    }, 400)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [form.cnpj])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro("")
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.redirect) { router.push(data.redirect); return }
        setErro(data.error || "Erro ao cadastrar"); return
      }
      router.push("/dashboard")
    } catch { setErro("Erro de conexão. Tente novamente.") }
    finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#f9fafb" }}>
      <div className="w-full text-center py-2 text-xs font-semibold"
        style={{ background: "#fff4ec", color: "#b74b00", borderBottom: "1px solid #fde8d0" }}>
        🧪 Versão Beta — Ferramenta em fase de testes
      </div>

      <Header backHref="/" />

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button onClick={() => router.push("/")} className="text-sm mb-6 flex items-center gap-1" style={{ color: "#505050" }}>
            ← Voltar
          </button>
          <div className="title-line" />
          <h1 className="text-2xl font-black mb-1">Criar conta</h1>
          <p className="text-sm mb-6" style={{ color: "#505050" }}>
            Cadastre sua empresa e comece a avaliação NR-1
          </p>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nome da empresa *</label>
                <input className="input" value={form.nomeEmpresa}
                  onChange={e => setForm({...form, nomeEmpresa: e.target.value})}
                  placeholder="Ex: Restaurante do João" required />
              </div>

              <div className="border-t pt-4" style={{ borderColor: "#f1f1f1" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9f9f9f" }}>Acesso à conta</p>
                <div className="space-y-3">
                  <div>
                    <label className="label">E-mail *</label>
                    <input className="input" type="email" value={form.email}
                      onChange={e => setForm({...form, email: e.target.value})}
                      placeholder="seu@email.com.br" required />
                  </div>
                  <div>
                    <label className="label">Senha *</label>
                    <div className="relative">
                      <input className="input pr-12" type={mostrarSenha ? "text" : "password"}
                        value={form.senha} onChange={e => setForm({...form, senha: e.target.value})}
                        placeholder="Mínimo 6 caracteres" required minLength={6} />
                      <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9f9f9f" }}>
                        {mostrarSenha ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4" style={{ borderColor: "#f1f1f1" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9f9f9f" }}>Dados opcionais</p>
                <div className="space-y-3">

                  {/* CNPJ com lookup */}
                  <div>
                    <label className="label">CNPJ</label>
                    <div className="relative">
                      <input className="input pr-10" value={form.cnpj} inputMode="numeric"
                        onChange={e => setForm({...form, cnpj: maskCNPJ(e.target.value)})}
                        placeholder="00.000.000/0001-00" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {cnpjStatus === "loading" && (
                          <div className="w-4 h-4 border-2 rounded-full animate-spin"
                            style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
                        )}
                        {cnpjStatus === "ok" && (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#006635" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {(cnpjStatus === "error" || cnpjStatus === "inativo") && (
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Status do CNPJ */}
                    {cnpjStatus === "ok" && (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs space-y-0.5"
                        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div className="font-semibold" style={{ color: "#15803d" }}>✓ CNPJ válido — empresa ativa</div>
                        {form.razaoSocial && <div style={{ color: "#166534" }}>Razão social: {form.razaoSocial}</div>}
                        {form.cidade && <div style={{ color: "#166534" }}>{form.cidade} — {form.estado}</div>}
                      </div>
                    )}
                    {cnpjStatus === "inativo" && (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e" }}>
                        ⚠ CNPJ encontrado mas a empresa consta como <strong>inativa</strong> na Receita Federal.
                        {form.razaoSocial && <span> ({form.razaoSocial})</span>}
                      </div>
                    )}
                    {cnpjStatus === "error" && (
                      <div className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                        CNPJ não encontrado na Receita Federal. Verifique e tente novamente.
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Telefone</label>
                      <input className="input" value={form.telefone} inputMode="numeric"
                        onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})}
                        placeholder="(11) 99999-9999" />
                    </div>
                    <div>
                      <label className="label">Nº de funcionários</label>
                      <select className="input" value={form.tamanho}
                        onChange={e => setForm({...form, tamanho: e.target.value})}>
                        <option value="">Selecione...</option>
                        {TAMANHOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {erro && (
                <div className="rounded-md px-4 py-3 text-sm"
                  style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-green w-full mt-2">
                {loading ? "Criando conta..." : "Criar conta e começar →"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm mt-4" style={{ color: "#505050" }}>
            Já tem conta?{" "}
            <button onClick={() => router.push("/login")} className="font-semibold" style={{ color: "#006635" }}>
              Entrar
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
