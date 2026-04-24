import { NextRequest, NextResponse } from "next/server"
import { verifyTokenEdge, COOKIE_NAME } from "@/lib/auth-edge"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rotas do painel admin ──────────────────────────────────────────────
  // /admin/login é pública (página de login do admin)
  // Todo o resto de /admin/* exige sessão com isAdmin = true
  // Nunca tenta SSO — admins usam credenciais locais exclusivamente
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
      // Sessão inválida ou usuário não é admin → limpa cookie e redireciona
      const url = request.nextUrl.clone()
      url.pathname = "/admin/login"
      const res = NextResponse.redirect(url)
      res.cookies.delete(COOKIE_NAME)
      return res
    }

    // Admin autenticado → continua
    return NextResponse.next()
  }

  // ── Rotas protegidas de usuário comum ─────────────────────────────────
  // Por enquanto verificam apenas a sessão local.
  // Quando o SSO com Conexão estiver ativo, aqui entra o fluxo automático.
  const rotasProtegidas = ["/dashboard", "/empresa", "/relatorio", "/respostas"]
  const rotaProtegida = rotasProtegidas.some((r) => pathname.startsWith(r))

  if (rotaProtegida) {
    const token = request.cookies.get(COOKIE_NAME)?.value

    if (!token) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      return NextResponse.redirect(url)
    }

    const session = await verifyTokenEdge(token)

    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      const res = NextResponse.redirect(url)
      res.cookies.delete(COOKIE_NAME)
      return res
    }

    // Usuário autenticado → continua
    return NextResponse.next()
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
