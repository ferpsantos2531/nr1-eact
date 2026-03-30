"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Header from "@/components/Header"

const TAMANHOS = [
  { value: "1-10",    label: "1 a 10 funcionários" },
  { value: "11-50",   label: "11 a 50 funcionários" },
  { value: "51-200",  label: "51 a 200 funcionários" },
  { value: "201-500", label: "201 a 500 funcionários" },
  { value: "500+",    label: "Acima de 500 funcionários" },
]

export default function CadastroPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [form, setForm] = useState({ nomeEmpresa: "", email: "", senha: "", cnpj: "", telefone: "", tamanho: "" })
  const [mostrarSenha, setMostrarSenha] = useState(false)

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
      {/* Beta banner */}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">CNPJ</label>
                    <input className="input" value={form.cnpj}
                      onChange={e => setForm({...form, cnpj: e.target.value})} placeholder="00.000.000/0001-00" />
                  </div>
                  <div>
                    <label className="label">Telefone</label>
                    <input className="input" value={form.telefone}
                      onChange={e => setForm({...form, telefone: e.target.value})} placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="label">Número de funcionários</label>
                  <select className="input" value={form.tamanho}
                    onChange={e => setForm({...form, tamanho: e.target.value})}>
                    <option value="">Selecione...</option>
                    {TAMANHOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
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
