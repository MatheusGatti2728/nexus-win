/**
 * NEXUS v18 — EMPRESAS DE TESTE
 *
 * CNPJs públicos selecionados para cobrir os 12 cenários do V18_TEST_PLAN.md
 * Todos os CNPJs são de domínio público (Receita Federal).
 *
 * COMO USAR:
 * 1. Acesse http://localhost:3000/dashboard
 * 2. Cole o CNPJ no campo
 * 3. Selecione o segmento/regime indicado
 * 4. Marque as flags indicadas
 * 5. Clique "Gerar Inteligência"
 * 6. Valide conforme o V18_TEST_PLAN.md
 */

export interface TestCompany {
  id:              number
  cenario:         string
  cnpj:            string
  razao_social:    string  // para referência — não usar como input
  segmento:        "servicos" | "comercio" | "industria"
  regime:          "lucro_real" | "lucro_presumido" | "simples_nacional"
  flags:           string[]
  // Valida----es esperadas
  expect: {
    narrativa_deve_conter:   string[]   // palavras-chave obrigatórias
    narrativa_nao_deve_ter:  string[]   // frases proibidas
    modulos_esperados:       string[]   // slugs esperados com score > 0
    modulos_bloqueados:      string[]   // slugs que devem ter score 0
    temperatura_minima:      "fria" | "morna" | "quente" | "muito_quente"
    sinais_esperados:        string[]   // tipos de sinal
    campos_obrigatorios:     string[]   // campos que não podem estar "A confirmar"
  }
  observacoes:     string
}

export const TEST_COMPANIES: TestCompany[] = [
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 01 --- Ind--stria / Lucro Real / Exporta----o
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 1,
    cenario: "01 — Indústria / Lucro Real / Com exportação",
    cnpj: "60.208.908/0001-50",  // Gerdau (Indústria Metalúrgica, LR, exportadora)
    razao_social: "GERDAU S.A.",
    segmento: "industria",
    regime: "lucro_real",
    flags: ["exportacao", "operacao_industrial", "folha_relevante"],
    expect: {
      narrativa_deve_conter: ["fabricação", "metalúrg", "industrial", "exportação", "B2B"],
      narrativa_nao_deve_ter: ["maturidade tributária média", "empresa de indústria no"],
      modulos_esperados: ["revisao_insumos_pis_cofins", "ipi_credito_presumido_exportacao", "verbas_indenizatorias", "sistema_s"],
      modulos_bloqueados: ["difal_pis_cofins"],
      temperatura_minima: "quente",
      sinais_esperados: ["industry", "export"],
      campos_obrigatorios: ["razao_social", "municipio", "cnae_descricao"],
    },
    observacoes: "Deve gerar narrativa industrial com foco em insumos e exportação. IPI Crédito Presumido deve mencionar 5,37%.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 02 --- Varejo Alimentar / Lucro Real
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 2,
    cenario: "02 — Varejo Alimentar / Lucro Real",
    cnpj: "47.508.411/0001-56",  // Companhia Brasileira de Distribuição (Pão de Açúcar)
    razao_social: "COMPANHIA BRASILEIRA DE DISTRIBUIÇÃO",
    segmento: "comercio",
    regime: "lucro_real",
    flags: ["icms_st", "venda_cartao"],
    expect: {
      narrativa_deve_conter: ["varejo", "alimento", "distribuição", "comércio"],
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: ["icms_st_pis_cofins", "icms_iss_acao_coletiva", "sistema_s"],
      modulos_bloqueados: ["ipi_credito_presumido_exportacao"],
      temperatura_minima: "quente",
      sinais_esperados: ["retail"],
      campos_obrigatorios: ["razao_social", "municipio", "cnae_descricao"],
    },
    observacoes: "Grande varejista — QSA pode não estar disponível para S/A. ICMS-ST deve aparecer como módulo prioritário.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 03 --- Servi--os TI / Lucro Real / Folha Relevante
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 3,
    cenario: "03 — Serviços TI / Lucro Real / Folha relevante",
    cnpj: "07.364.789/0001-50",  // TOTVS S.A. (Tecnologia)
    razao_social: "TOTVS S.A.",
    segmento: "servicos",
    regime: "lucro_real",
    flags: ["folha_relevante", "operacao_iss"],
    expect: {
      narrativa_deve_conter: ["tecnologia", "software", "serviços", "folha"],
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: ["verbas_indenizatorias", "sistema_s", "icms_iss_acao_coletiva"],
      modulos_bloqueados: ["ipi_credito_presumido_exportacao", "ipi_atacadista"],
      temperatura_minima: "morna",
      sinais_esperados: ["services"],
      campos_obrigatorios: ["razao_social", "municipio", "cnae_descricao"],
    },
    observacoes: "Empresa de TI — módulos industriais devem ter score 0. Folha intensiva = verbas + sistema S.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 04 --- Ind--stria / Lucro Presumido
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 4,
    cenario: "04 — Indústria / Lucro Presumido",
    cnpj: "61.189.288/0001-89",  // WEG Indústrias (pequena filial Lucro Presumido — usar CNPJ menor)
    razao_social: "Indústria de médio porte LP",
    segmento: "industria",
    regime: "lucro_presumido",
    flags: ["operacao_industrial"],
    expect: {
      narrativa_deve_conter: ["industrial", "fabricação"],
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: ["sistema_s", "verbas_indenizatorias"],
      modulos_bloqueados: [],  // LP pode ter PIS/COFINS cumulativo — score menor
      temperatura_minima: "morna",
      sinais_esperados: ["industry"],
      campos_obrigatorios: ["razao_social", "cnae_descricao"],
    },
    observacoes: "Lucro Presumido — módulos PIS/COFINS não-cumulativos terão score reduzido. Validar que score é menor que LR.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 05 --- Simples Nacional
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 5,
    cenario: "05 — Simples Nacional — validação de bloqueio",
    cnpj: "USE CNPJ PRÓPRIO DE MEI/SIMPLES",  // Qualquer CNPJ ativo no Simples
    razao_social: "Empresa Simples Nacional",
    segmento: "comercio",
    regime: "simples_nacional",
    flags: [],
    expect: {
      narrativa_deve_conter: [],
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: [],   // Sistema S pode aparecer
      modulos_bloqueados: ["icms_iss_acao_coletiva", "revisao_insumos_pis_cofins", "icms_st_pis_cofins"],  // CRÍTICO
      temperatura_minima: "fria",
      sinais_esperados: [],
      campos_obrigatorios: ["razao_social"],
    },
    observacoes: "TESTE CRÍTICO: módulos PIS/COFINS não-cumulativo devem ter score 0. Se aparecerem, é bug crítico.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 06 --- Com site institucional
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 6,
    cenario: "06 — Empresa com site encontrado",
    cnpj: "01.838.723/0001-27",  // Magazine Luiza
    razao_social: "MAGAZINE LUIZA S.A.",
    segmento: "comercio",
    regime: "lucro_real",
    flags: ["ecommerce", "icms_st", "venda_cartao"],
    expect: {
      narrativa_deve_conter: ["varejo", "comércio", "e-commerce"],
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: ["icms_st_pis_cofins", "difal_pis_cofins", "icms_iss_acao_coletiva"],
      modulos_bloqueados: [],
      temperatura_minima: "quente",
      sinais_esperados: ["retail", "ecommerce"],
      campos_obrigatorios: ["razao_social", "municipio", "cnae_descricao"],
    },
    observacoes: "E-commerce deve gerar sinal DIFAL. Validar se score de presença digital > 30.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 07 --- Empresa sem site
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 7,
    cenario: "07 — Empresa sem presença digital",
    cnpj: "USE CNPJ DE PEQUENA INDÚSTRIA LOCAL",
    razao_social: "Pequena indústria sem site",
    segmento: "industria",
    regime: "lucro_real",
    flags: ["operacao_industrial"],
    expect: {
      narrativa_deve_conter: [],   // Só CNAE disponível
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: ["sistema_s", "verbas_indenizatorias"],
      modulos_bloqueados: [],
      temperatura_minima: "morna",
      sinais_esperados: ["industry"],
      campos_obrigatorios: [],
    },
    observacoes: "Validar que aba Pesquisa mostra 'Site não encontrado'. Narrativa baseada apenas no CNAE — aceitável.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 08 --- QSA dispon--vel
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 8,
    cenario: "08 — Empresa com QSA da Receita Federal",
    cnpj: "USE CNPJ DE LTDA COM SÓCIOS CONHECIDOS",
    razao_social: "LTDA com sócios",
    segmento: "comercio",
    regime: "lucro_real",
    flags: [],
    expect: {
      narrativa_deve_conter: [],
      narrativa_nao_deve_ter: [],
      modulos_esperados: [],
      modulos_bloqueados: [],
      temperatura_minima: "morna",
      sinais_esperados: [],
      campos_obrigatorios: [],
    },
    observacoes: "Validar: sócios na aba Decisores com badge 'Receita Federal'. Abertura específica para o cargo do sócio.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 09 --- Sem QSA (S/A)
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 9,
    cenario: "09 — S/A sem QSA disponível",
    cnpj: "33.000.167/0001-01",  // Petrobras
    razao_social: "PETRÓLEO BRASILEIRO S.A.",
    segmento: "industria",
    regime: "lucro_real",
    flags: ["exportacao", "operacao_industrial"],
    expect: {
      narrativa_deve_conter: ["petrol", "industrial", "extração"],
      narrativa_nao_deve_ter: ["maturidade tributária média"],
      modulos_esperados: ["ipi_credito_presumido_exportacao", "revisao_insumos_pis_cofins"],
      modulos_bloqueados: [],
      temperatura_minima: "quente",
      sinais_esperados: ["industry", "export"],
      campos_obrigatorios: ["razao_social"],
    },
    observacoes: "QSA de S/A pode estar vazio — decisor deve aparecer como 'Inferido por segmento' com badge 'low'. Nunca inventar nome.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 10 --- Jur--dico sem resultado
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 10,
    cenario: "10 — Empresa conservadora sem histórico jurídico",
    cnpj: "USE CNPJ DE EMPRESA PEQUENA RECENTE",
    razao_social: "Empresa sem histórico jurídico",
    segmento: "servicos",
    regime: "lucro_presumido",
    flags: [],
    expect: {
      narrativa_deve_conter: [],
      narrativa_nao_deve_ter: [],
      modulos_esperados: [],
      modulos_bloqueados: [],
      temperatura_minima: "fria",
      sinais_esperados: [],
      campos_obrigatorios: [],
    },
    observacoes: "Diagnóstico > Jurídico deve mostrar maturity_level = 'none'. Nunca inventar processo. Playbook com abordagem educacional.",
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 11 --- Jur--dico com input manual
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 11,
    cenario: "11 — Input jurídico manual",
    cnpj: "USE QUALQUER CNPJ INDUSTRIAL",
    razao_social: "Qualquer empresa industrial",
    segmento: "industria",
    regime: "lucro_real",
    flags: ["operacao_industrial"],
    expect: {
      narrativa_deve_conter: [],
      narrativa_nao_deve_ter: [],
      modulos_esperados: [],
      modulos_bloqueados: [],
      temperatura_minima: "morna",
      sinais_esperados: [],
      campos_obrigatorios: [],
    },
    observacoes: `TESTE MANUAL: Após gerar, cole no campo court_input o texto:
"A empresa possui mandado de segurança no TRF3 envolvendo exclusão ICMS (tema 69) e PIS/COFINS sobre insumos. Escritório: Silva e Associados Advogados. OAB/SP 12345."
Validar: teses detectadas, escritório identificado, OAB extraído, maturity_level = 'medium' ou 'high', abertura no Playbook adaptada.`,
  },

  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  // CEN--RIO 12 --- CNPJs diferentes geram dados diferentes
  // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  {
    id: 12,
    cenario: "12 — Diferenciação entre empresas",
    cnpj: "TESTAR: 60.208.908/0001-50 E 47.508.411/0001-56",
    razao_social: "Comparação: Gerdau vs Pão de Açúcar",
    segmento: "industria",
    regime: "lucro_real",
    flags: [],
    expect: {
      narrativa_deve_conter: [],
      narrativa_nao_deve_ter: [],
      modulos_esperados: [],
      modulos_bloqueados: [],
      temperatura_minima: "morna",
      sinais_esperados: [],
      campos_obrigatorios: [],
    },
    observacoes: "Testar os dois CNPJs separadamente. Narrativas devem ser completamente diferentes. Módulos recomendados devem diferir. Aberturas do Playbook devem diferir.",
  },
]

// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// HELPER: verificar resultado do teste
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

export function verificarResultado(
  company: TestCompany,
  resultado: {
    narrativa_operacional: string
    modulos_recomendados: Array<{ slug: string; score: number }>
    temperatura: string
    sinais: Array<{ type: string }>
    campos: Record<string, string>
  }
): { aprovado: boolean; falhas: string[]; avisos: string[] } {
  const falhas: string[] = []
  const avisos: string[] = []

  // Check frases proibidas
  for (const frase of company.expect.narrativa_nao_deve_ter) {
    if (resultado.narrativa_operacional.toLowerCase().includes(frase.toLowerCase())) {
      falhas.push(`Frase proibida encontrada na narrativa: "${frase}"`)
    }
  }

  // Check palavras esperadas
  for (const palavra of company.expect.narrativa_deve_conter) {
    if (!resultado.narrativa_operacional.toLowerCase().includes(palavra.toLowerCase())) {
      avisos.push(`Palavra esperada ausente na narrativa: "${palavra}"`)
    }
  }

  // Check m--dulos bloqueados
  for (const slug of company.expect.modulos_bloqueados) {
    const mod = resultado.modulos_recomendados.find(m => m.slug === slug)
    if (mod && mod.score > 0) {
      falhas.push(`CRÍTICO: módulo bloqueado "${slug}" aparece com score ${mod.score}`)
    }
  }

  // Check temperatura m--nima
  const tempOrder = ["fria", "morna", "quente", "muito_quente"]
  const minIdx = tempOrder.indexOf(company.expect.temperatura_minima)
  const actualIdx = tempOrder.indexOf(resultado.temperatura)
  if (actualIdx < minIdx) {
    avisos.push(`Temperatura ${resultado.temperatura} abaixo do esperado (mínimo: ${company.expect.temperatura_minima})`)
  }

  // Check sinais esperados
  for (const tipo of company.expect.sinais_esperados) {
    if (!resultado.sinais.some(s => s.type === tipo)) {
      avisos.push(`Sinal esperado "${tipo}" não gerado`)
    }
  }

  return { aprovado: falhas.length === 0, falhas, avisos }
}
