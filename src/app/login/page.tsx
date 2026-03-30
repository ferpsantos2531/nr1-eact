"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")
  const [form, setForm] = useState({ email: "", senha: "" })
  const [mostrarSenha, setMostrarSenha] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErro("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || "Erro ao entrar"); return }
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

      <header style={{ background: "#006635" }} className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-3">
            <div className="bg-white rounded px-2 py-1">
              <span style={{ color: "#006635" }} className="font-black text-sm">ABRASEL</span>
            </div>
            <span className="text-white font-semibold text-sm">Avaliação NR-1</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="title-line" />
          <h1 className="text-2xl font-black mb-1">Entrar</h1>
          <p className="text-sm mb-6" style={{ color: "#505050" }}>
            Acesse sua conta para gerenciar suas empresas
          </p>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="seu@email.com.br" required autoFocus />
              </div>
              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input className="input pr-12" type={mostrarSenha ? "text" : "password"}
                    value={form.senha} onChange={e => setForm({...form, senha: e.target.value})}
                    placeholder="Sua senha" required />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#9f9f9f" }}>
                    {mostrarSenha ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="rounded-md px-4 py-3 text-sm"
                  style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                  {erro}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-green w-full">
                {loading ? "Entrando..." : "Entrar →"}
              </button>
            </form>
          </div>

          <p className="text-center text-sm mt-4" style={{ color: "#505050" }}>
            Ainda não tem conta?{" "}
            <button onClick={() => router.push("/cadastro")} className="font-semibold" style={{ color: "#006635" }}>
              Cadastrar empresa
            </button>
          </p>
        </div>
      </div>
    </main>
  )
}
