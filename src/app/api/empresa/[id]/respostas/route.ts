import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { id } = await params

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: { id: true, nome: true, cnpj: true, tamanho: true, usuarioId: true },
    })

    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

    // Apenas o dono ou admin podem ver as respostas
    if (empresa.usuarioId !== session.usuarioId && !session.isAdmin) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
    }

    const respostas = await prisma.resposta.findMany({
      where: { empresaId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, respostas: true, createdAt: true },
    })

    const parsed = respostas.map((r, i) => ({
      numero: i + 1,
      id: r.id,
      createdAt: r.createdAt,
      respostas: JSON.parse(r.respostas) as number[],
    }))

    return NextResponse.json({ empresa, respostas: parsed })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
