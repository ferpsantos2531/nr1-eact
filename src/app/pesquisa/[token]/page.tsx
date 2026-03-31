"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { QUESTOES, DIMENSOES } from "@/lib/questions"

type EmpresaInfo = { id: string; nome: string; setor: string | null }

const ESCALA = [
  { valor: 1, label: "Nunca" },
  { valor: 2, label: "Raramente" },
  { valor: 3, label: "Às vezes" },
  { valor: 4, label: "Frequentemente" },
  { valor: 5, label: "Sempre" },
]


export default function PesquisaPage() {
  const { token } = useParams<{ token: string }>()
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [respostas, setRespostas] = useState<(number | null)[]>(Array(31).fill(null))
  const [dimAtual, setDimAtual] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroEnvio, setErroEnvio] = useState("")

  useEffect(() => {
    fetch(`/api/pesquisa?token=${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) setErro(data.error); else setEmpresa(data) })
      .catch(() => setErro("Erro ao carregar pesquisa"))
      .finally(() => setLoading(false))
  }, [token])

  const dim = DIMENSOES[dimAtual]
  const questoesDaDim = dim.questoes
  const respondidosDaDim = questoesDaDim.filter(qi => respostas[qi] !== null).length
  const dimCompleta = respondidosDaDim === questoesDaDim.length
  const totalRespondidas = respostas.filter(r => r !== null).length
  const progressoGeral = Math.round((totalRespondidas / 31) * 100)
  const isUltimaDim = dimAtual === DIMENSOES.length - 1
  const todasRespondidas = totalRespondidas === 31

  function setResposta(qi: number, val: number) {
    const novas = [...respostas]; novas[qi] = val; setRespostas(novas)
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [dimAtual])

  function avancar() {
    if (!dimCompleta) return
    setDimAtual(d => d + 1)
  }
  function voltar() {
    setDimAtual(d => d - 1)
  }

  async function handleSubmit() {
    if (!todasRespondidas) return
    setEnviando(true); setErroEnvio("")
    try {
      const res = await fetch("/api/pesquisa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, respostas }),
      })
      const data = await res.json()
      if (!res.ok) { setErroEnvio(data.error || "Erro ao enviar"); return }
      setEnviado(true)
    } catch { setErroEnvio("Erro de conexão. Tente novamente.") }
    finally { setEnviando(false) }
  }

  /* ─── Loading ───────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  /* ─── Erro ───────────────────────────────────────── */
  if (erro) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-xl font-black mb-2">Link inválido</p>
        <p style={{ color: "#505050" }}>{erro}</p>
      </div>
    </div>
  )

  /* ─── Enviado ─────────────────────────────────────── */
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f9fafb" }}>
      <div className="text-center max-w-sm card">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "#e8f5ee" }}>
          <svg className="w-7 h-7" style={{ color: "#006635" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-black mb-2">Obrigado!</h1>
        <p className="text-sm" style={{ color: "#505050" }}>
          Suas respostas foram registradas com sucesso de forma <strong>anônima</strong>.
        </p>
        <p className="text-xs mt-3" style={{ color: "#9f9f9f" }}>Você pode fechar esta página.</p>
      </div>
    </div>
  )

  /* ─── Principal ───────────────────────────────────── */
  return (
    <main className="min-h-screen pb-28" style={{ background: "#f9fafb" }}>

      {/* Header com progresso */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm" style={{ borderColor: "#e8e8e8" }}>
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs" style={{ color: "#9f9f9f" }}>{empresa?.nome}</p>
              <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>Avaliação NR-1 · Abrasel</p>
            </div>
            <span className="text-sm font-black" style={{ color: "#006635" }}>
              {totalRespondidas}/31
            </span>
          </div>
          <div className="w-full rounded-full h-1.5" style={{ background: "#f1f1f1" }}>
            <div className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progressoGeral}%`, background: "#006635" }} />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6">

        {/* Steps das dimensões */}
        <div className="flex gap-2 mb-6">
          {DIMENSOES.map((d, i) => {
            const completa = d.questoes.filter(qi => respostas[qi] !== null).length === d.questoes.length
            const ativa = i === dimAtual
            return (
              <button key={i}
                onClick={() => (i < dimAtual || completa) && setDimAtual(i)}
                className="flex-1 py-2 px-2 rounded-lg text-center transition-all text-xs font-semibold"
                style={{
                  background: ativa ? "#006635" : completa ? "#e8f5ee" : "#fff",
                  color: ativa ? "#fff" : completa ? "#006635" : "#9f9f9f",
                  border: `1.5px solid ${ativa ? "#006635" : completa ? "#006635" : "#e8e8e8"}`,
                  cursor: i <= dimAtual ? "pointer" : "default",
                }}>
                <div>{completa ? "✓" : `${i + 1}`}</div>
                <div className="hidden sm:block mt-0.5 truncate">{d.nome.split(" ")[0]}</div>
              </button>
            )
          })}
        </div>

        {/* Instrução */}
        <div className="mb-5 rounded-xl p-4" style={{ background: "#f0f7f3", border: "1px solid #c8e6d4" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#006635" }}>
            Como responder
          </p>
          <div className="flex gap-2">
            {ESCALA.map(e => (
              <div key={e.valor} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
                  style={{ background: "#006635", color: "#fff" }}>
                  {e.valor}
                </div>
                <span className="text-center leading-tight" style={{ fontSize: "10px", color: "#505050" }}>
                  {e.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Questões */}
        <div className="space-y-3">
          {questoesDaDim.map((qi) => {
            const resposta = respostas[qi]
            return (
              <div key={qi} className="card py-4">
                <p className="text-sm font-medium mb-3" style={{ color: "#1a1a1a" }}>
                  <span className="font-black mr-1.5" style={{ color: "#9f9f9f" }}>{qi + 1}.</span>
                  {QUESTOES[qi]}
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {ESCALA.map(op => {
                    const selecionado = resposta === op.valor
                    return (
                      <button key={op.valor} type="button"
                        onClick={() => setResposta(qi, op.valor)}
                        className="py-2.5 rounded-lg text-sm font-black transition-all duration-150"
                        style={{
                          background: selecionado ? "#006635" : "#f9fafb",
                          color: selecionado ? "#fff" : "#505050",
                          border: `1.5px solid ${selecionado ? "#006635" : "#e8e8e8"}`,
                        }}>
                        {op.valor}
                        <div className="text-xs font-normal hidden sm:block" style={{ color: selecionado ? "rgba(255,255,255,0.8)" : "#9f9f9f" }}>
                          {op.label}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-4"
        style={{ borderColor: "#e8e8e8" }}>
        <div className="max-w-xl mx-auto">
          {erroEnvio && (
            <p className="text-sm mb-2 text-center" style={{ color: "#dc2626" }}>{erroEnvio}</p>
          )}
          {!dimCompleta && (
            <p className="text-xs text-center mb-2" style={{ color: "#9f9f9f" }}>
              Responda todas as questões desta seção para continuar
            </p>
          )}
          <div className="flex gap-3">
            {dimAtual > 0 && (
              <button onClick={voltar} className="btn-outline py-3 px-5 text-sm">← Voltar</button>
            )}
            {isUltimaDim ? (
              <button onClick={handleSubmit} disabled={!todasRespondidas || enviando} className="btn-green flex-1 py-3">
                {enviando
                  ? <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Enviando...
                    </span>
                  : "Enviar respostas"}
              </button>
            ) : (
              <button onClick={avancar} disabled={!dimCompleta} className="btn-green flex-1 py-3">
                Próxima seção →
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
