/**
 * scripts/create-admin.ts
 *
 * Cria ou atualiza um administrador da plataforma NR-1.
 * Admins usam email + senha locais (independente do Conexão/SSO).
 *
 * Uso:
 *   npx ts-node scripts/create-admin.ts --email admin@abrasel.com.br --senha "SenhaSegura123!"
 *
 * Ou via npm script:
 *   npm run create-admin -- --email admin@abrasel.com.br --senha "SenhaSegura123!"
 *
 * Se o e-mail já existir, o script atualiza a senha.
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

function parseArgs() {
  const args = process.argv.slice(2)
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2)
      result[key] = args[i + 1] ?? ""
      i++
    }
  }
  return result
}

async function main() {
  const { email, senha } = parseArgs()

  if (!email || !senha) {
    console.error("❌  Uso: npx ts-node scripts/create-admin.ts --email <email> --senha <senha>")
    process.exit(1)
  }

  if (senha.length < 8) {
    console.error("❌  A senha deve ter pelo menos 8 caracteres")
    process.exit(1)
  }

  console.log(`\n🔐  Criando/atualizando admin: ${email}`)

  const hash = await bcrypt.hash(senha, 10)

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { senha: hash },
    create: { email, senha: hash },
  })

  console.log(`✅  Admin configurado com sucesso!`)
  console.log(`   ID:     ${admin.id}`)
  console.log(`   Email:  ${admin.email}`)
  console.log(`\n   Acesse: /nr1/admin/login\n`)
}

main()
  .catch((e) => {
    console.error("❌  Erro:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
