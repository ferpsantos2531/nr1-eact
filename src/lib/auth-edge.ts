/**
 * auth-edge.ts
 * Funções de autenticação compatíveis com Edge Runtime (middleware).
 * NÃO importa next/headers — use auth.ts para funções server-side completas.
 */
import { jwtVerify } from "jose"

export const COOKIE_NAME = "nr1_session"

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
)

export async function verifyTokenEdge(
  token: string
): Promise<{ usuarioId: string; isAdmin: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { usuarioId: string; isAdmin: boolean }
  } catch {
    return null
  }
}
