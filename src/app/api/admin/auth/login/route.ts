import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth"

/**
 * POST /nr1/api/admin/auth/login
 *
 * Login exclusivo para administradores da plataforma NR-1.
 * Usa a tabela Admin (email + senha locais) — completamente isolado do SSO/Conexão.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios" },
        { status: 400 }
      )
    }

    const admin = await prisma.admin.findUnique({ where: { email } })

    // Mensagem genérica — não revela se o e-mail existe
    const erroGenerico = NextResponse.json(
      { error: "Credenciais inválidas" },
      { status: 401 }
    )

    if (!admin) return erroGenerico

    const senhaCorreta = await bcrypt.compare(senha, admin.senha)
    if (!senhaCorreta) return erroGenerico

    const token = await signToken({ usuarioId: admin.id, isAdmin: true })

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 8, // 8 horas
    })

    return res
  } catch (error) {
    console.error("[admin/auth/login]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
