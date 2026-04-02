"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { QUESTOES, DIMENSOES, ESCALA } from "@/lib/questions"

type Respondente = {
  numero: number
  id: string
  createdAt: string
  respostas: number[]
}

type Empresa = {
  id: string
  nome: string
  cnpj: string | null
  tamanho: string | null
}

const ESCALA_LABEL: Record<number, string> = {
  1: "Nunca", 2: "Raramente", 3: "Às vezes", 4: "Frequentemente", 5: "Sempre",
}

const DIM_COLORS = [
  { bg: "#eff6ff", border: "#bfdbfe", header: "#1d4ed8", light: "#dbeafe" },
  { bg: "#f0fdf4", border: "#bbf7d0", header: "#15803d", light: "#dcfce7" },
  { bg: "#fdf4ff", border: "#e9d5ff", header: "#7e22ce", light: "#f3e8ff" },
]

function cellColor(val: number): { background: string; color: string } {
  if (val >= 4.5) return { background: "#fca5a5", color: "#7f1d1d" }
  if (val >= 3.7) return { background: "#fecaca", color: "#991b1b" }
  if (val >= 3.0) return { background: "#fed7aa", color: "#92400e" }
  if (val >= 2.3) return { background: "#fde68a", color: "#78350f" }
  if (val >= 1.5) return { background: "#bbf7d0", color: "#14532d" }
  return { background: "#86efac", color: "#14532d" }
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function fmt(n: number) { return n.toFixed(2) }

export default function RespostasPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [respostas, setRespostas] = useState<Respondente[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [tooltip, setTooltip] = useState<{ ri: number; qi: number } | null>(null)

  useEffect(() => {
    fetch(`/api/empresa/${id}/respostas`)
      .then(r => {
        if (r.status === 401) { router.push("/login"); return null }
        if (r.status === 403) { setErro("Acesso negado"); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        if (data.error) { setErro(data.error); return }
        setEmpresa(data.empresa)
        setRespostas(data.respostas)
      })
      .catch(() => setErro("Erro ao carregar dados"))
      .finally(() => setLoading(false))
  }, [id, router])

  // Médias por questão
  const mediasQ = QUESTOES.map((_, qi) => {
    const vals = respostas.map(r => r.respostas[qi]).filter(v => typeof v === "number")
    return vals.length ? avg(vals) : null
  })

  // Médias por dimensão
  const mediasDim = DIMENSOES.map(d => {
    const vals = respostas.flatMap(r => d.questoes.map(qi => r.respostas[qi])).filter(v => typeof v === "number")
    return vals.length ? avg(vals) : null
  })

  function exportCSV() {
    if (!empresa || !respostas.length) return

    const dataHoje = new Date().toLocaleDateString("pt-BR")
    const linhas: string[][] = []

    // Cabeçalho informativo
    linhas.push([`# Relatório de Respostas Individuais — ${empresa.nome}`])
    linhas.push([`# Exportado em: ${dataHoje}`])
    linhas.push([`# Total de respondentes: ${respostas.length}`])
    if (empresa.cnpj) linhas.push([`# CNPJ: ${empresa.cnpj}`])
    linhas.push([])

    // Cabeçalho de colunas
    const cabecalho = [
      "Respondente",
      "Data/Hora",
      ...QUESTOES.map((q, i) => `Q${i + 1} – ${q}`),
      "Média Org. Trabalho",
      "Média Condições",
      "Média Rel. Socioprofissionais",
      "Média Geral",
    ]
    linhas.push(cabecalho)

    // Linhas por respondente
    respostas.forEach(r => {
      const dataFmt = new Date(r.createdAt).toLocaleString("pt-BR")
      const mediaOrg = avg(DIMENSOES[0].questoes.map(qi => r.respostas[qi]))
      const mediaCond = avg(DIMENSOES[1].questoes.map(qi => r.respostas[qi]))
      const mediaRel = avg(DIMENSOES[2].questoes.map(qi => r.respostas[qi]))
      const mediaGeral = avg(r.respostas)
      linhas.push([
        String(r.numero),
        dataFmt,
        ...r.respostas.map(String),
        fmt(mediaOrg),
        fmt(mediaCond),
        fmt(mediaRel),
        fmt(mediaGeral),
      ])
    })

    // Linha de médias
    if (respostas.length > 1) {
      linhas.push([
        "MÉDIA GERAL",
        "—",
        ...mediasQ.map(m => m !== null ? fmt(m) : "—"),
        mediasDim[0] !== null ? fmt(mediasDim[0]) : "—",
        mediasDim[1] !== null ? fmt(mediasDim[1]) : "—",
        mediasDim[2] !== null ? fmt(mediasDim[2]) : "—",
        mediasQ.filter(m => m !== null).length
          ? fmt(avg(mediasQ.filter(m => m !== null) as number[]))
          : "—",
      ])
    }

    // Legenda
    linhas.push([])
    linhas.push(["# ESCALA DE RESPOSTAS:"])
    ESCALA.forEach(e => linhas.push([`# ${e.valor} = ${e.label}`]))
    linhas.push(["# Referência: < 2,3 = Satisfatório | 2,3–3,69 = Crítico | ≥ 3,7 = Grave"])

    const csv = linhas
      .map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `respostas_${empresa.nome.replace(/\s+/g, "_")}_${dataHoje.replace(/\//g, "-")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-t-transparent rounded-full"
        style={{ borderColor: "#006635", borderTopColor: "transparent" }} />
    </div>
  )

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="mb-4" style={{ color: "#dc2626" }}>{erro}</p>
        <button onClick={() => router.back()} className="btn-green">Voltar</button>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen" style={{ background: "#f9fafb" }}>
      {/* Header */}
      <header style={{ background: "#006635" }} className="px-6 py-3">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <Image src="/abrasel-logo.svg" alt="Abrasel" width={110} height={22}
            style={{ filter: "brightness(0) invert(1)" }} />
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()}
              className="text-green-100 text-sm hover:text-white">
              ← Voltar
            </button>
            <button onClick={exportCSV} disabled={!respostas.length}
              className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar CSV
            </button>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 max-w-full">
        {/* Título */}
        <div className="mb-6">
          <div className="title-line" />
          <p className="text-sm mb-1" style={{ color: "#505050" }}>Respostas Individuais</p>
          <h1 className="text-2xl font-black mb-1">{empresa?.nome}</h1>
          <p className="text-sm" style={{ color: "#9f9f9f" }}>
            {respostas.length} respondente{respostas.length !== 1 ? "s" : ""}
            {empresa?.cnpj && ` · CNPJ: ${empresa.cnpj}`}
          </p>
        </div>

        {respostas.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-lg font-semibold mb-2" style={{ color: "#505050" }}>Nenhuma resposta registrada</p>
            <p className="text-sm" style={{ color: "#9f9f9f" }}>Este restaurante ainda não recebeu respostas ao questionário.</p>
          </div>
        ) : (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="card text-center py-4">
                <div className="text-3xl font-black" style={{ color: "#006635" }}>{respostas.length}</div>
                <div className="text-xs mt-1" style={{ color: "#9f9f9f" }}>Respondentes</div>
              </div>
              {DIMENSOES.map((d, i) => {
                const m = mediasDim[i]
                const col = m === null ? "#9f9f9f" : m >= 3.7 ? "#dc2626" : m >= 2.3 ? "#d97706" : "#006635"
                return (
                  <div key={i} className="card text-center py-4">
                    <div className="text-3xl font-black" style={{ color: col }}>
                      {m !== null ? fmt(m) : "—"}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "#9f9f9f" }}>{d.nome.split(" ").slice(0, 2).join(" ")}</div>
                  </div>
                )
              })}
            </div>

            {/* Legenda de cores */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <span className="text-xs font-semibold" style={{ color: "#505050" }}>Legenda:</span>
              {[
                { label: "Satisfatório (1–2,2)", bg: "#bbf7d0", cor: "#14532d" },
                { label: "Crítico (2,3–3,6)", bg: "#fde68a", cor: "#78350f" },
                { label: "Grave (3,7–5)", bg: "#fecaca", cor: "#991b1b" },
              ].map(l => (
                <span key={l.label} className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: l.bg, color: l.cor }}>
                  {l.label}
                </span>
              ))}
            </div>

            {/* Tabela principal */}
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <table className="w-full text-xs border-collapse" style={{ minWidth: "900px" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                    {/* Linha de dimensões */}
                    <tr>
                      <th rowSpan={2}
                        className="text-left px-3 py-2 font-semibold border-b border-r"
                        style={{
                          background: "#1a1a1a", color: "#fff", minWidth: "100px",
                          position: "sticky", left: 0, zIndex: 20,
                          borderColor: "#333"
                        }}>
                        Respondente
                      </th>
                      <th rowSpan={2}
                        className="text-left px-3 py-2 font-semibold border-b border-r"
                        style={{
                          background: "#1a1a1a", color: "#fff", minWidth: "80px",
                          position: "sticky", left: "100px", zIndex: 20,
                          borderColor: "#333"
                        }}>
                        Data
                      </th>
                      {DIMENSOES.map((d, di) => (
                        <th key={di} colSpan={d.questoes.length}
                          className="text-center px-2 py-2 font-bold border-b border-r text-xs"
                          style={{
                            background: DIM_COLORS[di].header,
                            color: "#fff",
                            borderColor: DIM_COLORS[di].border,
                          }}>
                          {d.nome} (Q{d.questoes[0] + 1}–Q{d.questoes[d.questoes.length - 1] + 1})
                        </th>
                      ))}
                      <th rowSpan={2}
                        className="text-center px-2 py-2 font-bold border-b"
                        style={{ background: "#374151", color: "#fff", minWidth: "60px" }}>
                        Média Geral
                      </th>
                    </tr>
                    {/* Linha de questões */}
                    <tr>
                      {QUESTOES.map((q, qi) => {
                        const di = DIMENSOES.findIndex(d => d.questoes.includes(qi))
                        const isLast = di >= 0 && DIMENSOES[di].questoes[DIMENSOES[di].questoes.length - 1] === qi
                        return (
                          <th key={qi}
                            className="text-center px-1 py-2 font-semibold border-b"
                            title={q}
                            style={{
                              background: DIM_COLORS[di]?.light ?? "#f9fafb",
                              color: DIM_COLORS[di]?.header ?? "#1a1a1a",
                              minWidth: "42px",
                              maxWidth: "42px",
                              borderRight: isLast ? `2px solid ${DIM_COLORS[di]?.header}` : "1px solid #e8e8e8",
                              cursor: "help",
                            }}>
                            Q{qi + 1}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {respostas.map((r, ri) => {
                      const mediaGeral = avg(r.respostas)
                      const cor = cellColor(mediaGeral)
                      const isEven = ri % 2 === 0
                      return (
                        <tr key={r.id} style={{ background: isEven ? "#fff" : "#f9fafb" }}>
                          {/* Nº respondente — sticky */}
                          <td className="px-3 py-2 font-semibold border-r border-b text-center"
                            style={{
                              position: "sticky", left: 0, zIndex: 5,
                              background: isEven ? "#fff" : "#f9fafb",
                              color: "#006635", borderColor: "#e8e8e8",
                              minWidth: "100px",
                            }}>
                            #{r.numero}
                          </td>
                          {/* Data — sticky */}
                          <td className="px-3 py-2 border-r border-b"
                            style={{
                              position: "sticky", left: "100px", zIndex: 5,
                              background: isEven ? "#fff" : "#f9fafb",
                              color: "#9f9f9f", borderColor: "#e8e8e8",
                              minWidth: "80px",
                            }}>
                            {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          {/* Respostas */}
                          {r.respostas.map((val, qi) => {
                            const di = DIMENSOES.findIndex(d => d.questoes.includes(qi))
                            const isLast = di >= 0 && DIMENSOES[di].questoes[DIMENSOES[di].questoes.length - 1] === qi
                            const style = cellColor(val)
                            const isHover = tooltip?.ri === ri && tooltip?.qi === qi
                            return (
                              <td key={qi}
                                className="text-center border-b font-semibold"
                                style={{
                                  ...style,
                                  borderRight: isLast
                                    ? `2px solid ${DIM_COLORS[di]?.header}`
                                    : "1px solid rgba(0,0,0,0.06)",
                                  borderBottom: "1px solid #e8e8e8",
                                  padding: "6px 4px",
                                  minWidth: "42px",
                                  cursor: "default",
                                  position: "relative",
                                }}
                                title={`Q${qi + 1}: ${ESCALA_LABEL[val] ?? val}\n${QUESTOES[qi]}`}
                                onMouseEnter={() => setTooltip({ ri, qi })}
                                onMouseLeave={() => setTooltip(null)}>
                                {val}
                              </td>
                            )
                          })}
                          {/* Média geral */}
                          <td className="text-center font-black border-b px-2"
                            style={{
                              ...cor,
                              borderColor: "#e8e8e8",
                              fontSize: "11px",
                            }}>
                            {fmt(mediaGeral)}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Linha de médias */}
                    {respostas.length > 1 && (
                      <tr style={{ borderTop: "2px solid #1a1a1a" }}>
                        <td className="px-3 py-2 font-black border-r text-xs"
                          style={{
                            position: "sticky", left: 0, zIndex: 5,
                            background: "#1a1a1a", color: "#fff",
                            borderColor: "#333",
                          }}>
                          MÉDIA
                        </td>
                        <td className="px-3 py-2 border-r text-xs"
                          style={{
                            position: "sticky", left: "100px", zIndex: 5,
                            background: "#1a1a1a", color: "#9f9f9f",
                            borderColor: "#333",
                          }}>
                          {respostas.length} resp.
                        </td>
                        {mediasQ.map((m, qi) => {
                          const di = DIMENSOES.findIndex(d => d.questoes.includes(qi))
                          const isLast = di >= 0 && DIMENSOES[di].questoes[DIMENSOES[di].questoes.length - 1] === qi
                          const style = m !== null ? cellColor(m) : { background: "#374151", color: "#fff" }
                          return (
                            <td key={qi}
                              className="text-center font-black"
                              style={{
                                ...style,
                                borderRight: isLast
                                  ? `2px solid ${DIM_COLORS[di]?.header}`
                                  : "1px solid rgba(0,0,0,0.1)",
                                padding: "6px 4px",
                                fontSize: "10px",
                              }}>
                              {m !== null ? fmt(m) : "—"}
                            </td>
                          )
                        })}
                        <td className="text-center font-black"
                          style={{
                            ...cellColor(avg(mediasQ.filter(m => m !== null) as number[])),
                            fontSize: "11px", padding: "6px 8px",
                          }}>
                          {fmt(avg(mediasQ.filter(m => m !== null) as number[]))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detalhe por dimensão */}
            <div className="mt-8 mb-2">
              <h2 className="font-black text-lg mb-4">Detalhamento por Questão</h2>
              <div className="grid grid-cols-1 gap-4">
                {DIMENSOES.map((d, di) => (
                  <div key={di} className="card p-0 overflow-hidden">
                    <div className="px-5 py-3 font-bold text-sm"
                      style={{ background: DIM_COLORS[di].header, color: "#fff" }}>
                      {d.nome}
                      {mediasDim[di] !== null && (
                        <span className="ml-2 text-white/80 font-normal">
                          — Média: {fmt(mediasDim[di]!)}
                        </span>
                      )}
                    </div>
                    <div className="divide-y" style={{ borderColor: "#e8e8e8" }}>
                      {d.questoes.map(qi => {
                        const m = mediasQ[qi]
                        const cor = m !== null ? cellColor(m) : { background: "#fff", color: "#9f9f9f" }
                        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                        respostas.forEach(r => { dist[r.respostas[qi]] = (dist[r.respostas[qi]] ?? 0) + 1 })
                        return (
                          <div key={qi} className="px-5 py-3 flex items-center gap-4">
                            <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                              style={{ background: DIM_COLORS[di].light, color: DIM_COLORS[di].header }}>
                              Q{qi + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium mb-1 leading-snug" style={{ color: "#1a1a1a" }}>
                                {QUESTOES[qi]}
                              </p>
                              {/* Distribuição mini */}
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(v => {
                                  const count = dist[v] ?? 0
                                  const pct = respostas.length ? (count / respostas.length) * 100 : 0
                                  const sc = cellColor(v)
                                  return (
                                    <div key={v} className="flex flex-col items-center text-center"
                                      style={{ minWidth: "36px" }}
                                      title={`${ESCALA_LABEL[v]}: ${count} (${pct.toFixed(0)}%)`}>
                                      <div className="w-full rounded text-xs font-bold px-1 py-0.5 mb-0.5"
                                        style={{ ...sc, opacity: count === 0 ? 0.3 : 1 }}>
                                        {count}
                                      </div>
                                      <span className="text-xs" style={{ color: "#9f9f9f" }}>{v}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="shrink-0 text-center">
                              <div className="text-xl font-black" style={cor}>{m !== null ? fmt(m) : "—"}</div>
                              <div className="text-xs" style={{ color: "#9f9f9f" }}>média</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
