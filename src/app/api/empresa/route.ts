import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { v4 as uuidv4 } from "uuid"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, cnpj, email, telefone, setor, tamanho } = body

    if (!nome || !email) {
      return NextResponse.json({ error: "Nome e email são obrigatórios" }, { status: 400 })
    }

    const existing = await prisma.empresa.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma empresa cadastrada com este email", empresaId: existing.id },
        { status: 409 }
      )
    }

    const empresa = await prisma.empresa.create({
      data: { nome, cnpj: cnpj || null, email, telefone: telefone || null,
               setor: setor || null, tamanho: tamanho || null, surveyToken: uuidv4() },
    })

    return NextResponse.json({ id: empresa.id, surveyToken: empresa.surveyToken })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno ao cadastrar empresa" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const email = searchParams.get("email")

  if (!id && !email) {
    return NextResponse.json({ error: "Informe id ou email" }, { status: 400 })
  }

  try {
    const empresa = id
      ? await prisma.empresa.findUnique({ where: { id } })
      : await prisma.empresa.findUnique({ where: { email: email! } })

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const [totalRespostas, historico] = await Promise.all([
      prisma.resposta.count({ where: { empresaId: empresa.id } }),
      prisma.relatorio.findMany({
        where: { empresaId: empresa.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, mediaGeral: true, mediaDimensao1: true,
          mediaDimensao2: true, mediaDimensao3: true,
          categoria: true, totalRespostas: true, createdAt: true,
        },
      }),
    ])

    return NextResponse.json({ ...empresa, totalRespostas, historico })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
