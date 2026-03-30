"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { FEEDBACKS, type Categoria } from "@/lib/scoring"
import { DIMENSOES } from "@/lib/questions"
import type { PlanoAcao } from "@/lib/ai"

type Relatorio = {
  id: string
  totalRespostas: number
  mediaGeral: number
  mediaDimensao1: number
  mediaDimensao2: number
  mediaDimensao3: number
  categoria: Categoria
  planoAcaoIA: PlanoAcao
  createdAt: string
  empresa: { nome: string; email: string;  tamanho: string | null; id: string }
}

const DIM_ICONS = ["⚙️", "🏗️", "🤝"]

function ScoreBar({ valor }: { valor: number }) {
  const pct = (valor / 5) * 100
  const color = valor >= 3.7 ? "#dc2626" : valor >= 2.3 ? "#d97706" : "#006635"
  return (
    <div className="flex items-center gap-3 mt-1">
      <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: "#f1f1f1" }}>
        <div className="h-3 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-black w-10 text-right" style={{ color }}>{valor.toFixed(2)}</span>
    </div>
  )
}

function CatBadge({ cat }: { cat: Categoria }) {
  const f = FEEDBACKS[cat]
  return (
    <span className="badge" style={{ background: f.corFundo, color: f.cor }}>
      {f.emoji} {f.titulo.split(" — ")[0]}
    </span>
  )
}

export default function RelatorioPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [rel, setRel] = useState<Relatorio | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")

  useEffect(() => {
    fetch(`/api/relatorio?id=${id}`)
      .then(r => r.json())
      .then(data => { if (data.error) setErro(data.error); else setRel(data) })
      .catch(() => setErro("Erro ao carregar relatório"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="animate-spin w-10 h-10 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
      <p style={{ color: "#505050" }}>Carregando relatório...</p>
    </div>
  )

  if (erro || !rel) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="mb-4" style={{ color: "#dc2626" }}>{erro || "Relatório não encontrado"}</p>
        <button onClick={() => router.push("/")} className="btn-green">Voltar ao início</button>
      </div>
    </div>
  )

  const fb = FEEDBACKS[rel.categoria]
  const plano = rel.planoAcaoIA
  const dims = [rel.mediaDimensao1, rel.mediaDimensao2, rel.mediaDimensao3]

  return (
    <main className="min-h-screen" style={{ background: "#f9fafb" }}>
      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Image src="/abrasel-logo.svg" alt="Abrasel" width={110} height={34}
            style={{ filter: "brightness(0) invert(1)" }} />
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(`/empresa/${rel.empresa.id}`)}
              className="text-green-100 text-sm hover:text-white">
              ← Painel
            </button>
            <button onClick={() => window.print()} className="btn-primary text-sm py-2 px-4">
              Imprimir / PDF
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Cabeçalho */}
        <div className="mb-8">
          <div className="title-line" />
          <p className="text-sm mb-1" style={{ color: "#505050" }}>Relatório de Avaliação NR-1</p>
          <h1 className="text-3xl font-black mb-2">{rel.empresa.nome}</h1>
          <p className="text-sm" style={{ color: "#9f9f9f" }}>
            Gerado em {new Date(rel.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            {" · "}{rel.totalRespostas} respondentes
          </p>
        </div>

        {/* Card resultado geral */}
        <div className="card mb-6 overflow-hidden"
          style={{ border: `2px solid ${fb.cor}30`, background: fb.corFundo }}>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: fb.cor }}>
                Resultado Geral
              </p>
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-6xl font-black" style={{ color: fb.cor }}>
                  {rel.mediaGeral.toFixed(2)}
                </span>
                <span className="text-lg" style={{ color: "#9f9f9f" }}>/5,00</span>
              </div>
              <div className="mt-2"><CatBadge cat={rel.categoria} /></div>
            </div>
            <div className="flex-1">
              <div className="w-full rounded-full h-5 overflow-hidden" style={{ background: "rgba(255,255,255,0.5)" }}>
                <div className="h-5 rounded-full transition-all duration-1000"
                  style={{ width: `${(rel.mediaGeral / 5) * 100}%`, background: fb.cor }} />
              </div>
              <p className="text-sm mt-4" style={{ color: fb.cor }}>
                {fb.descricao.slice(0, 180)}...
              </p>
            </div>
          </div>
        </div>

        {/* Por dimensão */}
        <div className="card mb-6">
          <h2 className="font-black text-lg mb-5">Resultado por Dimensão</h2>
          <div className="space-y-6">
            {DIMENSOES.map((d, i) => {
              const cat: Categoria = dims[i] >= 3.7 ? "grave" : dims[i] >= 2.3 ? "critico" : "satisfatorio"
              return (
                <div key={i}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{DIM_ICONS[i]}</span>
                      <div>
                        <p className="font-bold text-sm">{d.nome}</p>
                        <p className="text-xs" style={{ color: "#9f9f9f" }}>{d.descricao}</p>
                      </div>
                    </div>
                    <CatBadge cat={cat} />
                  </div>
                  <ScoreBar valor={dims[i]} />
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 text-xs" style={{ borderTop: "1px solid #e8e8e8", color: "#9f9f9f" }}>
            Escala: 1=Nunca · 2=Raramente · 3=Às vezes · 4=Frequentemente · 5=Sempre
            &nbsp;|&nbsp; Referência: &lt;2,3 Satisfatório · 2,3–3,69 Crítico · ≥3,7 Grave
          </div>
        </div>

        {/* Plano de Ação IA */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-base font-black"
              style={{ background: "#006635" }}>✦</div>
            <h2 className="font-black text-xl">Plano de Ação — Inteligência Artificial</h2>
          </div>

          {/* Resumo */}
          <div className="card mb-4" style={{ borderLeft: "4px solid #006635" }}>
            <p className="text-sm leading-relaxed" style={{ color: "#1a1a1a" }}>{plano.resumo}</p>
          </div>

          {/* Prioridades */}
          <div className="card mb-4">
            <h3 className="font-black mb-4">🎯 Prioridades Identificadas</h3>
            <div className="space-y-2">
              {plano.prioridades.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "#f9fafb" }}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white"
                    style={{ background: i < 2 ? "#dc2626" : i < 4 ? "#d97706" : "#006635" }}>
                    {i + 1}
                  </span>
                  <p className="text-sm">{p}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          {[
            { titulo: "⚡ Ações de Curto Prazo", sub: "0 a 3 meses", acoes: plano.acoesCurtoPrazo, cor: "#dc2626", bg: "#fef2f2" },
            { titulo: "📅 Ações de Médio Prazo", sub: "3 a 12 meses", acoes: plano.acoesMedioPrazo, cor: "#1d4ed8", bg: "#eff6ff" },
          ].map(grupo => (
            <div key={grupo.titulo} className="card mb-4">
              <div className="flex items-baseline gap-2 mb-4">
                <h3 className="font-black">{grupo.titulo}</h3>
                <span className="text-xs" style={{ color: "#9f9f9f" }}>{grupo.sub}</span>
              </div>
              <div className="space-y-3">
                {grupo.acoes.map((a, i) => (
                  <div key={i} className="p-4 rounded-lg" style={{ background: grupo.bg, border: `1px solid ${grupo.cor}20` }}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-sm">{a.titulo}</h4>
                      <span className="text-xs font-semibold px-2 py-1 rounded shrink-0"
                        style={{ background: "rgba(255,255,255,0.8)", color: grupo.cor }}>
                        {a.responsavel}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "#505050" }}>{a.descricao}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Indicadores */}
          <div className="card mb-4">
            <h3 className="font-black mb-4">📊 Indicadores de Monitoramento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {plano.indicadores.map((ind, i) => (
                <div key={i} className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "#f9fafb", border: "1px solid #e8e8e8" }}>
                  <span style={{ color: "#006635" }} className="shrink-0">✓</span>
                  <p className="text-sm">{ind}</p>
                </div>
              ))}
            </div>
          </div>

          {/* NR-1 */}
          <div className="card" style={{ background: "#e8f5ee", border: "1px solid #006635" + "40" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚖️</span>
              <h3 className="font-black" style={{ color: "#006635" }}>Conformidade NR-1</h3>
            </div>
            <p className="text-sm" style={{ color: "#005028" }}>{plano.acoesMedidaLegislativa}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs mt-10 pt-6" style={{ borderTop: "1px solid #e8e8e8", color: "#9f9f9f" }}>
          Relatório de Avaliação NR-1 · Gerado automaticamente por IA · Conexão Abrasel
          · {new Date().getFullYear()}
        </div>
      </div>
    </main>
  )
}
