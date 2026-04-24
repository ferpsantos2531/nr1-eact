import { NextResponse } from "next/server"
import { getSession, getConexaoToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CONEXAO_API = process.env.CONEXAO_API_URL ?? "https://conexao.abrasel.com.br/perfil/api"

/**
 * GET /nr1/api/auth/me
 *
 * Retorna dados do usuário autenticado.
 * - id e isAdmin vêm do banco NR-1 (fonte de verdade para permissões)
 * - email e nome vêm da API do Conexão (proxy server-side)
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.usuarioId },
    select: { id: true, isAdmin: true },
  })

  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })

  // Busca dados de perfil no Conexão (email, nome)
  let email: string | null = null
  let nome: string | null = null

  const conexaoToken = await getConexaoToken()
  if (conexaoToken) {
    try {
      const userRes = await fetch(`${CONEXAO_API}/user`, {
        headers: { Cookie: `next-auth.session-token=${conexaoToken}` },
        cache: "no-store",
      })
      if (userRes.ok) {
        const data = await userRes.json()
        email = data.email ?? null
        nome = [data.name, data.lastname].filter(Boolean).join(" ") || null
      }
    } catch {
      // Conexão indisponível — retorna sem email/nome (não é crítico)
    }
  }

  return NextResponse.json({ id: usuario.id, isAdmin: usuario.isAdmin, email, nome })
}
