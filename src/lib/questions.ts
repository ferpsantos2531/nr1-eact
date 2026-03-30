export type Dimensao = {
  nome: string
  descricao: string
  questoes: number[] // índices 0-based
}

export const DIMENSOES: Dimensao[] = [
  {
    nome: "Organização do Trabalho",
    descricao: "Avalia ritmo, pressão, normas, controle e estrutura das tarefas",
    questoes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    nome: "Condições de Trabalho",
    descricao: "Avalia ambiente físico, equipamentos, segurança e materiais",
    questoes: [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],
  },
  {
    nome: "Relações Socioprofissionais",
    descricao: "Avalia comunicação, autonomia, relações entre equipe e chefia",
    questoes: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  },
]

export const QUESTOES = [
  // Organização do Trabalho (1-11)
  "O ritmo de trabalho é excessivo",
  "As tarefas são cumpridas com pressão de prazos",
  "Existe forte cobrança por resultados",
  "As normas para execução das tarefas são rígidas",
  "Existe fiscalização do desempenho",
  "O número de pessoas é insuficiente para se realizar as tarefas",
  "Os resultados esperados estão fora da realidade",
  "Existe divisão entre quem planeja e quem executa",
  "As tarefas são repetitivas",
  "Falta tempo para realizar pausas de descanso no trabalho",
  "As tarefas executadas sofrem descontinuidade",
  // Condições de Trabalho (12-21)
  "As condições de trabalho são precárias",
  "O ambiente físico é desconfortável",
  "Existe muito barulho no ambiente de trabalho",
  "O mobiliário existente no ambiente de trabalho é inadequado",
  "Os instrumentos de trabalho são insuficientes para realizar as tarefas",
  "O posto/estação de trabalho é inadequado para realizar as tarefas",
  "Os equipamentos necessários para realização das tarefas são precários",
  "O espaço físico para realizar o trabalho é inadequado",
  "As condições de trabalho oferecem risco à segurança das pessoas",
  "O material de consumo é insuficiente",
  // Relações Socioprofissionais (22-31)
  "As tarefas não estão claramente definidas",
  "A autonomia é inexistente",
  "A distribuição das tarefas é injusta",
  "Os funcionários são excluídos das decisões",
  "Existem dificuldades na comunicação entre chefia e subordinados",
  "Existem disputas profissionais no local de trabalho",
  "Falta integração no ambiente de trabalho",
  "A comunicação entre funcionários é insatisfatória",
  "Falta apoio das chefias para o meu desenvolvimento profissional",
  "As informações que preciso para executar minhas tarefas são de difícil acesso",
]

export const ESCALA = [
  { valor: 1, label: "Nunca" },
  { valor: 2, label: "Raramente" },
  { valor: 3, label: "Às vezes" },
  { valor: 4, label: "Frequentemente" },
  { valor: 5, label: "Sempre" },
]
