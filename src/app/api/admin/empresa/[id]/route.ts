import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/auth"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  if (!session.isAdmin) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 })

  const { id } = await params

  try {
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: { id: true, nome: true, usuarioId: true },
    })
    if (!empresa) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })

    // Exclusão em cascata: respostas → relatórios → empresa
    const [respostas, relatorios] = await Promise.all([
      prisma.resposta.deleteMany({ where: { empresaId: id } }),
      prisma.relatorio.deleteMany({ where: { empresaId: id } }),
    ])

    await prisma.empresa.delete({ where: { id } })

    // Se o usuário não tiver mais nenhuma empresa, exclui o usuário também
    const outrasEmpresas = await prisma.empresa.count({ where: { usuarioId: empresa.usuarioId } })
    let usuarioExcluido = false
    if (outrasEmpresas === 0) {
      await prisma.usuario.delete({ where: { id: empresa.usuarioId } })
      usuarioExcluido = true
    }

    return NextResponse.json({
      ok: true,
      empresa: empresa.nome,
      respostasExcluidas: respostas.count,
      relatoriosExcluidos: relatorios.count,
      usuarioExcluido,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro ao excluir empresa" }, { status: 500 })
  }
}
