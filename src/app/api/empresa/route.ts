import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession, getConexaoToken } from "@/lib/auth"

const CONEXAO_API = process.env.CONEXAO_API_URL ?? "https://conexao.abrasel.com.br/perfil/api"

/**
 * POST /nr1/api/empresa
 *
 * No fluxo SSO, empresas são provisionadas automaticamente via /api/auth/sso.
 * Este endpoint permanece para casos em que uma empresa nova precisa ser
 * registrada no NR-1 sem refazer o SSO (ex: usuário com múltiplas empresas).
 * Recebe apenas o id da empresa do Conexão — sem duplicar dados.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { conexaoEmpresaId } = await req.json()
    if (!conexaoEmpresaId) {
      return NextResponse.json({ error: "conexaoEmpresaId é obrigatório" }, { status: 400 })
    }

    const empresa = await prisma.empresa.upsert({
      where: { id: conexaoEmpresaId },
      update: {},
      create: { id: conexaoEmpresaId, usuarioId: session.usuarioId },
    })

    return NextResponse.json({ id: empresa.id, surveyToken: empresa.surveyToken })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

/**
 * GET /nr1/api/empresa?id=<id>
 *
 * Retorna dados da empresa combinando NR-1 (stats) + Conexão (perfil).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Informe id" }, { status: 400 })

  try {
    const empresa = await prisma.empresa.findUnique({ where: { id } })
    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

    const [totalRespostas, historico] = await Promise.all([
      prisma.resposta.count({ where: { empresaId: id } }),
      prisma.relatorio.findMany({
        where: { empresaId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, mediaGeral: true, mediaDimensao1: true,
          mediaDimensao2: true, mediaDimensao3: true,
          categoria: true, totalRespostas: true, createdAt: true,
        },
      }),
    ])

    // Enriquece com dados do Conexão
    let perfilConexao: { nome?: string; cnpj?: string; tamanho?: string; razaoSocial?: string; cidade?: string; estado?: string } = {}
    const conexaoToken = await getConexaoToken()
    if (conexaoToken) {
      try {
        const res = await fetch(`${CONEXAO_API}/company/${id}`, {
          headers: { Cookie: `next-auth.session-token=${conexaoToken}` },
          cache: "no-store",
        })
        if (res.ok) {
          const data = await res.json()
          perfilConexao = {
            nome: data.tradingName || data.companyName,
            cnpj: data.cnpj,
            tamanho: data.size,
            razaoSocial: data.companyName,
            cidade: data.address?.city,
            estado: data.address?.state,
          }
        }
      } catch { /* ignora — retorna sem enriquecimento */ }
    }

    return NextResponse.json({
      id: empresa.id,
      surveyToken: empresa.surveyToken,
      createdAt: empresa.createdAt,
      ...perfilConexao,
      totalRespostas,
      historico,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
