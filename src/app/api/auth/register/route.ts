import { NextResponse } from "next/server"

/**
 * DEPRECIADO — Cadastro local removido no branch sso-integration.
 * Cadastro de usuários é feito no Conexão Abrasel.
 * O NR-1 provisiona o usuário automaticamente no primeiro acesso via SSO.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Cadastro local desativado. Registre-se no Conexão Abrasel.",
      cadastro: "https://conexao.abrasel.com.br",
    },
    { status: 410 }
  )
}
