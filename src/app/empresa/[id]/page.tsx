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
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState("")
  const [copied, setCopied] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState("")

  useEffect(() => {
    fetch(`/api/empresa?id=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErro(data.error); return }
        setEmpresa(data)
        setSurveyUrl(`${window.location.origin}/pesquisa/${data.surveyToken}`)
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
          <Image src="/abrasel-logo.svg" alt="Abrasel" width={110} height={34}
            style={{ filter: "brightness(0) invert(1)" }} />
          <button onClick={() => router.push("/dashboard")} className="text-green-100 text-sm hover:text-white">
            ← Minhas empresas
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
                <div className="text-4xl font-black mb-1" style={{ color: evolucao <= 0 ? "#006635" : "#dc2626" }}>
                  {evolucao <= 0 ? "↓" : "↑"} {Math.abs(evolucao).toFixed(2)}
                </div>
                <div className="text-sm" style={{ color: "#505050" }}>
                  {evolucao <= 0 ? "Melhora" : "Piora"} vs. anterior
                </div>
              </>
            ) : (
              <>
                <div className="text-4xl mb-1">📊</div>
                <div className="text-sm" style={{ color: "#505050" }}>Gere 2+ relatórios para ver evolução</div>
              </>
            )}
          </div>
        </div>

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

            {/* Gráfico de evolução simples */}
            {historico.length > 1 && (
              <div className="mb-6 p-4 rounded-lg" style={{ background: "#f9fafb", border: "1px solid #e8e8e8" }}>
                <p className="text-xs font-semibold mb-3" style={{ color: "#505050" }}>EVOLUÇÃO DA MÉDIA GERAL</p>
                <div className="flex items-end gap-2 h-20">
                  {[...historico].reverse().map((r, i) => {
                    const pct = (r.mediaGeral / 5) * 100
                    const color = r.mediaGeral >= 3.7 ? "#dc2626" : r.mediaGeral >= 2.3 ? "#d97706" : "#006635"
                    return (
                      <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-bold" style={{ color }}>{r.mediaGeral.toFixed(1)}</span>
                        <div className="w-full rounded-t-sm" style={{ height: `${Math.max(pct, 8)}%`, background: color, minHeight: 6 }} />
                        <span className="text-xs" style={{ color: "#9f9f9f" }}>
                          {new Date(r.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

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
