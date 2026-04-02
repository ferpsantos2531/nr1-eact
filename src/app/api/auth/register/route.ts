import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_NAME } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
  try {
    const { nomeEmpresa, email, senha, cnpj, telefone, tamanho, razaoSocial, cidade, estado } = await req.json()

    if (!nomeEmpresa || !email || !senha) {
      return NextResponse.json({ error: "Nome da empresa, email e senha são obrigatórios" }, { status: 400 })
    }
    if (senha.length < 6) {
      return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    const existing = await prisma.usuario.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "Este email já está cadastrado. Faça login.", redirect: "/login" },
        { status: 409 }
      )
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    const usuario = await prisma.usuario.create({
      data: { email, senha: senhaHash },
    })

    const empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        cnpj: cnpj || null,
        telefone: telefone || null,
        tamanho: tamanho || null,
        razaoSocial: razaoSocial || null,
        cidade: cidade || null,
        estado: estado || null,
        surveyToken: uuidv4(),
        usuarioId: usuario.id,
      },
    })

    const token = await signToken({ usuarioId: usuario.id })

    const res = NextResponse.json({ empresaId: empresa.id, surveyToken: empresa.surveyToken })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    })
    return res
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno ao cadastrar" }, { status: 500 })
  }
}
