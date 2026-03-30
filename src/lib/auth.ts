import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production"
)

export const COOKIE_NAME = "nr1_session"

export async function signToken(payload: { usuarioId: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret)
}

export async function verifyToken(token: string): Promise<{ usuarioId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { usuarioId: string }
  } catch {
    return null
  }
}

export async function getSession(): Promise<{ usuarioId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}
