"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") ?? "/admin"

  const [form, setForm] = useState({ email: "", senha: "" })
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setErro(data.error || "Credenciais inválidas")
        return
      }

      router.replace(redirect)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0f172a" }}
    >
      {/* Logo / cabeçalho */}
      <div className="mb-8 text-center">
        <div
          className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
          style={{ background: "#1e3a8a" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              stroke="#93c5fd"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white">NR-1 Abrasel</h1>
        <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
          Acesso Restrito — Administração
        </p>
      </div>

      {/* Card de login */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
      >
        <h2 className="text-base font-semibold text-white mb-1">
          Entrar como administrador
        </h2>
        <p className="text-xs mb-6" style={{ color: "#64748b" }}>
          Use as credenciais fornecidas pela equipe Abrasel
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#94a3b8" }}
            >
              E-MAIL
            </label>
            <input
              type="email"
              required
              autoFocus
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="admin@abrasel.com.br"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition"
              style={{
                background: "#0f172a",
                border: "1px solid #334155",
                color: "#e2e8f0",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "#3b82f6")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "#334155")
              }
            />
          </div>

          {/* Senha */}
          <div>
            <label
              className="block text-xs font-medium mb-1"
              style={{ color: "#94a3b8" }}
            >
              SENHA
            </label>
            <div className="relative">
              <input
                type={mostrarSenha ? "text" : "password"}
                required
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition pr-12"
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#3b82f6")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "#334155")
                }
              />
              <button
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                style={{ color: "#64748b" }}
              >
                {mostrarSenha ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div
              className="rounded-lg px-3 py-2.5 text-xs"
              style={{
                background: "#450a0a",
                border: "1px solid #7f1d1d",
                color: "#fca5a5",
              }}
            >
              {erro}
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-all"
            style={{
              background: loading ? "#1e3a8a" : "#2563eb",
              color: "#fff",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Verificando..." : "Acessar painel →"}
          </button>
        </form>
      </div>

      {/* Aviso de segurança */}
      <p className="mt-6 text-xs text-center" style={{ color: "#475569" }}>
        🔒 Acesso monitorado · Somente para equipe autorizada Abrasel
      </p>
    </main>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  )
}
