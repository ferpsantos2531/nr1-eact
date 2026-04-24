import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/auth"

const CONEXAO_API = process.env.CONEXAO_API_URL ?? "https://conexao.abrasel.com.br/perfil/api"
const CONEXAO_LOGIN = process.env.CONEXAO_REDIRECT_URL ?? "https://conexao.abrasel.com.br/entrar"

/**
 * GET /nr1/api/auth/sso?redirect=<pathname>
 *
 * Fluxo SSO automático acionado pelo middleware quando:
 *  - Não há nr1_session (sem sessão NR-1)
 *  - Há next-auth.session-token (sessão Conexão ativa)
 *
 * O endpoint:
 *  1. Lê o cookie next-auth.session-token (disponível pois mesmo domínio)
 *  2. Valida a sessão chamando a API do Conexão
 *  3. Cria/atualiza os registros mínimos no banco NR-1
 *  4. Emite nr1_session cookie
 *  5. Redireciona para a rota original
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const redirectTo = searchParams.get("redirect") ?? "/dashboard"

  const conexaoToken = req.cookies.get("next-auth.session-token")?.value

  if (!conexaoToken) {
    return NextResponse.redirect(new URL(CONEXAO_LOGIN))
  }

  try {
    // 1. Busca dados do usuário no Conexão
    const userRes = await fetch(`${CONEXAO_API}/user`, {
      headers: { Cookie: `next-auth.session-token=${conexaoToken}` },
      cache: "no-store",
    })

    if (!userRes.ok) {
      // Token do Conexão inválido/expirado → manda para login
      return NextResponse.redirect(new URL(CONEXAO_LOGIN))
    }

    const user = await userRes.json()

    if (!user?.id) {
      console.error("[sso] Resposta inesperada da API Conexão /user:", user)
      return NextResponse.redirect(new URL(CONEXAO_LOGIN))
    }

    // 2. Busca empresa do usuário no Conexão (pode não existir ainda)
    const companyRes = await fetch(`${CONEXAO_API}/company`, {
      headers: { Cookie: `next-auth.session-token=${conexaoToken}` },
      cache: "no-store",
    })

    const company = companyRes.ok ? await companyRes.json() : null

    // 3. Upsert mínimo no banco NR-1
    //    Usuario: apenas id (= Conexão user ID) + isAdmin preservado
    const usuario = await prisma.usuario.upsert({
      where: { id: user.id },
      update: {},   // Não sobrescreve isAdmin — gerenciado pelo admin Abrasel
      create: { id: user.id, isAdmin: false },
    })

    //    Empresa: apenas id (= Conexão company ID) + surveyToken gerado automaticamente
    if (company?.id) {
      await prisma.empresa.upsert({
        where: { id: company.id },
        update: {},   // surveyToken nunca é sobrescrito
        create: { id: company.id, usuarioId: usuario.id },
      })
    }

    // 4. Emite nr1_session
    const token = await signToken({ usuarioId: usuario.id, isAdmin: usuario.isAdmin })

    const res = NextResponse.redirect(new URL(redirectTo, req.url))
    res.cookies.set(COOKIE_NAME, token, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 8, // 8 horas
    })

    return res
  } catch (error) {
    console.error("[sso] Erro durante SSO:", error)
    return NextResponse.redirect(new URL(CONEXAO_LOGIN))
  }
}
