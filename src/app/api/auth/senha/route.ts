import { NextResponse } from "next/server"

/**
 * DEPRECIADO — Troca de senha local removida no branch sso-integration.
 * Senhas são gerenciadas pelo Conexão Abrasel.
 */
export async function PUT() {
  return NextResponse.json(
    {
      error: "Gerenciamento de senha desativado no NR-1. Altere sua senha no Conexão Abrasel.",
      url: "https://conexao.abrasel.com.br",
    },
    { status: 410 }
  )
}
