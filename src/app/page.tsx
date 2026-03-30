"use client"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  return (
    <main>
      {/* Beta banner */}
      <div className="w-full text-center py-2 text-xs font-semibold"
        style={{ background: "#fff4ec", color: "#b74b00", borderBottom: "1px solid #fde8d0" }}>
        🧪 Versão Beta v2 — Ferramenta em fase de testes. Seus dados estão seguros.
      </div>

      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded px-2 py-1">
              <span style={{ color: "#006635" }} className="font-black text-sm tracking-tight">ABRASEL</span>
            </div>
            <span className="text-white font-semibold text-sm hidden sm:block">Conexão Abrasel</span>
          </div>
          <button onClick={() => router.push("/login")}
            className="text-green-100 text-sm hover:text-white transition-colors">
            Já tenho conta →
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
            e um plano de ação gerado por Inteligência Artificial — em conformidade com a NR-1.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push("/cadastro")}
              className="btn-primary px-8 py-3 text-base">
              Cadastrar minha empresa →
            </button>
            <button onClick={() => router.push("/login")}
              className="btn-outline px-8 py-3 text-base" style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>
              Entrar na minha conta
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-14 max-w-lg">
            {[{ n: "31", l: "perguntas" }, { n: "3", l: "dimensões" }, { n: "100%", l: "anônimo" }].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-3xl font-black text-white">{s.n}</div>
                <div className="text-green-200 text-sm">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="title-line" />
          <h2 className="text-2xl font-black mb-10">Como funciona</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { n: "01", icon: "🏢", titulo: "Cadastro", desc: "Registre sua empresa com email e senha em menos de 2 minutos" },
              { n: "02", icon: "🔗", titulo: "Link exclusivo", desc: "Gere um link anônimo e exclusivo para sua empresa" },
              { n: "03", icon: "👥", titulo: "Equipe responde", desc: "Distribua o link para que os funcionários respondam" },
              { n: "04", icon: "🤖", titulo: "Relatório com IA", desc: "Receba diagnóstico e plano de ação criado por IA" },
            ].map(s => (
              <div key={s.n} className="card">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-xs font-bold mb-1" style={{ color: "#f48131" }}>PASSO {s.n}</div>
                <h3 className="font-bold text-base mb-2">{s.titulo}</h3>
                <p className="text-sm" style={{ color: "#505050" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dimensões */}
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
          <h2 className="text-3xl font-black text-white mb-4">Sua empresa está em conformidade com a NR-1?</h2>
          <p className="text-green-100 mb-8 text-lg">Descubra agora e receba um plano de ação personalizado.</p>
          <button onClick={() => router.push("/cadastro")} className="btn-primary px-10 py-4 text-base">
            Iniciar avaliação gratuita
          </button>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 text-sm py-8 px-6 text-center">
        <p>© {new Date().getFullYear()} Abrasel · Avaliação NR-1 · Versão Beta</p>
      </footer>
    </main>
  )
}
