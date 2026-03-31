import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const { senhaAtual, novaSenha } = await req.json()

  if (!senhaAtual || !novaSenha)
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 })
  if (novaSenha.length < 6)
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres" }, { status: 400 })

  const usuario = await prisma.usuario.findUnique({ where: { id: session.usuarioId } })
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

  const senhaCorreta = await bcrypt.compare(senhaAtual, usuario.senha)
  if (!senhaCorreta)
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 401 })

  const hash = await bcrypt.hash(novaSenha, 10)
  await prisma.usuario.update({ where: { id: session.usuarioId }, data: { senha: hash } })

  return NextResponse.json({ ok: true })
}
