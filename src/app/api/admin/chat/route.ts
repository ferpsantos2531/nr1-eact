import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { QUESTOES, DIMENSOES } from "@/lib/questions"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  const body = await req.json()
  const mensagem: string = body.mensagem ?? ""
  const historico: Array<{ role: "user" | "assistant"; content: string }> = body.historico ?? []

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const [empresas, todasRespostas] = await Promise.all([
    prisma.empresa.findMany({
      select: {
        id: true,
        nome: true,
        tamanho: true,
        _count: { select: { respostas: true } },
        relatorios: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            mediaGeral: true,
            mediaDimensao1: true,
            mediaDimensao2: true,
            mediaDimensao3: true,
            categoria: true,
            totalRespostas: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.resposta.findMany({ select: { respostas: true } }),
  ])

  // ── Per-question averages ───────────────────────────────────────────────────
  const questaoSomas = new Array(31).fill(0)
  const questaoContagens = new Array(31).fill(0)

  for (const r of todasRespostas) {
    try {
      const vals: number[] = typeof r.respostas === "string"
        ? JSON.parse(r.respostas)
        : (r.respostas as number[])
      for (let i = 0; i < 31; i++) {
        if (vals[i] !== undefined && vals[i] !== null) {
          questaoSomas[i] += vals[i]
          questaoContagens[i] += 1
        }
      }
    } catch { /* skip */ }
  }

  const mediasPorQuestao = QUESTOES.map((q, i) => ({
    questao: q,
    media: questaoContagens[i] > 0 ? Number((questaoSomas[i] / questaoContagens[i]).toFixed(2)) : null,
    dimensao: DIMENSOES.find(d => d.questoes.includes(i))?.nome ?? "Desconhecida",
  }))

  const top10Criticas = [...mediasPorQuestao]
    .filter(q => q.media !== null)
    .sort((a, b) => (b.media ?? 0) - (a.media ?? 0))
    .slice(0, 10)

  // ── Summary stats ──────────────────────────────────────────────────────────
  const empresasComRelatorio = empresas.filter(e => e.relatorios.length > 0)
  const totalRespondentes = todasRespostas.length
  const mediasGerais = empresasComRelatorio.map(e => e.relatorios[0].mediaGeral)
  const mediaPlataforma = mediasGerais.length
    ? Number((mediasGerais.reduce((a, b) => a + b, 0) / mediasGerais.length).toFixed(2))
    : null

  const distribuicao = {
    grave: empresasComRelatorio.filter(e => e.relatorios[0].categoria === "grave").length,
    critico: empresasComRelatorio.filter(e => e.relatorios[0].categoria === "critico").length,
    satisfatorio: empresasComRelatorio.filter(e => e.relatorios[0].categoria === "satisfatorio").length,
  }

  // ── Build system prompt ────────────────────────────────────────────────────
  const empresasDetalhes = empresas.map(e => {
    const rel = e.relatorios[0]
    if (!rel) return `- ${e.nome} (${e.tamanho ?? "porte não informado"}): sem relatório. Respondentes coletados: ${e._count.respostas}`
    return `- ${e.nome} (${e.tamanho ?? "porte não informado"}): Média ${rel.mediaGeral.toFixed(2)}, Classificação: ${rel.categoria}, Respondentes: ${rel.totalRespostas}, Dim1=${rel.mediaDimensao1.toFixed(2)}, Dim2=${rel.mediaDimensao2.toFixed(2)}, Dim3=${rel.mediaDimensao3.toFixed(2)}`
  }).join("\n")

  const questoesCriticasTexto = top10Criticas
    .map((q, i) => `${i + 1}. [${q.media?.toFixed(2)}] "${q.questao}" (${q.dimensao})`)
    .join("\n")

  const systemPrompt = `Você é um analista especialista em saúde ocupacional e gestão de riscos psicossociais para a plataforma NR-1 da Abrasel (Associação Brasileira de Bares e Restaurantes). Você tem acesso completo aos dados da plataforma e deve responder em Português do Brasil com insights acionáveis, diretos e práticos.

## DADOS DA PLATAFORMA (atualizado agora)

**Resumo Geral:**
- Total de empresas cadastradas: ${empresas.length}
- Empresas com relatório gerado: ${empresasComRelatorio.length}
- Total de respondentes: ${totalRespondentes}
- Média geral da plataforma: ${mediaPlataforma !== null ? mediaPlataforma.toFixed(2) : "sem dados"} (escala 1-5)
- Distribuição: ${distribuicao.grave} Grave | ${distribuicao.critico} Crítico | ${distribuicao.satisfatorio} Satisfatório

**Classificação:** >= 3,7 = Grave (maior risco) | 2,3 a 3,69 = Crítico | < 2,3 = Satisfatório (menor risco)
**Dimensões avaliadas:**
- Dimensão 1 – Organização do Trabalho (questões 1-11): ritmo, pressão, normas, controle
- Dimensão 2 – Condições de Trabalho (questões 12-21): ambiente físico, equipamentos, segurança
- Dimensão 3 – Relações Socioprofissionais (questões 22-31): comunicação, autonomia, relações

**Todas as Empresas:**
${empresasDetalhes}

**Top 10 Questões Mais Críticas (maiores médias = ocorrem com mais frequência):**
${questoesCriticasTexto}

## INSTRUÇÕES
- Responda sempre em Português do Brasil
- Seja objetivo, direto e prático
- Use os dados reais acima para embasar suas respostas
- Quando mencionar empresas, use os dados fornecidos
- Forneça insights acionáveis que ajudem a gestão da Abrasel
- Se perguntado sobre tendências, analise os padrões nos dados
- Não invente dados — use apenas os fornecidos acima`

  // ── Build messages array ───────────────────────────────────────────────────
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...historico,
    { role: "user", content: mensagem },
  ]

  // ── Stream response ────────────────────────────────────────────────────────
  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
