import Anthropic from "@anthropic-ai/sdk"
import { DIMENSOES, QUESTOES } from "./questions"
import { ResultadoEACT, calcularCategoria, FEEDBACKS } from "./scoring"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type PlanoAcao = {
  resumo: string
  prioridades: string[]
  acoesCurtoPrazo: Array<{ titulo: string; descricao: string; responsavel: string }>
  acoesMedioPrazo: Array<{ titulo: string; descricao: string; responsavel: string }>
  acoesMedidaLegislativa: string
  indicadores: string[]
}

export async function gerarPlanoAcaoIA(
  resultado: ResultadoEACT,
  nomeEmpresa: string,
  setor: string | null,
  mediasPorQuestao: number[]
): Promise<PlanoAcao> {
  // Identifica as 8 questões mais críticas
  const questoesOrdenadas = mediasPorQuestao
    .map((media, i) => ({ indice: i, media, questao: QUESTOES[i] }))
    .sort((a, b) => b.media - a.media)
    .slice(0, 8)

  const dimensoesDetalhadas = DIMENSOES.map((d) => ({
    nome: d.nome,
    media: resultado[
      `mediaDimensao${DIMENSOES.indexOf(d) + 1}` as keyof ResultadoEACT
    ],
    categoria: calcularCategoria(
      resultado[
        `mediaDimensao${DIMENSOES.indexOf(d) + 1}` as keyof ResultadoEACT
      ] as number
    ),
  }))

  const prompt = `Você é um especialista em saúde ocupacional e gestão de pessoas, com foco na NR-1 (Norma Regulamentadora nº 1) do Ministério do Trabalho e Emprego do Brasil, que desde maio de 2025 exige que as empresas avaliem e gerenciem os riscos psicossociais.

Acabei de receber os resultados de uma pesquisa de avaliação do contexto de trabalho de uma empresa e preciso de um plano de ação detalhado.

**Empresa:** ${nomeEmpresa}
**Setor:** ${setor || "Alimentação fora do lar / Restaurante"}
**Total de respondentes:** ${resultado.totalRespostas}

**Resultados Gerais:**
- Média Geral: ${resultado.mediaGeral} (escala 1-5, sendo 1=Nunca e 5=Sempre)
- Classificação: ${FEEDBACKS[resultado.categoria].titulo}

**Resultados por Dimensão:**
${dimensoesDetalhadas.map((d) => `- ${d.nome}: ${d.media} (${FEEDBACKS[d.categoria].titulo})`).join("\n")}

**Questões com maiores pontuações (mais críticas — ocorrem com maior frequência):**
${questoesOrdenadas.map((q) => `- [${q.media.toFixed(2)}] ${q.questao}`).join("\n")}

Gere um plano de ação estruturado em formato JSON com exatamente esta estrutura:
{
  "resumo": "Parágrafo de 2-3 frases explicando a situação geral da empresa e o que precisa ser feito",
  "prioridades": ["lista de 3-5 prioridades mais urgentes baseadas nos dados"],
  "acoesCurtoPrazo": [
    {
      "titulo": "Nome curto da ação",
      "descricao": "O que fazer, como fazer e por que é importante",
      "responsavel": "Quem deve liderar (ex: RH, Gestores, Diretoria)"
    }
  ],
  "acoesMedioPrazo": [
    {
      "titulo": "Nome curto da ação",
      "descricao": "O que fazer, como fazer e por que é importante",
      "responsavel": "Quem deve liderar"
    }
  ],
  "acoesMedidaLegislativa": "Parágrafo sobre como este plano se relaciona com as exigências da NR-1 e o que a empresa deve documentar",
  "indicadores": ["lista de 4-5 indicadores para monitorar o progresso"]
}

Forneça 3-5 ações de curto prazo (0-3 meses) e 3-4 ações de médio prazo (3-12 meses). Seja específico e prático. Não mencione nomes de metodologias ou escalas de avaliação. Responda APENAS com o JSON, sem texto adicional.`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const content = response.content[0]
  if (content.type !== "text") throw new Error("Unexpected response type from AI")

  const jsonText = content.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "")
  return JSON.parse(jsonText) as PlanoAcao
}
