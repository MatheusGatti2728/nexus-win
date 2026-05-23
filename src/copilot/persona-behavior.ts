// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS COPILOT --- Persona Behavior Engine
// Psychological + commercial reading per persona.
// The CFO is NOT the same as the accountant.
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { PersonaBehavior, PersonaType } from "./types"

export const PERSONA_BEHAVIORS: Record<PersonaType, PersonaBehavior> = {

  cfo: {
    persona: "cfo",
    label: "CFO / Responsável Financeiro",
    wants: [
      "Caixa e previsibilidade",
      "Eficiência operacional mensurável",
      "Risco sob controle — não surpresas",
      "Timing certo — não urgência artificial",
      "Credibilidade técnica rápida",
    ],
    fears: [
      "Risco tributário não previsto",
      "Comprometimento sem lastro de análise",
      "Parecer ingênuo com a diretoria",
      "Promessa que não se concretiza",
    ],
    language_style: "Financeiro e objetivo. Usa KPIs, ROI, payback. Não tem paciência para juridiquês.",
    decision_speed: "deliberado",
    trust_builders: [
      "Referência a empresas similares sem citar dados sigilosos",
      "Demonstrar conhecimento do segmento antes de falar em oportunidade",
      "Apresentar análise, não proposta",
      "Falar em análise prévia antes de qualquer número",
    ],
    trust_breakers: [
      "Prometer valor antes de ver dados",
      "Juridiquês no primeiro contato",
      "Urgência artificial: 'prazo se esgotando'",
      "Usar 'recuperação garantida'",
    ],
    best_time: "Manhã de terça a quinta — antes das reuniões da tarde",
    ideal_entry: "Contextualizar o segmento antes de mencionar oportunidade. Demonstrar que conhece a operação.",
    power_questions: [
      "Qual é a pressão de margem que o setor está sentindo hoje?",
      "Já realizaram alguma revisão tributária estratégica nos últimos 3 anos?",
      "Quem é o responsável pela área tributária da empresa?",
      "Como é a relação de vocês com o escritório contábil atual?",
    ],
  },

  socio: {
    persona: "socio",
    label: "Sócio / Proprietário",
    wants: [
      "Crescimento e resultado",
      "Dinheiro que deveria ser da empresa",
      "Vantagem sobre concorrentes",
      "Decisões simples e claras",
      "Confiança no parceiro",
    ],
    fears: [
      "Complicação desnecessária",
      "Perda de foco do negócio",
      "Entregar dados da empresa para estranhos",
      "Promessa que vira problema",
    ],
    language_style: "Estratégico e direto. Pensa em resultado, não em processo. Delega os detalhes.",
    decision_speed: "rapido",
    trust_builders: [
      "Confiança e referência pessoal",
      "Clareza sobre o que acontece e o que não acontece",
      "Velocidade — não enrolar",
      "Mostrar que você conhece o mercado dele",
    ],
    trust_breakers: [
      "Excesso de detalhes técnicos logo de início",
      "Parecer vendedor — não consultor",
      "Não saber responder perguntas básicas do setor",
      "Mencionar honorários antes de demonstrar valor",
    ],
    best_time: "Final da manhã — mais disponível após reuniões internas",
    ideal_entry: "Referência de empresa similar. Falar em dinheiro da empresa que pode estar sendo deixado para trás.",
    power_questions: [
      "Vocês já fizeram algum levantamento tributário estratégico?",
      "O setor de vocês está com pressão de margem?",
      "Quem cuida da parte fiscal da empresa?",
    ],
  },

  fiscal: {
    persona: "fiscal",
    label: "Responsável Fiscal / Tributário",
    wants: [
      "Profundidade técnica e embasamento jurídico",
      "Segurança e conformidade",
      "Complementariedade — não ameaça",
      "Ser reconhecido como especialista",
      "Análise séria, não pitch de vendas",
    ],
    fears: [
      "Ser 'substituído' ou ter o trabalho questionado",
      "Análise superficial ou tese sem fundamento",
      "Risco jurídico que vai cair no colo dele",
      "Mais trabalho sem estrutura adequada",
    ],
    language_style: "Técnico-jurídico. Conhece a legislação. Quer referências, não simplificações.",
    decision_speed: "deliberado",
    trust_builders: [
      "Demonstrar domínio técnico antes de propor qualquer coisa",
      "Posicionar como parceiro complementar, não como substituto",
      "Citar a legislação corretamente",
      "Perguntar sobre a operação antes de concluir",
    ],
    trust_breakers: [
      "Falar que 'o contador não viu isso'",
      "Simplificar demais — parece que não sabe o que está fazendo",
      "Não conhecer a norma que está citando",
      "Usar linguagem comercial — parece vendedor, não técnico",
    ],
    best_time: "Tarde — período de menor operação fiscal",
    ideal_entry: "Apresentar a revisão como complementar ao trabalho que já existe. Nunca como crítica.",
    power_questions: [
      "Qual o critério atual para aproveitamento de créditos PIS/COFINS?",
      "A revisão de insumos foi feita nos últimos 5 anos?",
      "Quais temas do STJ a empresa já acompanhou?",
      "Há auditoria interna ou externa para essa área?",
    ],
  },

  contador: {
    persona: "contador",
    label: "Contador / Escritório Contábil",
    wants: [
      "Complementariedade com o cliente em comum",
      "Profundidade técnica — não quer ser enganado",
      "Reputação protegida com o cliente",
      "Trabalho adicional que valorize, não ameace",
    ],
    fears: [
      "Perder o cliente para quem você está apresentando",
      "Parecer que não viu uma oportunidade óbvia",
      "Risco para o cliente que caia no colo dele",
      "Complexidade que não consegue acompanhar",
    ],
    language_style: "Técnico e cauteloso. Quer entender antes de recomendar. Pensa no cliente.",
    decision_speed: "consensual",
    trust_builders: [
      "Posicionar como parceiro do escritório, não concorrente",
      "Garantir que o cliente não é abordado sem a ciência do contador",
      "Mostrar que o trabalho complementa, não substitui",
      "Oferecer compartilhamento de análise técnica",
    ],
    trust_breakers: [
      "Abordar o cliente sem passar pelo contador",
      "Insinuar que o contador não viu algo",
      "Proposta de honorários direta com o cliente sem alinhar",
      "Falar em 'recuperação' sem detalhar o fundamento",
    ],
    best_time: "Fora do período de fechamento — segunda-feira e início da tarde",
    ideal_entry: "Posicionar como parceiro técnico especializado. Oferecer colaboração, não concorrência.",
    power_questions: [
      "A empresa já realizou revisão de créditos PIS/COFINS com base no REsp 1.221.170?",
      "Como você avalia o aproveitamento atual de créditos do cliente?",
      "Há interesse em uma análise técnica conjunta para identificar oportunidades?",
    ],
  },

  rh: {
    persona: "rh",
    label: "RH / Recursos Humanos",
    wants: [
      "Solução que não gere trabalho adicional",
      "Compliance — nada que cause problema com funcionários",
      "Processos simples e bem definidos",
      "Apoio da diretoria para implementar",
    ],
    fears: [
      "Gerar expectativa nos funcionários",
      "Processo burocrático que atrapalhe a rotina",
      "Responsabilidade por algo que dê errado",
      "Informações sigilosas compartilhadas",
    ],
    language_style: "Operacional e humano. Pensa em pessoas e processo, não em tributos.",
    decision_speed: "consensual",
    trust_builders: [
      "Mostrar que o processo é simples e não afeta o dia a dia do RH",
      "Garantir que os funcionários não são impactados negativamente",
      "Apresentar com a aprovação do CFO ou sócio",
    ],
    trust_breakers: [
      "Termos tributários sem explicação",
      "Parecer que vai criar trabalho extra",
      "Falar em mudança de processo sem estrutura",
    ],
    best_time: "Manhã — antes das demandas operacionais do dia",
    ideal_entry: "Apresentar pelo ângulo dos encargos sobre folha — impacto que pode beneficiar a estrutura da empresa.",
    power_questions: [
      "Como é o processo atual de gestão de encargos sobre folha?",
      "Quem é responsável pelo cálculo das verbas rescisórias?",
      "Há histórico de rescisões nos últimos 5 anos disponível?",
    ],
  },
}

export function getPersonaBehavior(persona: PersonaType): PersonaBehavior {
  return PERSONA_BEHAVIORS[persona]
}

export const PERSONA_LABELS: Record<PersonaType, string> = {
  cfo:      "CFO / Financeiro",
  socio:    "Sócio",
  fiscal:   "Fiscal / Tributário",
  contador: "Contador",
  rh:       "RH",
}
