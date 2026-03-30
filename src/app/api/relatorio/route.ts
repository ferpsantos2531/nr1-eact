import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calcularResultado, calcularMedia } from "@/lib/scoring"
import { gerarPlanoAcaoIA } from "@/lib/ai"

// POST — sempre cria um novo relatório (histórico)
export async function POST(req: NextRequest) {
  try {
    const { empresaId } = await req.json()

    if (!empresaId) {
      return NextResponse.json({ error: "empresaId é obrigatório" }, { status: 400 })
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } })
    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const respostasDB = await prisma.resposta.findMany({ where: { empresaId } })
    if (respostasDB.length < 3) {
      return NextResponse.json(
        { error: "São necessárias pelo menos 3 respostas para gerar o relatório" },
        { status: 400 }
      )
    }

    const todasRespostas = respostasDB.map(r => JSON.parse(r.respostas) as number[])
    const resultado = calcularResultado(todasRespostas)

    const mediasPorQuestao = Array.from({ length: 31 }, (_, i) => {
      const valores = todasRespostas.map(r => r[i])
      return calcularMedia(valores)
    })

    const planoAcao = await gerarPlanoAcaoIA(resultado, empresa.nome, null, mediasPorQuestao)

    // Sempre cria um novo registro (histórico completo)
    const relatorio = await prisma.relatorio.create({
      data: {
        empresaId,
        totalRespostas: resultado.totalRespostas,
        mediaGeral: resultado.mediaGeral,
        mediaDimensao1: resultado.mediaDimensao1,
        mediaDimensao2: resultado.mediaDimensao2,
        mediaDimensao3: resultado.mediaDimensao3,
        categoria: resultado.categoria,
        planoAcaoIA: JSON.stringify(planoAcao),
      },
    })

    return NextResponse.json({ relatorioId: relatorio.id })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error("Erro ao gerar relatório:", msg)
    return NextResponse.json({ error: `Erro ao gerar relatório: ${msg}` }, { status: 500 })
  }
}

// GET — busca relatório por id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const empresaId = searchParams.get("empresaId")

  try {
    const relatorio = id
      ? await prisma.relatorio.findUnique({ where: { id }, include: { empresa: true } })
      : empresaId
        ? await prisma.relatorio.findFirst({
            where: { empresaId },
            orderBy: { createdAt: "desc" },
            include: { empresa: true },
          })
        : null

    if (!relatorio) {
      return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ ...relatorio, planoAcaoIA: JSON.parse(relatorio.planoAcaoIA) })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
