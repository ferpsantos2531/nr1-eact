import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QUESTOES, DIMENSOES } from "@/lib/questions"

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const [
    totalUsuarios,
    totalEmpresas,
    totalRespostas,
    totalRelatorios,
    relatorios,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.empresa.count(),
    prisma.resposta.count(),
    prisma.relatorio.count(),
    prisma.relatorio.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        mediaGeral: true,
        mediaDimensao1: true,
        mediaDimensao2: true,
        mediaDimensao3: true,
        categoria: true,
        createdAt: true,
        empresaId: true,   // nome vem do Conexão — usamos o ID como label
      },
    }),
  ])

  // Distribuição por categoria (baseado no último relatório de cada empresa)
  const ultimosRelatorios = await prisma.relatorio.findMany({
    distinct: ["empresaId"],
    orderBy: { createdAt: "desc" },
    select: {
      categoria: true,
      mediaGeral: true,
      mediaDimensao1: true,
      mediaDimensao2: true,
      mediaDimensao3: true,
      empresaId: true,   // nome vem do Conexão
    },
  })

  const distribuicao = {
    grave: ultimosRelatorios.filter(r => r.categoria === "grave").length,
    critico: ultimosRelatorios.filter(r => r.categoria === "critico").length,
    satisfatorio: ultimosRelatorios.filter(r => r.categoria === "satisfatorio").length,
  }

  const mediasGerais = ultimosRelatorios.map(r => r.mediaGeral)
  const mediaPlataforma = mediasGerais.length
    ? Number((mediasGerais.reduce((a, b) => a + b, 0) / mediasGerais.length).toFixed(2))
    : null

  const mediasDim1 = ultimosRelatorios.map(r => r.mediaDimensao1)
  const mediasDim2 = ultimosRelatorios.map(r => r.mediaDimensao2)
  const mediasDim3 = ultimosRelatorios.map(r => r.mediaDimensao3)

  const avg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null

  // Empresas sem nenhuma resposta
  const empresasSemResposta = await prisma.empresa.count({
    where: { respostas: { none: {} } },
  })

  // Últimos 8 relatórios para linha do tempo
  const ultimosRelatoriosTimeline = relatorios.slice(0, 8).map(r => ({
    empresa: `Empresa ${r.empresaId.slice(0, 8)}`,  // nome vem do Conexão
    media: r.mediaGeral,
    categoria: r.categoria,
    data: r.createdAt,
  }))

  // ── NEW: Top Risco (top 5 highest mediaGeral = most problematic) ──
  const topRisco = [...ultimosRelatorios]
    .sort((a, b) => b.mediaGeral - a.mediaGeral)
    .slice(0, 5)
    .map(r => ({ nome: `Empresa ${r.empresaId.slice(0, 8)}`, media: r.mediaGeral, categoria: r.categoria }))

  // ── NEW: Top Saudáveis (top 5 lowest mediaGeral = healthiest) ──
  const topSaudaveis = [...ultimosRelatorios]
    .sort((a, b) => a.mediaGeral - b.mediaGeral)
    .slice(0, 5)
    .map(r => ({ nome: `Empresa ${r.empresaId.slice(0, 8)}`, media: r.mediaGeral, categoria: r.categoria }))

  // ── NEW: Questões Críticas — per-question averages across all Respostas ──
  const todasRespostas = await prisma.resposta.findMany({
    select: { respostas: true },
  })

  const questaoSomas = new Array(31).fill(0)
  const questaoContagens = new Array(31).fill(0)

  for (const r of todasRespostas) {
    try {
      const vals: number[] = typeof r.respostas === "string"
        ? JSON.parse(r.respostas)
        : (r.respostas as number[])
      for (let i = 0; i < 31; i++) {
        if (vals[i] !== undefined && vals[i] !== null) {
          questaoSomas[i] += vals[i]
          questaoContagens[i] += 1
        }
      }
    } catch {
      // skip malformed
    }
  }

  const getDimensaoNome = (idx: number): string => {
    for (const d of DIMENSOES) {
      if (d.questoes.includes(idx)) return d.nome
    }
    return "Desconhecida"
  }

  const questoesCriticas = QUESTOES.map((questao, i) => ({
    questao,
    media: questaoContagens[i] > 0
      ? Number((questaoSomas[i] / questaoContagens[i]).toFixed(2))
      : null,
    dimensao: getDimensaoNome(i),
  })).sort((a, b) => {
    if (a.media === null && b.media === null) return 0
    if (a.media === null) return 1
    if (b.media === null) return -1
    return b.media - a.media
  })

  // ── NEW: Tendência Mensal — last 6 months report counts + avg mediaGeral ──
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const relatoriosMes = await prisma.relatorio.findMany({
    where: { createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, mediaGeral: true },
    orderBy: { createdAt: "asc" },
  })

  const mesMap: Record<string, { count: number; soma: number }> = {}
  // Pre-populate last 6 months so missing months show 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    mesMap[key] = { count: 0, soma: 0 }
  }

  for (const r of relatoriosMes) {
    const d = new Date(r.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (mesMap[key]) {
      mesMap[key].count += 1
      mesMap[key].soma += r.mediaGeral
    }
  }

  const tendenciaMensal = Object.entries(mesMap).map(([mes, { count, soma }]) => ({
    mes,
    count,
    avgMediaGeral: count > 0 ? Number((soma / count).toFixed(2)) : null,
  }))

  return NextResponse.json({
    totalUsuarios,
    totalEmpresas,
    totalRespostas,
    totalRelatorios,
    empresasComRelatorio: ultimosRelatorios.length,
    empresasSemResposta,
    mediaPlataforma,
    distribuicao,
    mediasPorDimensao: {
      organizacao: avg(mediasDim1),
      condicoes: avg(mediasDim2),
      relacoes: avg(mediasDim3),
    },
    ultimosRelatorios: ultimosRelatoriosTimeline,
    topRisco,
    topSaudaveis,
    questoesCriticas,
    tendenciaMensal,
  })
}
