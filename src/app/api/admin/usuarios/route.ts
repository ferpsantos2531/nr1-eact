import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const usuarios = await prisma.usuario.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      empresas: {
        select: {
          id: true,
          nome: true,
          createdAt: true,
          _count: { select: { respostas: true } },
          relatorios: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { mediaGeral: true, categoria: true, createdAt: true },
          },
        },
      },
    },
  })

  return NextResponse.json({
    usuarios: usuarios.map(u => ({
      id: u.id,
      email: u.email,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
      totalEmpresas: u.empresas.length,
      totalRespostas: u.empresas.reduce((acc, e) => acc + e._count.respostas, 0),
      empresas: u.empresas.map(e => ({
        id: e.id,
        nome: e.nome,
        totalRespostas: e._count.respostas,
        ultimoRelatorio: e.relatorios[0] ?? null,
      })),
    })),
  })
}
