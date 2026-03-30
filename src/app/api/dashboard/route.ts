import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const empresas = await prisma.empresa.findMany({
    where: { usuarioId: session.usuarioId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { respostas: true } },
      relatorios: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { mediaGeral: true, categoria: true, createdAt: true },
      },
    },
  })

  return NextResponse.json({
    empresas: empresas.map(e => ({
      id: e.id,
      nome: e.nome,
      tamanho: e.tamanho,
      surveyToken: e.surveyToken,
      createdAt: e.createdAt,
      totalRespostas: e._count.respostas,
      ultimoRelatorio: e.relatorios[0] ?? null,
    })),
  })
}
