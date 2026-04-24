import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /nr1/api/admin/empresas
 *
 * Lista empresas registradas no NR-1 (mapeamento Conexão ID → surveyToken + stats).
 * Dados de perfil (nome, CNPJ) estão no Conexão e não são armazenados aqui.
 * O id da empresa é o mesmo id do Conexão — use-o para buscar no painel Conexão.
 */
export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const empresas = await prisma.empresa.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      usuario: { select: { id: true } },
      _count: { select: { respostas: true } },
      relatorios: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, mediaGeral: true, mediaDimensao1: true, mediaDimensao2: true, mediaDimensao3: true, categoria: true, createdAt: true },
      },
    },
  })

  return NextResponse.json({
    empresas: empresas.map(e => ({
      id: e.id,                         // = ID da empresa no Conexão
      surveyToken: e.surveyToken,
      usuarioId: e.usuario.id,          // = ID do usuário no Conexão
      createdAt: e.createdAt,
      totalRespostas: e._count.respostas,
      ultimoRelatorio: e.relatorios[0] ?? null,
    })),
  })
}
