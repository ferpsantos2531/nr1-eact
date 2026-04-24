import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/pesquisa?token=xxx — busca dados da empresa pelo token
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

    return NextResponse.json(empresa)
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
