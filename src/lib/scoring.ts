import { DIMENSOES } from "./questions"

export type Categoria = "grave" | "critico" | "satisfatorio"

export type ResultadoEACT = {
  mediaGeral: number
  mediaDimensao1: number
  mediaDimensao2: number
  mediaDimensao3: number
  categoria: Categoria
  totalRespostas: number
}

export type FeedbackCategoria = {
  titulo: string
  descricao: string
  cor: string
  corFundo: string
  emoji: string
}

export const FEEDBACKS: Record<Categoria, FeedbackCategoria> = {
  grave: {
    titulo: "Situação Grave — Atenção Imediata",
    descricao:
      "Atenção! É importante que você aja imediatamente para criar um contexto de trabalho mais saudável. Sua empresa está posicionada abaixo da média de saúde satisfatória. Cobranças e atividades excessivas, condições de trabalho precário e ausência de autonomia para executar tarefas, entre outras questões, não podem ser a regra na empresa. Inicie o quanto antes uma conversa franca sobre saúde e condições de trabalho com os seus funcionários, e trabalhe a escuta no dia a dia para entender como ajudá-los em seus desafios cotidianos ligados à saúde.",
    cor: "#DC2626",
    corFundo: "#FEF2F2",
    emoji: "🔴",
  },
  critico: {
    titulo: "Situação Crítica — Requer Melhoria",
    descricao:
      "O seu contexto de trabalho pode ser melhor. Sobrecarga de trabalho, desorganização nas tarefas e cobranças excessivas, desde que educadas, podem ocorrer ocasionalmente, mas não podem virar a regra. É importante que você e seu time melhorem o ambiente de trabalho em que estão inseridos. Organizar melhor as tarefas, promover diálogos relevantes e melhorar os equipamentos de trabalho podem ser tarefas importantes para esse avanço.",
    cor: "#D97706",
    corFundo: "#FFFBEB",
    emoji: "🟡",
  },
  satisfatorio: {
    titulo: "Situação Satisfatória",
    descricao:
      "O contexto de trabalho em que você se encontra está em níveis satisfatórios! Isso significa, de forma geral, que o seu trabalho é bem-organizado, você possui bons equipamentos para executá-lo e há uma boa relação com seus colegas e lideranças. Para continuar sua jornada de melhoria, coloque em ações pequenas melhorias diárias, como conversas sobre o tema, palestras com profissionais e afins.",
    cor: "#059669",
    corFundo: "#ECFDF5",
    emoji: "🟢",
  },
}

export function calcularCategoria(media: number): Categoria {
  if (media >= 3.7) return "grave"
  if (media >= 2.3) return "critico"
  return "satisfatorio"
}

export function calcularMedia(respostas: number[]): number {
  if (respostas.length === 0) return 0
  const soma = respostas.reduce((acc, val) => acc + val, 0)
  return Number((soma / respostas.length).toFixed(2))
}

export function calcularResultado(todasRespostas: number[][]): ResultadoEACT {
  if (todasRespostas.length === 0) {
    return {
      mediaGeral: 0,
      mediaDimensao1: 0,
      mediaDimensao2: 0,
      mediaDimensao3: 0,
      categoria: "satisfatorio",
      totalRespostas: 0,
    }
  }

  // Média por questão (média de todos os respondentes para cada questão)
  const mediasPorQuestao = Array.from({ length: 31 }, (_, i) => {
    const valores = todasRespostas.map((r) => r[i]).filter((v) => v != null)
    return calcularMedia(valores)
  })

  const mediaGeral = calcularMedia(mediasPorQuestao)

  const mediaDimensao1 = calcularMedia(
    DIMENSOES[0].questoes.map((i) => mediasPorQuestao[i])
  )
  const mediaDimensao2 = calcularMedia(
    DIMENSOES[1].questoes.map((i) => mediasPorQuestao[i])
  )
  const mediaDimensao3 = calcularMedia(
    DIMENSOES[2].questoes.map((i) => mediasPorQuestao[i])
  )

  return {
    mediaGeral,
    mediaDimensao1,
    mediaDimensao2,
    mediaDimensao3,
    categoria: calcularCategoria(mediaGeral),
    totalRespostas: todasRespostas.length,
  }
}
