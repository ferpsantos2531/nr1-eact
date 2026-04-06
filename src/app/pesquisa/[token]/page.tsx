"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { QUESTOES, DIMENSOES } from "@/lib/questions"

type EmpresaInfo = { id: string; nome: string; setor: string | null }

const ESCALA = [
  { valor: 1, label: "Nunca" },
  { valor: 2, label: "Raramente" },
  { valor: 3, label: "Às vezes" },
  { valor: 4, label: "Frequente" },
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
  const [tentouAvancar, setTentouAvancar] = useState(false)
  const [retomando, setRetomando] = useState(false)

  // Refs para scroll automático por questão
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])

  /* ─── Carrega empresa ─────────────────────── */
  useEffect(() => {
    fetch(`/api/pesquisa?token=${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) setErro(data.error); else setEmpresa(data) })
      .catch(() => setErro("Erro ao carregar pesquisa"))
      .finally(() => setLoading(false))
  }, [token])

  /* ─── Rascunho localStorage ───────────────── */
  useEffect(() => {
    if (!token || loading || erro) return
    const saved = localStorage.getItem(`pesquisa_${token}`)
    if (saved) {
      try {
        const { respostas: r, dim } = JSON.parse(saved)
        const totalSalvas = r.filter((v: number | null) => v !== null).length
        if (totalSalvas > 0) {
          setRespostas(r)
          setDimAtual(dim ?? 0)
          setRetomando(true)
          setTimeout(() => setRetomando(false), 4000)
        }
      } catch { /* ignora */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loading])

  useEffect(() => {
    if (!token) return
    const total = respostas.filter(r => r !== null).length
    if (total > 0) {
      localStorage.setItem(`pesquisa_${token}`, JSON.stringify({ respostas, dim: dimAtual }))
    }
  }, [respostas, dimAtual, token])

  /* ─── Derivações ──────────────────────────── */
  const dim = DIMENSOES[dimAtual]
  const questoesDaDim = dim.questoes
  const respondidosDaDim = questoesDaDim.filter(qi => respostas[qi] !== null).length
  const dimCompleta = respondidosDaDim === questoesDaDim.length
  const totalRespondidas = respostas.filter(r => r !== null).length
  const progressoGeral = Math.round((totalRespondidas / 31) * 100)
  const isUltimaDim = dimAtual === DIMENSOES.length - 1
  const todasRespondidas = totalRespondidas === 31

  // Tempo estimado: ~18s por questão, arredondado para cima
  const questoesRestantes = 31 - totalRespondidas
  const minRestantes = Math.ceil((questoesRestantes * 18) / 60)

  /* ─── Resposta + auto-scroll ──────────────── */
  const setResposta = useCallback((qi: number, val: number) => {
    setRespostas(prev => {
      const novas = [...prev]
      novas[qi] = val
      // Auto-scroll para próxima sem resposta na dimensão atual
      const proximaNaoRespondida = DIMENSOES[dimAtual].questoes.find(q => q !== qi && novas[q] === null)
      if (proximaNaoRespondida !== undefined) {
        setTimeout(() => {
          questionRefs.current[proximaNaoRespondida]?.scrollIntoView({
            behavior: "smooth", block: "center",
          })
        }, 180)
      }
      return novas
    })
    setTentouAvancar(false)
  }, [dimAtual])

  /* ─── Teclado 1–5 ─────────────────────────── */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return
      const val = parseInt(e.key)
      if (val >= 1 && val <= 5) {
        const firstUnanswered = DIMENSOES[dimAtual].questoes.find(qi => respostas[qi] === null)
        if (firstUnanswered !== undefined) setResposta(firstUnanswered, val)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [dimAtual, respostas, setResposta])

  /* ─── Navegação ───────────────────────────── */
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    setTentouAvancar(false)
  }, [dimAtual])

  function avancar() {
    if (!dimCompleta) {
      setTentouAvancar(true)
      // Scroll até a primeira questão sem resposta
      const primeira = questoesDaDim.find(qi => respostas[qi] === null)
      if (primeira !== undefined) {
        setTimeout(() => {
          questionRefs.current[primeira]?.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 100)
      }
      return
    }
    setDimAtual(d => d + 1)
  }

  function voltar() { setDimAtual(d => d - 1) }

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
      localStorage.removeItem(`pesquisa_${token}`)
      setEnviado(true)
    } catch { setErroEnvio("Erro de conexão. Tente novamente.") }
    finally { setEnviando(false) }
  }

  /* ─── Loading ───────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  /* ─── Erro ───────────────────────────────────── */
  if (erro) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <p className="text-xl font-black mb-2">Link inválido</p>
        <p style={{ color: "#505050" }}>{erro}</p>
      </div>
    </div>
  )

  /* ─── Enviado ─────────────────────────────────── */
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f9fafb" }}>
      <div className="text-center max-w-sm card">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "#e8f5ee" }}>
          <svg className="w-8 h-8" style={{ color: "#006635" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-black mb-2">Obrigado!</h1>
        <p className="text-sm leading-relaxed" style={{ color: "#505050" }}>
          Suas respostas foram registradas com sucesso de forma <strong>anônima</strong>.
          Sua contribuição ajuda a melhorar o ambiente de trabalho.
        </p>
        <p className="text-xs mt-4" style={{ color: "#9f9f9f" }}>Você pode fechar esta página.</p>
      </div>
    </div>
  )

  /* ─── Principal ───────────────────────────────── */
  return (
    <main className="min-h-screen pb-32" style={{ background: "#f9fafb" }}>

      {/* Header sticky com progresso */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm" style={{ borderColor: "#e8e8e8" }}>
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-medium" style={{ color: "#9f9f9f" }}>{empresa?.nome}</p>
              <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>Avaliação NR-1 · Abrasel</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-black" style={{ color: "#006635" }}>
                {totalRespondidas}/31
              </span>
              {questoesRestantes > 0 && (
                <p className="text-xs" style={{ color: "#9f9f9f" }}>
                  ~{minRestantes} min restante{minRestantes !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          {/* Barra de progresso */}
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "#f1f1f1" }}>
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressoGeral}%`, background: "#006635" }} />
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-5">

        {/* Banner de retomada */}
        {retomando && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-sm"
            style={{ background: "#e8f5ee", border: "1px solid #a7f3d0", color: "#065f46" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Progresso restaurado — continuando de onde você parou.
          </div>
        )}

        {/* Steps das dimensões */}
        <div className="flex gap-2 mb-5">
          {DIMENSOES.map((d, i) => {
            const completa = d.questoes.every(qi => respostas[qi] !== null)
            const ativa = i === dimAtual
            const acessivel = i <= dimAtual || completa
            return (
              <button key={i}
                onClick={() => acessivel && setDimAtual(i)}
                className="flex-1 py-2 px-1 rounded-xl text-center transition-all font-semibold"
                style={{
                  background: ativa ? "#006635" : completa ? "#e8f5ee" : "#fff",
                  color: ativa ? "#fff" : completa ? "#006635" : "#9f9f9f",
                  border: `1.5px solid ${ativa ? "#006635" : completa ? "#86efac" : "#e8e8e8"}`,
                  cursor: acessivel ? "pointer" : "default",
                  opacity: !acessivel ? 0.5 : 1,
                  fontSize: "0.65rem",
                }}>
                <div className="text-sm mb-0.5 leading-none">{completa ? "✓" : `${i + 1}`}</div>
                <div className="truncate leading-tight">{d.nome.split(" ")[0]}</div>
              </button>
            )
          })}
        </div>

        {/* Instrução da seção */}
        <div className="mb-4 px-1">
          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#006635" }}>
            Seção {dimAtual + 1} de {DIMENSOES.length} — {dim.nome}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
            Marque com que frequência cada situação ocorre no seu trabalho.{" "}
            <span className="font-semibold" style={{ color: "#1a1a1a" }}>
              1 = Nunca · 5 = Sempre
            </span>
          </p>
        </div>

        {/* Aviso de questões não respondidas */}
        {tentouAvancar && !dimCompleta && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm"
            style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Responda todas as {questoesDaDim.length} questões desta seção para continuar.
          </div>
        )}

        {/* Questões */}
        <div className="space-y-3">
          {questoesDaDim.map((qi, posNaDim) => {
            const resposta = respostas[qi]
            const naoRespondida = tentouAvancar && resposta === null
            return (
              <div
                key={qi}
                ref={el => { questionRefs.current[qi] = el }}
                className="card py-4 transition-all duration-200"
                style={{
                  border: naoRespondida
                    ? "2px solid #fca5a5"
                    : resposta !== null
                    ? "1.5px solid #86efac"
                    : "1px solid #e8e8e8",
                  background: resposta !== null ? "#fafffe" : "#fff",
                }}>
                {/* Número e texto */}
                <div className="flex items-start gap-2 mb-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                    style={{
                      background: resposta !== null ? "#006635" : naoRespondida ? "#fee2e2" : "#f1f1f1",
                      color: resposta !== null ? "#fff" : naoRespondida ? "#dc2626" : "#9f9f9f",
                    }}>
                    {posNaDim + 1}
                  </span>
                  <p className="text-sm font-medium leading-snug" style={{ color: "#1a1a1a" }}>
                    {QUESTOES[qi]}
                  </p>
                </div>

                {/* Legenda da escala */}
                <div className="grid grid-cols-5 gap-1.5 mb-1">
                  {ESCALA.map(op => (
                    <div key={op.valor} className="text-center leading-tight"
                      style={{ color: "#9f9f9f", fontSize: "0.6rem" }}>
                      {op.label}
                    </div>
                  ))}
                </div>

                {/* Escala 1–5 */}
                <div className="grid grid-cols-5 gap-1.5">
                  {ESCALA.map(op => {
                    const selecionado = resposta === op.valor
                    return (
                      <button key={op.valor} type="button"
                        onClick={() => setResposta(qi, op.valor)}
                        className="py-3.5 rounded-xl transition-all duration-150 active:scale-95"
                        style={{
                          background: selecionado ? "#006635" : "#f9fafb",
                          color: selecionado ? "#fff" : "#505050",
                          border: `1.5px solid ${selecionado ? "#006635" : "#e8e8e8"}`,
                          boxShadow: selecionado ? "0 2px 8px rgba(0,102,53,0.25)" : "none",
                        }}>
                        <div className="text-lg font-black leading-none">{op.valor}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Dica de teclado — só desktop */}
        <p className="hidden sm:block text-center text-xs mt-4 mb-2" style={{ color: "#c8c8c8" }}>
          Dica: use as teclas <kbd className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: "#f1f1f1", color: "#505050" }}>1</kbd> a{" "}
          <kbd className="px-1.5 py-0.5 rounded text-xs font-mono"
            style={{ background: "#f1f1f1", color: "#505050" }}>5</kbd> para responder mais rápido
        </p>
      </div>

      {/* Rodapé fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t"
        style={{ borderColor: "#e8e8e8", boxShadow: "0 -4px 16px rgba(0,0,0,0.06)" }}>
        <div className="max-w-xl mx-auto px-4 py-4">
          {erroEnvio && (
            <p className="text-sm mb-2 text-center" style={{ color: "#dc2626" }}>{erroEnvio}</p>
          )}

          {/* Mini-progresso da seção atual */}
          <div className="flex items-center justify-between mb-3 gap-3">
            <span className="text-xs shrink-0" style={{ color: "#9f9f9f" }}>
              {respondidosDaDim}/{questoesDaDim.length} nesta seção
            </span>
            <div className="flex gap-1 flex-wrap justify-end">
              {questoesDaDim.map(qi => (
                <div key={qi} className="w-2 h-2 rounded-full transition-all shrink-0"
                  style={{ background: respostas[qi] !== null ? "#006635" : "#e8e8e8" }} />
              ))}
            </div>
          </div>

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
                  : "Enviar respostas ✓"}
              </button>
            ) : (
              <button onClick={avancar} className="btn-green flex-1 py-3"
                style={{ opacity: dimCompleta ? 1 : 0.85 }}>
                {dimCompleta ? "Próxima seção →" : `Responda todas para continuar (${respondidosDaDim}/${questoesDaDim.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
