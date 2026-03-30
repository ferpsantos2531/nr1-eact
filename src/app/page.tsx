"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const SETORES = [
  "Alimentação e Bebidas", "Bares e Restaurantes", "Hotelaria e Turismo",
  "Varejo", "Serviços", "Saúde", "Educação", "Tecnologia",
  "Indústria", "Construção Civil", "Logística e Transporte", "Outro",
]

const TAMANHOS = [
  { value: "1-10",   label: "Microempresa (1 a 10 funcionários)" },
  { value: "11-50",  label: "Pequena empresa (11 a 50 funcionários)" },
  { value: "51-200", label: "Média empresa (51 a 200 funcionários)" },
  { value: "201-500",label: "Grande empresa (201 a 500 funcionários)" },
  { value: "500+",   label: "Grande empresa (acima de 500 funcionários)" },
]

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState<"landing" | "form" | "success">("landing")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [surveyUrl, setSurveyUrl] = useState("")
  const [empresaId, setEmpresaId] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    nome: "", cnpj: "", email: "", telefone: "", setor: "", tamanho: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      const res = await fetch("/api/empresa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409 && data.empresaId) { router.push(`/empresa/${data.empresaId}`); return }
        setError(data.error || "Erro ao cadastrar empresa"); return
      }
      setSurveyUrl(`${window.location.origin}/pesquisa/${data.surveyToken}`)
      setEmpresaId(data.id)
      setStep("success")
    } catch { setError("Erro de conexão. Tente novamente.") }
    finally { setLoading(false) }
  }

  function copiar() {
    navigator.clipboard.writeText(surveyUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  /* ─── LANDING ─────────────────────────────────────────────── */
  if (step === "landing") return (
    <main>
      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded px-2 py-1">
              <span style={{ color: "#006635" }} className="font-black text-sm tracking-tight">ABRASEL</span>
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">Conexão Abrasel</span>
          </div>
          <button onClick={() => setStep("form")}
            className="btn-primary text-sm py-2 px-5">
            Começar avaliação
          </button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "#006635" }} className="pb-20 pt-16 px-6">
        <div className="max-w-5xl mx-auto">
          <span className="badge mb-4" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            📋 NR-1 · Vigência desde maio de 2025
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5 max-w-2xl">
            Avaliação de Riscos<br />
            <span style={{ color: "#f48131" }}>Psicossociais NR-1</span>
          </h1>
          <p className="text-green-100 text-lg max-w-xl mb-8 leading-relaxed">
            Aplique a pesquisa com seus funcionários, receba um diagnóstico completo
            por dimensão e um plano de ação personalizado gerado por Inteligência Artificial.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => setStep("form")} className="btn-primary px-8 py-3 text-base">
              Cadastrar minha empresa →
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-14 max-w-lg">
            {[
              { n: "31", label: "perguntas" },
              { n: "3", label: "dimensões" },
              { n: "100%", label: "anônimo" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-white">{s.n}</div>
                <div className="text-green-200 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="title-line" />
          <h2 className="text-2xl font-black mb-10" style={{ color: "#1a1a1a" }}>Como funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", icon: "🏢", titulo: "Cadastro", desc: "Registre os dados da sua empresa em menos de 2 minutos" },
              { n: "02", icon: "🔗", titulo: "Link exclusivo", desc: "Gere um link anônimo e exclusivo para a sua empresa" },
              { n: "03", icon: "👥", titulo: "Equipe responde", desc: "Distribua o link para que os funcionários respondam" },
              { n: "04", icon: "🤖", titulo: "Relatório com IA", desc: "Receba diagnóstico e plano de ação criado por IA" },
            ].map(s => (
              <div key={s.n} className="card hover:border-green-200 transition-colors">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-xs font-bold mb-1" style={{ color: "#f48131" }}>PASSO {s.n}</div>
                <h3 className="font-bold text-base mb-2">{s.titulo}</h3>
                <p className="text-sm" style={{ color: "#505050" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O que avalia */}
      <section className="py-16 px-6" style={{ background: "#f9fafb" }}>
        <div className="max-w-5xl mx-auto">
          <div className="title-line" />
          <h2 className="text-2xl font-black mb-10">O que é avaliado</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "⚙️", titulo: "Organização do Trabalho", desc: "Ritmo, pressão de prazos, cobrança por resultados, normas e repetitividade das tarefas." },
              { icon: "🏗️", titulo: "Condições de Trabalho", desc: "Ambiente físico, equipamentos, segurança, espaço e materiais disponíveis." },
              { icon: "🤝", titulo: "Relações Socioprofissionais", desc: "Comunicação, autonomia, integração entre equipe e relação com liderança." },
            ].map(d => (
              <div key={d.titulo} className="card">
                <div className="text-3xl mb-3">{d.icon}</div>
                <h3 className="font-bold mb-2">{d.titulo}</h3>
                <p className="text-sm" style={{ color: "#505050" }}>{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6" style={{ background: "#006635" }}>
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Sua empresa está em conformidade com a NR-1?
          </h2>
          <p className="text-green-100 mb-8 text-lg">Descubra agora e receba um plano de ação personalizado.</p>
          <button onClick={() => setStep("form")} className="btn-primary px-10 py-4 text-base">
            Iniciar avaliação gratuita
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 text-sm py-8 px-6 text-center">
        <p>© {new Date().getFullYear()} Abrasel · Avaliação NR-1 · Todos os direitos reservados</p>
      </footer>
    </main>
  )

  /* ─── FORM ─────────────────────────────────────────────────── */
  if (step === "form") return (
    <main className="min-h-screen flex flex-col" style={{ background: "#f9fafb" }}>
      <header style={{ background: "#006635" }} className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="bg-white rounded px-2 py-1">
            <span style={{ color: "#006635" }} className="font-black text-sm tracking-tight">ABRASEL</span>
          </div>
          <span className="text-white font-semibold text-sm">Avaliação NR-1</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <button onClick={() => setStep("landing")} className="text-sm mb-6 flex items-center gap-1" style={{ color: "#505050" }}>
            ← Voltar
          </button>
          <div className="title-line" />
          <h1 className="text-2xl font-black mb-1">Cadastre sua empresa</h1>
          <p className="text-sm mb-6" style={{ color: "#505050" }}>
            Preencha os dados abaixo para gerar o link de pesquisa
          </p>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nome da empresa *</label>
                <input className="input" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})}
                  placeholder="Ex: Restaurante do João" required />
              </div>
              <div>
                <label className="label">E-mail de contato *</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="contato@empresa.com.br" required />
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
                <label className="label">Setor de atuação</label>
                <select className="input" value={form.setor} onChange={e => setForm({...form, setor: e.target.value})}>
                  <option value="">Selecione...</option>
                  {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Número de funcionários</label>
                <select className="input" value={form.tamanho} onChange={e => setForm({...form, tamanho: e.target.value})}>
                  <option value="">Selecione...</option>
                  {TAMANHOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {error && <div className="rounded-md px-4 py-3 text-sm" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>{error}</div>}
              <button type="submit" disabled={loading} className="btn-green w-full mt-2">
                {loading ? "Cadastrando..." : "Gerar link da pesquisa →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  )

  /* ─── SUCCESS ──────────────────────────────────────────────── */
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#f9fafb" }}>
      <header style={{ background: "#006635" }} className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="bg-white rounded px-2 py-1">
            <span style={{ color: "#006635" }} className="font-black text-sm tracking-tight">ABRASEL</span>
          </div>
          <span className="text-white font-semibold text-sm">Avaliação NR-1</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "#e8f5ee" }}>
            <svg className="w-8 h-8" style={{ color: "#006635" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-black mb-2">Empresa cadastrada!</h1>
          <p className="mb-8" style={{ color: "#505050" }}>
            Compartilhe o link abaixo com seus funcionários para que eles respondam a pesquisa de forma anônima.
          </p>

          <div className="card mb-4 text-left">
            <p className="text-sm font-semibold mb-3">Link da pesquisa (anônimo):</p>
            <div className="rounded-md px-4 py-3 text-sm font-mono break-all mb-3"
              style={{ background: "#f9fafb", border: "1.5px solid #e8e8e8", color: "#006635" }}>
              {surveyUrl}
            </div>
            <button onClick={copiar} className={`w-full py-2.5 rounded-md text-sm font-semibold transition-all ${copied ? "bg-green-50 text-green-700" : "btn-outline"}`}>
              {copied ? "✓ Copiado!" : "Copiar link"}
            </button>
          </div>

          <div className="rounded-md px-4 py-3 text-sm text-left mb-6"
            style={{ background: "#fff4ec", border: "1px solid #fde8d0", color: "#b74b00" }}>
            <strong>Importante:</strong> O relatório só pode ser gerado com no mínimo 3 respostas.
            Quanto mais funcionários responderem, mais preciso será o diagnóstico.
          </div>

          <button onClick={() => router.push(`/empresa/${empresaId}`)} className="btn-green w-full">
            Acessar painel da empresa →
          </button>
        </div>
      </div>
    </main>
  )
}
