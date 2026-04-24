/**
 * scripts/create-admin.ts
 *
 * Cria ou promove um usuário administrador no banco de dados NR-1.
 *
 * Uso:
 *   npx ts-node scripts/create-admin.ts --email admin@abrasel.com.br --senha "SenhaSegura123!"
 *
 * Ou via npm script (adicionar em package.json):
 *   "create-admin": "ts-node scripts/create-admin.ts"
 *
 * Se o e-mail já existir no banco, o script apenas promove o usuário a admin
 * e atualiza a senha (se --senha for fornecida).
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

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {
      senha: hash,
      isAdmin: true,
    },
    create: {
      email,
      senha: hash,
      isAdmin: true,
    },
  })

  console.log(`✅  Admin configurado com sucesso!`)
  console.log(`   ID:      ${usuario.id}`)
  console.log(`   E-mail:  ${usuario.email}`)
  console.log(`   isAdmin: ${usuario.isAdmin}`)
  console.log(`\n   Acesse: /admin/login\n`)
}

main()
  .catch((e) => {
    console.error("❌  Erro:", e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
