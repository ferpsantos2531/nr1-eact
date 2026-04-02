import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.usuarioId },
    select: { id: true, email: true, isAdmin: true, createdAt: true },
  })

  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

  return NextResponse.json(usuario)
}
