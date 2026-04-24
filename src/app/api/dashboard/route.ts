import { NextResponse } from "next/server"
import { getSession, getConexaoToken } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const CONEXAO_API = process.env.CONEXAO_API_URL ?? "https://conexao.abrasel.com.br/perfil/api"

/**
 * GET /nr1/api/dashboard
 *
 * Retorna a lista de empresas do usuário com dados combinados:
 * - surveyToken, stats (respostas, relatórios) → NR-1 DB (fonte de verdade)
 * - nome, tamanho, cnpj → Conexão API (proxy server-side)
 */
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  // Busca dados locais (o que o NR-1 possui)
  const empresas = await prisma.empresa.findMany({
    where: { usuarioId: session.usuarioId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { respostas: true } },
      relatorios: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { mediaGeral: true, categoria: true, createdAt: true },
      },
    },
  })

  // Busca dados de empresa no Conexão para enriquecer a resposta
  // Mapeamento: id da empresa NR-1 = id da empresa no Conexão
  const empresasConexao: Record<string, { nome: string; tamanho: string | null; cnpj: string | null }> = {}

  const conexaoToken = await getConexaoToken()
  if (conexaoToken && empresas.length > 0) {
    try {
      // /company retorna a empresa principal do usuário — pode ser array ou objeto
      const res = await fetch(`${CONEXAO_API}/company`, {
        headers: { Cookie: `next-auth.session-token=${conexaoToken}` },
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        // Normaliza para array (independente do formato retornado pela API)
        const lista: Array<{ id: string; tradingName?: string; companyName?: string; size?: string; cnpj?: string }> =
          Array.isArray(data) ? data : data.id ? [data] : (data.companies ?? [])

        for (const c of lista) {
          if (c.id) {
            empresasConexao[c.id] = {
              nome: c.tradingName || c.companyName || c.id,
              tamanho: c.size ?? null,
              cnpj: c.cnpj ?? null,
            }
          }
        }
      }
    } catch {
      // Conexão indisponível — retorna sem enriquecimento (dashboard ainda funciona)
    }
  }

  return NextResponse.json({
    empresas: empresas.map(e => {
      const info = empresasConexao[e.id]
      return {
        id: e.id,
        nome: info?.nome ?? `Empresa ${e.id.slice(0, 8)}`,
        tamanho: info?.tamanho ?? null,
        cnpj: info?.cnpj ?? null,
        surveyToken: e.surveyToken,
        createdAt: e.createdAt,
        totalRespostas: e._count.respostas,
        ultimoRelatorio: e.relatorios[0] ?? null,
      }
    }),
  })
}
