import { NextRequest, NextResponse } from "next/server"
import { verifyTokenEdge, COOKIE_NAME } from "@/lib/auth-edge"

// URL base do Conexão para redirecionamento quando não há sessão alguma
const CONEXAO_LOGIN_URL = process.env.CONEXAO_REDIRECT_URL ?? "https://conexao.abrasel.com.br/entrar"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rotas do painel admin ──────────────────────────────────────────────
  // /admin/login é pública (página de login do admin)
  // Todo o resto de /admin/* exige sessão com isAdmin = true
  // NUNCA tenta SSO — admins usam credenciais locais exclusivamente
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      url.searchParams.set("redirect", pathname)
      return NextResponse.redirect(url)
    }

    const session = await verifyTokenEdge(token)

    if (!session || !session.isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      const res = NextResponse.redirect(url)
      res.cookies.delete(COOKIE_NAME)
      return res
    }

    return NextResponse.next()
  }

  // ── Rotas protegidas de usuário comum ─────────────────────────────────
  // Fluxo SSO automático via cookie next-auth.session-token do Conexão.
  // Como NR-1 está em conexao.abrasel.com.br/nr1, o cookie do Conexão
  // trafega automaticamente (mesma origem).
  const rotasProtegidas = ["/dashboard", "/empresa", "/relatorio", "/respostas"]
  const rotaProtegida = rotasProtegidas.some((r) => pathname.startsWith(r))

  if (rotaProtegida) {
    const nr1Token = request.cookies.get(COOKIE_NAME)?.value

    // 1. Sessão NR-1 válida → acessa normalmente
    if (nr1Token) {
      const session = await verifyTokenEdge(nr1Token)
      if (session) return NextResponse.next()
      // Token expirado — limpa e tenta SSO
      const res = NextResponse.next()
      res.cookies.delete(COOKIE_NAME)
    }

    // 2. Sem sessão NR-1 — verifica se há sessão do Conexão
    const conexaoToken = request.cookies.get("next-auth.session-token")?.value

    if (conexaoToken) {
      // Redireciona para o endpoint SSO que vai validar, provisionar e emitir nr1_session
      const ssoUrl = request.nextUrl.clone()
      ssoUrl.pathname = "/api/auth/sso"
      ssoUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(ssoUrl)
    }

    // 3. Sem nenhuma sessão → redireciona para login do Conexão
    return NextResponse.redirect(new URL(CONEXAO_LOGIN_URL))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/empresa/:path*",
    "/relatorio/:path*",
    "/respostas/:path*",
  ],
}
