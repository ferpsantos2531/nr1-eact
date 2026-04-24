import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_NAME } from "@/lib/auth"

/**
 * POST /api/admin/auth/login
 *
 * Login exclusivo para administradores da plataforma NR-1.
 * Rejeita qualquer usuário sem isAdmin = true, mesmo com credenciais válidas.
 * Não faz parte do fluxo SSO — credenciais sempre locais.
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

    const usuario = await prisma.usuario.findUnique({ where: { email } })

    // Mensagem genérica para não revelar se o e-mail existe
    const erroGenerico = NextResponse.json(
      { error: "Credenciais inválidas ou sem permissão de administrador" },
      { status: 401 }
    )

    if (!usuario || !usuario.senha) return erroGenerico

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha)
    if (!senhaCorreta) return erroGenerico

    // Verificação crítica: somente admins passam
    if (!usuario.isAdmin) return erroGenerico

    const token = await signToken({ usuarioId: usuario.id, isAdmin: true })

    const res = NextResponse.json({ ok: true })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: "/",
    })

    return res
  } catch (error) {
    console.error("[admin/auth/login]", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
