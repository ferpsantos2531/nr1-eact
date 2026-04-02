import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

// POST — adiciona nova empresa para o usuário logado
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    const { nome, cnpj, telefone, tamanho, razaoSocial, cidade, estado } = await req.json()
    if (!nome) return NextResponse.json({ error: "Nome da empresa é obrigatório" }, { status: 400 })

    const empresa = await prisma.empresa.create({
      data: {
        nome,
        cnpj: cnpj || null,
        telefone: telefone || null,
        tamanho: tamanho || null,
        razaoSocial: razaoSocial || null,
        cidade: cidade || null,
        estado: estado || null,
        surveyToken: uuidv4(),
        usuarioId: session.usuarioId,
      },
    })

    return NextResponse.json({ id: empresa.id, surveyToken: empresa.surveyToken })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

// GET — busca empresa por id (verificando que pertence ao usuário logado)
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

    return NextResponse.json({ ...empresa, totalRespostas, historico })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
