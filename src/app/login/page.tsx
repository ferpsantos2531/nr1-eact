/**
 * /login — DEPRECIADO no branch sso-integration
 *
 * Login é feito via SSO com Conexão Abrasel.
 * Esta página redireciona automaticamente para o login do Conexão.
 */
import { redirect } from "next/navigation"

const CONEXAO_LOGIN = process.env.CONEXAO_REDIRECT_URL ?? "https://conexao.abrasel.com.br/entrar"

export default function LoginPage() {
  redirect(CONEXAO_LOGIN)
}
