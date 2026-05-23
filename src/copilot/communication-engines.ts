// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// NEXUS COPILOT --- Communication Engines
// What Not To Say / Email / WhatsApp / Follow-up
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import type { CompanyContext } from "../engine/rule-engine"
import type {
  WhatNotToSay, GeneratedEmail, WhatsAppMessage, FollowupMessage,
  PersonaType, CompanySnapshot, FollowupStage
} from "./types"
import { SEGMENT_LABELS, REGIME_LABELS } from "../engine/tax-matrix"

// --------- What Not To Say ------------------------------------------------------------------------------------------------------------------------------

export function buildWhatNotToSay(): WhatNotToSay {
  return {
    banned_phrases: [
      { phrase: "recuperação tributária", why: "Saturou o mercado. O cliente já ouviu isso de 10 pessoas essa semana.", use_instead: "revisão estratégica" },
      { phrase: "ganho garantido", why: "Cria expectativa impossível. Destrói credibilidade se não se concretizar.", use_instead: "potencial identificado" },
      { phrase: "levantamos dinheiro", why: "Linguagem de vendedor, não de consultor. Gera resistência imediata.", use_instead: "identificamos créditos não aproveitados" },
      { phrase: "seu contador não viu isso", why: "Alienar o contador = perder o acesso ao cliente.", use_instead: "análise complementar ao trabalho contábil" },
      { phrase: "oportunidade tributária", why: "Genérico. Todo concorrente usa. Não diferencia.", use_instead: "comportamento fiscal específico da operação de vocês" },
      { phrase: "recuperação de créditos", why: "Percepção de risco. Soar como atividade discutível.", use_instead: "aproveitamento de créditos existentes" },
      { phrase: "prazo se esgotando", why: "Urgência artificial. O cliente percebe e desconfia.", use_instead: "o período retroativo ainda está disponível" },
      { phrase: "estratégias fiscais", why: "Genérico e associado a evasão no imaginário popular.", use_instead: "revisão de comportamento tributário" },
      { phrase: "crédito tributário", why: "Muito técnico para primeiro contato com sócio ou CFO leigo.", use_instead: "valor que deveria ter ficado na empresa" },
    ],
    tone_traps: [
      "Falar mais do que perguntar no primeiro contato",
      "Usar dez palavras onde bastam três",
      "Começar pela solução antes de entender o problema",
      "Citar concorrentes — nunca",
      "Parecer animado demais com a oportunidade — cria suspeita",
      "Pressionar para reunião quando o lead está frio",
    ],
    persona_specific: {
      cfo: [
        "Não use: 'recuperação' — use 'eficiência tributária'",
        "Não prometa valor antes de ver os dados",
        "Não mencione honorários antes de demonstrar valor",
        "Não fale de prazo como argumento de venda",
      ],
      socio: [
        "Não use excesso de detalhes técnicos — perde o interesse",
        "Não pareça vendedor — pareça consultor experiente",
        "Não fale em 'processo' — fale em 'resultado'",
      ],
      fiscal: [
        "Jamais insinue que ele não fez o trabalho corretamente",
        "Não use linguagem comercial — fale tecnicamente",
        "Não simplifique a norma — ele sabe mais do que parece",
      ],
      contador: [
        "Nunca aborde o cliente sem antes alinhar com o contador",
        "Não posicione como substituto — sempre como parceiro",
        "Não mencione honorários com o cliente sem o contador presente",
      ],
      rh: [
        "Não use termos tributários técnicos — traduza para linguagem de pessoas e processo",
        "Não prometa que vai gerar trabalho extra para o RH",
        "Não fale em 'recuperação' — fale em 'eficiência de encargos'",
      ],
    },
  }
}

// --------- Email Engine ---------------------------------------------------------------------------------------------------------------------------------------

export function generateEmail(
  ctx:      CompanyContext,
  persona:  PersonaType,
  snapshot: CompanySnapshot,
  modules:  Array<{ name: string; first_pitch: string }>,
): GeneratedEmail {
  const seg    = SEGMENT_LABELS[ctx.consultant.segment]
  const regime = REGIME_LABELS[ctx.consultant.tax_regime]
  const nome   = ctx.razao_social.split(" ")[0]
  const flags  = ctx.consultant.operation_flags ?? []

  // Company-specific subject --- never "oportunidade tribut--ria"
  const subjectMap: Record<PersonaType, string> = {
    cfo: flags.includes("venda_cartao")
      ? `${nome} — taxas de cartão e PIS/COFINS: análise rápida`
      : flags.includes("icms_st")
      ? `${nome} — revisão de ST na base PIS/COFINS (Tema 1.125 STJ)`
      : `${nome} — revisão tributária estratégica para ${seg}`,
    socio: `${nome} — identificamos algo no perfil de vocês`,
    fiscal: flags.includes("exportacao")
      ? `${nome} — crédito presumido de IPI (Lei 9.363/96): revisão dos 60 meses`
      : `${nome} — revisão complementar PIS/COFINS e encargos`,
    contador: `Revisão complementar para ${nome} — análise conjunta`,
    rh: `${nome} — eficiência de encargos sobre folha`,
  }

  const previewMap: Record<PersonaType, string> = {
    cfo:      "Identificamos comportamentos fiscais específicos da operação de vocês.",
    socio:    "Algo no perfil da empresa que merece 5 minutos da sua atenção.",
    fiscal:   "Revisão técnica complementar com base em jurisprudência recente.",
    contador: "Proposta de análise conjunta para um cliente em comum.",
    rh:       "Oportunidade de eficiência nos encargos sobre folha.",
  }

  const topModule = modules[0]
  const module2   = modules[1]

  const bodyMap: Record<PersonaType, string> = {
    cfo: `Olá, [Nome],

Trabalho com revisão tributária estratégica para empresas de ${seg.toLowerCase()} no ${regime}.

Analisando o perfil público de ${ctx.razao_social}, identificamos alguns comportamentos fiscais específicos da operação de vocês que raramente passam pela revisão contábil cotidiana — especialmente em relação a ${topModule?.name ?? "créditos de PIS/COFINS"}${module2 ? ` e ${module2.name}` : ""}.

${topModule?.first_pitch ?? ""}

Não estamos propondo nada ainda. Antes de qualquer análise profunda, precisaria de 20 minutos para entender a operação de vocês e verificar se o que identificamos é de fato aplicável.

Você teria disponibilidade semana que vem?

[Nome do Consultor]`,

    socio: `Olá, [Nome],

Identifiquei algo no perfil da ${ctx.razao_social} que me fez querer entrar em contato antes de abordar qualquer outra pessoa na empresa.

Trabalho com revisão de comportamento tributário para empresas de ${seg.toLowerCase()} — e o perfil de vocês apresenta alguns sinais que merecem uma análise mais aprofundada.

Não é nada de risco. É o oposto: é o que pode beneficiar a empresa.

Posso enviar um resumo de 1 página com o que identificamos?

[Nome do Consultor]`,

    fiscal: `Olá, [Nome],

Sou especialista em revisão de PIS/COFINS para ${seg.toLowerCase()}.

Analisando o perfil de ${ctx.razao_social}, identifiquei comportamentos relacionados a ${topModule?.name ?? "créditos"} que têm base jurídica consolidada mas raramente são revisados em profundidade — especialmente o período retroativo disponível.

Minha proposta é simples: uma call técnica de 30 minutos para você avaliar se o que identifiquei é aplicável à operação de vocês. Se já estiver feito, ótimo — só quero confirmar.

Tem disponibilidade?

[Nome do Consultor]`,

    contador: `Olá, [Nome],

Trabalho com revisão tributária complementar ao trabalho dos escritórios contábeis — especialmente em temas de jurisprudência recente que demandam análise específica.

Identificamos no perfil de um dos seus clientes (${ctx.razao_social}) oportunidades relacionadas a ${topModule?.name ?? "créditos de PIS/COFINS"} que merecem análise conjunta antes de qualquer movimentação.

Gostaria de alinhar com você antes de qualquer coisa — a postura do nosso trabalho é sempre complementar, nunca concorrente.

Podemos conversar 20 minutos?

[Nome do Consultor]`,

    rh: `Olá, [Nome],

Trabalho com eficiência de encargos sobre folha para empresas do setor.

Analisando o perfil de ${ctx.razao_social}, identifiquei algo relacionado à área previdenciária que pode impactar positivamente a empresa — sem gerar nenhuma complexidade para a equipe de RH.

O processo é simples e não afeta os colaboradores de nenhuma forma.

Posso enviar um resumo rápido por e-mail para você avaliar?

[Nome do Consultor]`,
  }

  const psMap: Record<PersonaType, string> = {
    cfo:      `P.S. Não é necessário enviar nenhum documento nessa etapa — a análise inicial é baseada em dados públicos e nas informações que você me passar na conversa.`,
    socio:    `P.S. Se quiser, posso enviar um resumo de 1 página com o que identificamos antes de marcar qualquer conversa.`,
    fiscal:   `P.S. Se a revisão já foi feita, fico feliz em confirmar. Se não, a call de 30 minutos é suficiente para uma avaliação técnica inicial.`,
    contador: `P.S. Nenhuma movimentação com o cliente será feita sem seu conhecimento e aprovação prévia.`,
    rh:       `P.S. Nenhum impacto para os colaboradores em nenhuma etapa do processo.`,
  }

  return {
    subject:         subjectMap[persona],
    preview_text:    previewMap[persona],
    body:            bodyMap[persona],
    ps:              psMap[persona],
    tone:            "Consultivo, direto, sem pressão. Primeira leitura em menos de 30 segundos.",
    ideal_send_time: "Terça a quinta, 8h–9h ou 14h–15h. Evitar segundas e sextas.",
  }
}

// --------- WhatsApp Engine ------------------------------------------------------------------------------------------------------------------------------

export function generateWhatsApp(
  ctx:     CompanyContext,
  persona: PersonaType,
  stage:   "primeiro_contato" | "follow_up" | "quebra_silencio" | "pos_reuniao" = "primeiro_contato",
): WhatsAppMessage {
  const nome   = ctx.razao_social.split(" ")[0]
  const seg    = SEGMENT_LABELS[ctx.consultant.segment].toLowerCase()
  const flags  = ctx.consultant.operation_flags ?? []

  const messages: Record<typeof stage, Record<PersonaType, string>> = {
    primeiro_contato: {
      cfo:
        `Oi [Nome], tudo bem? Sou [Consultor].\n\nTrabalho com revisão tributária para empresas de ${seg} — e identificamos algo no perfil de ${nome} que vale 2 minutos da sua atenção.\n\nPosso mandar um resumo rápido por e-mail?`,
      socio:
        `Oi [Nome], tudo bem? Sou [Consultor].\n\nIdentifiquei algo no perfil da ${nome} que muitas empresas do seu setor estão revisando agora.\n\nNão é nada complicado. Posso mandar um resumo rápido?`,
      fiscal:
        `Oi [Nome], tudo bem? Sou [Consultor], especialista em PIS/COFINS para ${seg}.\n\nIdentifiquei alguns pontos no perfil de ${nome} relacionados a ${flags.includes("icms_st") ? "ICMS-ST e PIS/COFINS" : flags.includes("exportacao") ? "IPI Exportação" : "créditos não aproveitados"} que vale uma conversa técnica rápida.\n\nTem disponibilidade?`,
      contador:
        `Oi [Nome], tudo bem? Sou [Consultor].\n\nTrabalho com revisão tributária complementar ao trabalho dos escritórios. Identifiquei algo no ${nome} que queria alinhar com você antes de qualquer contato com o cliente.\n\nPodemos falar 15 minutos?`,
      rh:
        `Oi [Nome], tudo bem? Sou [Consultor].\n\nTrabalho com encargos sobre folha — e identifiquei algo no perfil de ${nome} que pode beneficiar a empresa sem nenhum impacto para os colaboradores.\n\nPosso mandar um resumo rápido?`,
    },
    follow_up: {
      cfo:      `Oi [Nome]! Só queria confirmar se chegou o e-mail que mandei. Caso não tenha visto, o assunto era sobre o perfil de ${nome}. Fica à vontade para responder quando tiver 5 minutos.`,
      socio:    `Oi [Nome]! Só passando para ver se teve chance de ver o e-mail. Sem pressa — qualquer dúvida é só me falar.`,
      fiscal:   `Oi [Nome]! Só confirmando o recebimento do e-mail sobre o perfil de ${nome}. Posso mandar um resumo mais técnico se preferir.`,
      contador: `Oi [Nome]! Confirmo o recebimento e aguardo retorno quando tiver disponibilidade.`,
      rh:       `Oi [Nome]! Só confirmando se chegou o e-mail. Qualquer dúvida é só falar!`,
    },
    quebra_silencio: {
      cfo:      `Oi [Nome], tudo bem? Não quero insistir — só passando para deixar o contato aberto. Se fizer sentido conversar em outro momento, fico à disposição.`,
      socio:    `Oi [Nome]! Sei que está corrido. Se em algum momento fizer sentido revisitar isso, é só me chamar. Fico à disposição.`,
      fiscal:   `Oi [Nome]! Deixo meu contato disponível. Se em algum momento quiser discutir os pontos que levantei, é só me chamar.`,
      contador: `Oi [Nome]! Deixo o canal aberto para quando fizer sentido. Sem pressa.`,
      rh:       `Oi [Nome]! Fico à disposição quando for conveniente. Qualquer dúvida é só me chamar.`,
    },
    pos_reuniao: {
      cfo:      `Oi [Nome]! Foi ótimo conversar. Vou enviar o resumo que combinamos por e-mail ainda hoje. Qualquer dúvida que surgir antes, pode me chamar.`,
      socio:    `Oi [Nome]! Ótima conversa! Vou enviar o resumo por e-mail. Qualquer dúvida é só falar.`,
      fiscal:   `Oi [Nome]! Foi uma ótima troca técnica. Vou formalizar os pontos levantados por e-mail com as referências legais. Qualquer dúvida pode me chamar.`,
      contador: `Oi [Nome]! Foi ótima a conversa. Vou formalizar a proposta de trabalho conjunto por e-mail ainda hoje.`,
      rh:       `Oi [Nome]! Obrigado pela atenção. Vou enviar o resumo do que conversamos por e-mail para facilitar a apresentação interna.`,
    },
  }

  const text = messages[stage][persona]

  const hasRedFlags = text.includes("recuperação") || text.includes("garantido") || text.length > 400

  return {
    text,
    character_count: text.length,
    tone_check: text.length <= 300 ? "✓ Curto e natural" : "⚠ Considere encurtar",
    avoid_reason: hasRedFlags ? "Mensagem pode parecer automatizada — revisar antes de enviar" : undefined,
  }
}

// --------- Follow-up Engine ---------------------------------------------------------------------------------------------------------------------------

export function generateFollowups(
  ctx:     CompanyContext,
  persona: PersonaType,
): FollowupMessage[] {
  const nome = ctx.razao_social.split(" ")[0]
  const seg  = SEGMENT_LABELS[ctx.consultant.segment].toLowerCase()

  return [
    {
      stage:     "d0_first_contact",
      day:       "D+0",
      channel:   "email",
      subject:   `${nome} — análise preliminar do perfil tributário`,
      objective: "Apresentar valor antes de pedir reunião",
      trigger:   "Imediatamente após o primeiro contato",
      text:      `Conforme conversamos: vou enviar o resumo com o que identificamos no perfil de ${nome}. O objetivo é dar contexto antes de qualquer reunião.`,
    },
    {
      stage:     "d3_warm_follow",
      day:       "D+3",
      channel:   "whatsapp",
      objective: "Verificar recebimento sem pressionar",
      trigger:   "3 dias após envio do e-mail, sem resposta",
      text:      `Oi [Nome]! Só passando para confirmar o recebimento do e-mail sobre ${nome}. Sem pressa — qualquer dúvida é só falar.`,
    },
    {
      stage:     "d7_value_add",
      day:       "D+7",
      channel:   "email",
      subject:   `${nome} — dado adicional que pode ser relevante`,
      objective: "Adicionar valor sem pedir nada — construir credibilidade",
      trigger:   "7 dias após primeiro contato, sem resposta",
      text:      `Olá [Nome],\n\nNão quero insistir — mas identifiquei um dado adicional sobre o setor de ${seg} que pode ser relevante para vocês:\n\n[Inserir dado relevante de jurisprudência ou mercado relacionado à empresa]\n\nFico à disposição caso queira conversar.\n\n[Consultor]`,
    },
    {
      stage:     "post_meeting",
      day:       "D+0 (pós reunião)",
      channel:   "email",
      subject:   `${nome} — resumo da conversa e próximos passos`,
      objective: "Formalizar o que foi combinado e manter o momentum",
      trigger:   "Dentro de 2 horas após a reunião",
      text:      `Olá [Nome],\n\nFoi ótima a conversa de hoje.\n\nComo combinado:\n— [Próximo passo 1]\n— [Próximo passo 2]\n\nVou enviar a análise detalhada até [prazo combinado].\n\nQualquer dúvida, fico à disposição.\n\n[Consultor]`,
    },
    {
      stage:     "no_response_break_silence",
      day:       "D+14",
      channel:   "email",
      subject:   `${nome} — última mensagem`,
      objective: "Quebrar o silêncio sem pressão — deixar o canal aberto",
      trigger:   "14 dias sem resposta após múltiplos contatos",
      text:      `Olá [Nome],\n\nNão quero ser insistente — entendo que o timing pode não ser o certo agora.\n\nDeixo meu contato aberto para quando fizer sentido revisitar a conversa sobre ${nome}.\n\nQualquer mudança de cenário que justifique uma conversa, é só me chamar.\n\n[Consultor]`,
    },
    {
      stage:     "authority_reinforcement",
      day:       "D+21",
      channel:   "email",
      subject:   `Atualização relevante para empresas de ${seg}`,
      objective: "Reforçar autoridade com conteúdo útil sem pedir nada",
      trigger:   "Após silêncio — reengajamento por valor",
      text:      `Olá [Nome],\n\nCompartilho algo que pode ser relevante para empresas de ${seg}:\n\n[Inserir atualização jurisprudencial ou regulatória relevante]\n\nNão é uma proposta — só achei que poderia ser útil para vocês.\n\nFico à disposição.\n\n[Consultor]`,
    },
  ]
}
