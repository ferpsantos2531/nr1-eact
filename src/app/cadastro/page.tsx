/**
 * /cadastro — DEPRECIADO no branch sso-integration
 *
 * Cadastro de usuários é feito no Conexão Abrasel.
 * O NR-1 provisiona o usuário automaticamente no primeiro acesso via SSO.
 * Esta página redireciona para o Conexão.
 */
import { redirect } from "next/navigation"

export default function CadastroPage() {
  redirect("https://conexao.abrasel.com.br")
}
