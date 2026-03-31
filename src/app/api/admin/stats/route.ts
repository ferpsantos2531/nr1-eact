import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
        empresa: { select: { nome: true } },
      },
    }),
  ])

  // Distribuição por categoria (baseado no último relatório de cada empresa)
  const ultimosRelatorios = await prisma.relatorio.findMany({
    distinct: ["empresaId"],
    orderBy: { createdAt: "desc" },
    select: { categoria: true, mediaGeral: true, mediaDimensao1: true, mediaDimensao2: true, mediaDimensao3: true },
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
    empresa: r.empresa.nome,
    media: r.mediaGeral,
    categoria: r.categoria,
    data: r.createdAt,
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
  })
}
