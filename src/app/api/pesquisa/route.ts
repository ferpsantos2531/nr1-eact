import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const CONEXAO_API = process.env.CONEXAO_API_URL ?? "https://conexao.abrasel.com.br/perfil/api"

/**
 * GET /nr1/api/pesquisa?token=xxx
 *
 * Rota PÚBLICA — não requer autenticação.
 * O questionário é preenchido por funcionários que não têm conta no sistema.
 * Busca o nome da empresa no Conexão usando chamada server-side.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token não informado" }, { status: 400 })
  }

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { surveyToken: token },
      select: { id: true },
    })

    if (!empresa) {
      return NextResponse.json(
        { error: "Link de pesquisa inválido ou expirado" },
        { status: 404 }
      )
    }

    // Busca o nome da empresa no Conexão (chamada server-side sem sessão de usuário)
    // O endpoint público /company/{id} retorna dados básicos da empresa
    let nome: string | null = null
    try {
      const res = await fetch(`${CONEXAO_API}/company/${empresa.id}`, {
        cache: "force-cache",    // Nome da empresa muda raramente — usa cache
        next: { revalidate: 3600 },
      })
      if (res.ok) {
        const data = await res.json()
        nome = data.tradingName || data.companyName || null
      }
    } catch {
      // Conexão indisponível — questionário continua funcionando sem o nome
    }

    return NextResponse.json({ id: empresa.id, nome })
  } catch (error) {
    console.error("Erro ao buscar pesquisa:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// POST /api/pesquisa — submete respostas do funcionário
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, respostas } = body

    if (!token || !respostas) {
      return NextResponse.json(
        { error: "Token e respostas são obrigatórios" },
        { status: 400 }
      )
    }

    if (!Array.isArray(respostas) || respostas.length !== 31) {
      return NextResponse.json(
        { error: "Respostas devem conter exatamente 31 itens" },
        { status: 400 }
      )
    }

    const invalidas = respostas.filter((r) => r < 1 || r > 5 || !Number.isInteger(r))
    if (invalidas.length > 0) {
      return NextResponse.json(
        { error: "Todas as respostas devem ser inteiros entre 1 e 5" },
        { status: 400 }
      )
    }

    const empresa = await prisma.empresa.findUnique({
      where: { surveyToken: token },
    })

    if (!empresa) {
      return NextResponse.json(
        { error: "Link de pesquisa inválido" },
        { status: 404 }
      )
    }

    await prisma.resposta.create({
      data: {
        empresaId: empresa.id,
        respostas: JSON.stringify(respostas),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao salvar resposta:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
