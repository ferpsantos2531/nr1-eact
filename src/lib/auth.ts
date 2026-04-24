import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
)

export const COOKIE_NAME = "nr1_session"

// Cookie scoped para /nr1 — mesmo domínio que o Conexão, path isolado.
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/nr1",
}

export async function signToken(payload: { usuarioId: string; isAdmin?: boolean }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")   // Sessão de 8h — alinhada ao dia de trabalho
    .sign(secret)
}

export async function verifyToken(token: string): Promise<{ usuarioId: string; isAdmin: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { usuarioId: string; isAdmin: boolean }
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ usuarioId: string; isAdmin: boolean } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Retorna o cookie next-auth.session-token do Conexão (disponível pois somos o mesmo domínio)
export async function getConexaoToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get("next-auth.session-token")?.value ?? null
}
