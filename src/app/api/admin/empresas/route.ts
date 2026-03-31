import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usuario: { select: { email: true } },
      _count: { select: { respostas: true } },
      relatorios: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, mediaGeral: true, mediaDimensao1: true, mediaDimensao2: true, mediaDimensao3: true, categoria: true, createdAt: true },
      },
    },
  })

  return NextResponse.json({
    empresas: empresas.map(e => ({
      id: e.id,
      nome: e.nome,
      cnpj: e.cnpj,
      tamanho: e.tamanho,
      usuarioEmail: e.usuario.email,
      createdAt: e.createdAt,
      totalRespostas: e._count.respostas,
      ultimoRelatorio: e.relatorios[0] ?? null,
    })),
  })
}
