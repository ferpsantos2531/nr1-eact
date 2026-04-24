import { NextResponse } from "next/server"

/**
 * DEPRECIADO — Login local removido no branch sso-integration.
 * Autenticação de usuários é feita via SSO com Conexão Abrasel.
 * Acesse: conexao.abrasel.com.br/entrar
 *
 * Para login administrativo: /nr1/admin/login
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Login local desativado. Acesse via Conexão Abrasel.",
      sso: "https://conexao.abrasel.com.br/entrar",
    },
    { status: 410 }
  )
}
