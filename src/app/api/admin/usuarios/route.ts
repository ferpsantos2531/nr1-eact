import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /nr1/api/admin/usuarios
 *
 * Lista usuários registrados no NR-1 (mapeamento Conexão ID → isAdmin).
 * Dados de perfil (email, nome) estão no Conexão e não são armazenados aqui.
 * O id do usuário é o mesmo id do Conexão — use-o para buscar no painel Conexão.
 */
export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 })

  const usuarios = await prisma.usuario.findMany({
    select: {
      id: true,
      isAdmin: true,
      empresas: {
        select: {
          id: true,
          surveyToken: true,
          createdAt: true,
          _count: { select: { respostas: true } },
          relatorios: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { mediaGeral: true, categoria: true, createdAt: true },
          },
        },
      },
    },
  })

  return NextResponse.json({
    usuarios: usuarios.map(u => ({
      id: u.id,                           // = ID do usuário no Conexão
      isAdmin: u.isAdmin,
      totalEmpresas: u.empresas.length,
      totalRespostas: u.empresas.reduce((acc, e) => acc + e._count.respostas, 0),
      empresas: u.empresas.map(e => ({
        id: e.id,                         // = ID da empresa no Conexão
        surveyToken: e.surveyToken,
        createdAt: e.createdAt,
        totalRespostas: e._count.respostas,
        ultimoRelatorio: e.relatorios[0] ?? null,
      })),
    })),
  })
}
