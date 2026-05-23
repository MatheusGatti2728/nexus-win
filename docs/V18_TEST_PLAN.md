# NEXUS v18 — PLANO DE TESTE

**Versão:** v18
**Data:** 18/05/2026
**Objetivo:** Validar profundidade real de informação antes de uso em prospecção real

---

## COMO RODAR

```cmd
rmdir /s /q C:\Users\matheus.gatti\Downloads\nexus-win
tar -xf C:\Users\matheus.gatti\Downloads\nexus-app-v18.zip -C C:\Users\matheus.gatti\Downloads\
cd C:\Users\matheus.gatti\Downloads\nexus-win
pnpm install
pnpm approve-builds esbuild
pnpm dev
```

Acesse: **http://localhost:3000/dashboard**

---

## CHECKLIST GERAL (executar para cada CNPJ testado)

### EMPRESA > RESUMO

- [ ] Razão social exibida corretamente
- [ ] CNPJ formatado (XX.XXX.XXX/XXXX-XX)
- [ ] Cidade/UF presente
- [ ] CNAE principal descrito (não apenas o código)
- [ ] Data de abertura + idade em anos
- [ ] Capital social (se disponível — pode ser "A confirmar")
- [ ] Natureza jurídica
- [ ] Situação cadastral (Ativa/Inapta/etc)
- [ ] QSA/Sócios listados quando disponíveis
- [ ] Badge "Receita Federal" aparece quando dados são reais

### EMPRESA > OPERAÇÃO

- [ ] Narrativa operacional **não** contém: "empresa com maturidade tributária", "empresa de segmento"
- [ ] Narrativa menciona o CNAE real da empresa
- [ ] Narrativa menciona a localização (cidade/UF)
- [ ] Exposição tributária provável lista temas específicos (não "temas gerais")
- [ ] Pelo menos 1 sinal operacional gerado
- [ ] Cada sinal tem: evidência + impacto operacional + impacto tributário + leitura comercial
- [ ] Temperatura comercial é explicada com razões específicas

### EMPRESA > SINAIS

- [ ] Sinais listam tipo + evidência + fonte + confiança
- [ ] Nenhum sinal diz apenas "empresa tem potencial"
- [ ] Confiança é coerente com a fonte (Receita Federal = high, site = medium, inferido = low)

### EMPRESA > DECISORES

- [ ] QSA da Receita Federal aparece (quando disponível)
- [ ] Abertura recomendada é específica para o cargo
- [ ] TRF competente correto para a UF da empresa
- [ ] Diagnóstico jurídico não inventa processos

### OPORTUNIDADES

- [ ] Score diferente de 0 para pelo menos 1 módulo (exceto Simples Nacional em PIS/COFINS)
- [ ] Módulo expandido mostra: resumo executivo + por que cabe para esta empresa
- [ ] Módulo expandido mostra: como introduzir na ligação
- [ ] Módulo expandido mostra: linguagem exata com botão copiar
- [ ] Módulo expandido mostra: curiosity trigger
- [ ] Módulo expandido mostra: questionamentos esperados + respostas
- [ ] Módulo expandido mostra: fundamento jurídico (STJ/STF/Lei)
- [ ] Módulo expandido mostra: período retroativo ("60 meses")
- [ ] "Por que cabe para esta empresa" menciona algo específico da empresa (CNAE, sinais ou regime)

### PLAYBOOK

- [ ] Abertura usa dados reais da empresa (nome, segmento, localização)
- [ ] Não contém: "tenho oportunidade tributária", "tem 2 minutos?", "recuperação tributária"
- [ ] Abertura frame de monitoramento (não de prospecção)
- [ ] Q&A das objeções tem pergunta de follow-up e "nunca dizer"
- [ ] WhatsApp < 450 chars e sem frases proibidas
- [ ] E-mail tem assunto específico (não genérico)

### DIAGNÓSTICO

- [ ] Lista fontes consultadas
- [ ] Lista campos reais vs estimados
- [ ] Jurídico mostra TRF competente
- [ ] Jurídico diz claramente quando não encontrou processos
- [ ] Diagnóstico não inventa advogado ou processo

---

## CENÁRIOS DE TESTE

### CENÁRIO 01 — Indústria / Lucro Real / Com exportação
**CNPJ sugerido:** Buscar empresa industrial exportadora no segmento de embalagens em SP

**Input:**
- Segmento: Indústria
- Regime: Lucro Real
- Flags: Exportação, Operação Industrial

**Resultados esperados:**
- Narrativa: menciona fabricação, B2B, insumos
- Sinais: Operação industrial (high) + Exportação (medium se site confirmar)
- Módulos obrigatórios: `revisao_insumos_pis_cofins`, `ipi_credito_presumido_exportacao`, `verbas_indenizatorias`, `sistema_s`
- Módulos bloqueados: `difal_pis_cofins` (sem e-commerce)
- Curiosity trigger de exportação deve mencionar "5,37%"
- Temperatura: quente ou muito quente

**Critério de reprovação:**
- Narrativa genérica sem mencionar fabricação/insumos
- IPI Crédito Presumido sem mencionar alíquota 5,37%
- Temperatura fria (incompatível com o perfil)

---

### CENÁRIO 02 — Varejo Alimentar / Lucro Real
**CNPJ sugerido:** Rede de supermercados regional (Lucro Real)

**Input:**
- Segmento: Comércio
- Regime: Lucro Real
- Flags: ICMS-ST, Venda em Cartão

**Resultados esperados:**
- Narrativa: menciona comércio varejista, ICMS-ST embutido, alto volume de cartões
- Sinais: Varejo (high se CNAE confirmar) + possível E-commerce (se site indicar)
- Módulos obrigatórios: `icms_st_pis_cofins`, `icms_iss_acao_coletiva`, `sistema_s`
- Tax exposure: deve mencionar Tema 1.125 STJ e taxas de maquininha

**Critério de reprovação:**
- Narrativa não menciona ICMS-ST
- Nenhum módulo de varejo recomendado

---

### CENÁRIO 03 — Serviços / Lucro Real / Folha relevante
**CNPJ sugerido:** Consultoria ou empresa de TI (Lucro Real)

**Input:**
- Segmento: Serviços
- Regime: Lucro Real
- Flags: Folha Relevante, ISS

**Resultados esperados:**
- Narrativa: menciona prestação de serviços, folha intensiva, ISS
- Sinais: Serviços com menção a folha e ISS
- Módulos obrigatórios: `verbas_indenizatorias`, `sistema_s`, `icms_iss_acao_coletiva`
- Módulos bloqueados: `ipi_credito_presumido_exportacao` (sem exportação)

**Critério de reprovação:**
- Módulos de indústria recomendados para empresa de serviços

---

### CENÁRIO 04 — Indústria / Lucro Presumido
**CNPJ sugerido:** Indústria média no Lucro Presumido

**Input:**
- Segmento: Indústria
- Regime: Lucro Presumido

**Resultados esperados:**
- Score menor em módulos PIS/COFINS (Lucro Presumido tem restrições)
- `revisao_insumos_pis_cofins` pode ter score reduzido
- Narrativa industrial preservada
- Temperatura adequada ao porte

---

### CENÁRIO 05 — Simples Nacional
**CNPJ sugerido:** Pequena empresa no Simples Nacional

**Input:**
- Qualquer segmento
- Regime: Simples Nacional

**Resultados esperados:**
- Módulos de PIS/COFINS não-cumulativo com score 0 ou bloqueados
- Mensagem explicando por que (Simples unifica tributos)
- `sistema_s` e `verbas_indenizatorias` ainda podem aparecer se houver folha
- Score geral baixo (correto)

**Critério de reprovação:**
- Módulos de PIS/COFINS não-cumulativo recomendados para Simples Nacional
- Isso é um bug crítico

---

### CENÁRIO 06 — Empresa com site encontrado
**CNPJ sugerido:** Empresa com site .com.br bem estruturado

**Input:**
- Qualquer segmento e regime
- URL do site informada manualmente ou detectada

**Resultados esperados:**
- Aba Pesquisa: site encontrado com URL clicável
- Sinais adicionais baseados no site (e-commerce, exportação, ESG, certificações)
- Score de presença digital > 25
- Narrativa enriquecida com informações do site

---

### CENÁRIO 07 — Empresa sem site
**CNPJ sugerido:** Empresa industrial sem presença digital relevante

**Input:**
- URL não informada
- Domínio não padronizado

**Resultados esperados:**
- Aba Pesquisa: "Site não encontrado em X domínios candidatos"
- Data gap listado: "Site não encontrado — operação a confirmar na ligação"
- Sinais apenas de CNAE (sem sinais de site)
- Narrativa baseada apenas no CNAE (válido)

**Critério de reprovação:**
- Sistema inventa URL de site
- Sistema afirma "site encontrado" com conteúdo genérico

---

### CENÁRIO 08 — Empresa com QSA disponível
**CNPJ sugerido:** Empresa com sócios na Receita Federal

**Input:**
- Qualquer CNPJ com QSA disponível (maioria das LTDAs)

**Resultados esperados:**
- Aba Empresa > Decisores: sócios listados com badge "Receita Federal"
- Cada sócio tem: abertura recomendada específica para o cargo
- Abertura do Playbook considera o perfil do sócio/administrador
- Classificação de cargo (CFO, Sócio, Fiscal, etc.) coerente com a qualificação

---

### CENÁRIO 09 — Empresa sem QSA
**CNPJ sugerido:** S/A ou empresa com QSA indisponível

**Input:**
- CNPJ de empresa S/A ou EIRELI com QSA não retornado

**Resultados esperados:**
- Aba Decisores: "Decisor a identificar — inferido por segmento" com badge "low"
- Abertura inferida pelo segmento (não inventada por nome)
- Data gap: "QSA não disponível — sócios a confirmar"
- Playbook usa persona genérica do segmento

**Critério de reprovação:**
- Sistema inventa nome de sócio sem fonte

---

### CENÁRIO 10 — Jurídico sem resultado
**CNPJ sugerido:** Empresa conservadora sem histórico jurídico identificado

**Input:**
- CNPJ de empresa pequena/média sem processos públicos
- Campo `court_input` vazio

**Resultados esperados:**
- Diagnóstico > Jurídico: maturity_level = "none"
- Texto: "Nenhuma ação tributária identificada automaticamente"
- Texto: lista de fontes tentadas (Google News proxy, etc.)
- Playbook: abordagem educacional recomendada
- Nenhum processo, advogado ou OAB inventado

**Critério de reprovação:**
- Sistema exibe processo sem ter sido informado
- Sistema inventa advogado

---

### CENÁRIO 11 — Jurídico com input manual
**Input:**
- Colar no campo `court_input` texto do JusBrasil contendo: "mandado de segurança tema 69 pis/cofins sistema s escritório Silva Advogados OAB/SP 12345"

**Resultados esperados:**
- Temas detectados: PIS/COFINS, Sistema S (pelo menos 2)
- Law firms: "Silva Advogados" identificado
- OAB: "OAB/SP 12345" extraído
- Maturity level: "medium" ou "high"
- Playbook: abertura adaptada ("empresa já possui maturidade jurídica...")
- Abordagem: técnica (não educacional)

---

### CENÁRIO 12 — CNPJs diferentes geram dados diferentes
**Input:** Dois CNPJs completamente diferentes

**Validação:**
- Narrativas operacionais devem ser **diferentes**
- Módulos recomendados devem ser **diferentes** (ou com scores diferentes)
- Temperaturas comerciais podem diferir
- Aberturas do Playbook devem ser **diferentes**

**Critério de reprovação:** Dois CNPJs diferentes gerando conteúdo idêntico = sistema com dados estáticos/mockados.

---

## CAMPOS OBRIGATÓRIOS POR ÁREA

### Empresa > Resumo
| Campo | Obrigatório | Fonte esperada |
|-------|-------------|----------------|
| Razão social | ✅ Sim | Receita Federal |
| CNPJ | ✅ Sim | Input |
| CNAE principal | ✅ Sim | Receita Federal |
| Município/UF | ✅ Sim | Receita Federal |
| Data de abertura | ✅ Sim | Receita Federal |
| Capital social | ⚠️ Quando disponível | ReceitaWS/CNPJ.ws |
| QSA | ⚠️ Quando disponível | Receita Federal |

### Operação > Sinal
| Campo | Obrigatório |
|-------|-------------|
| `label` | ✅ Sim |
| `evidence` | ✅ Sim — não pode ser vazio |
| `source` | ✅ Sim |
| `confidence` | ✅ Sim (low/medium/high) |
| `tax_impact` | ✅ Sim — deve mencionar tema específico |
| `operational_impact` | ✅ Sim (v18) |
| `commercial_read` | ✅ Sim (v18) |

### Oportunidade (expandida)
| Campo | Obrigatório | Versão |
|-------|-------------|--------|
| `name` | ✅ | v1+ |
| `score` | ✅ | v1+ |
| `risk_level` | ✅ | v1+ |
| `why_it_fits_this_company` | ✅ | v1+ |
| `executive_summary` | ✅ | **v18** |
| `commercial_read` | ✅ | **v18** |
| `curiosity_trigger` | ✅ | **v18** |
| `expected_questions` | ✅ | **v18** |
| `legal_basis` | ✅ | **v18** |
| `retroactive_period` | ✅ | **v18** |
| `how_to_use_in_call` | ✅ | **v18** |

---

## FRASES PROIBIDAS

Se qualquer uma dessas aparecer no Playbook, reprovar:

```
"tenho oportunidade tributária"
"tem 2 minutos?"
"você teria disponibilidade?"
"recuperação tributária" (como abertura)
"trabalhamos com empresas do Lucro Real"
"posso mandar um e-mail?" (como primeira resposta)
"ganho garantido"
```

Se qualquer uma aparecer em Operação ou Sinais, reprovar:

```
"empresa com maturidade tributária média"
"empresa de [segmento] no [regime]" (como narrativa única)
"análise tributária estratégica" (sem mais detalhes)
"potencial tributário identificado" (sem evidência)
```

---

## COMO REPORTAR ERRO

Use este formato para cada bug encontrado:

```
CENÁRIO: [número e nome do cenário]
CNPJ: [CNPJ testado]
SEGMENTO/REGIME: [configuração usada]
ÁREA: [Empresa|Oportunidades|Playbook|Diagnóstico]
SUB-ÁREA: [Resumo|Operação|Decisores|etc]
COMPORTAMENTO ESPERADO: [o que deveria aparecer]
COMPORTAMENTO ATUAL: [o que apareceu — copiar texto exato]
SEVERIDADE: [crítico|alto|médio|baixo]
```

**Severidades:**
- **Crítico:** dado inventado sem fonte / crash / Simples Nacional com módulos PIS/COFINS
- **Alto:** narrativa genérica proibida / campo obrigatório vazio / frases proibidas no Playbook
- **Médio:** campo de profundidade ausente para módulo enriquecido / score incorreto
- **Baixo:** texto muito curto / formatação estranha / tradução inconsistente

---

## CRITÉRIOS DE APROVAÇÃO DA V18

A v18 é **APROVADA** se:

| # | Critério | Como validar |
|---|----------|--------------|
| 1 | CNPJs diferentes → dados diferentes | Testar 2+ CNPJs e comparar narrativas |
| 2 | Segmentos diferentes → oportunidades diferentes | Testar indústria vs serviços |
| 3 | Narrativa operacional específica (não genérica) | Verificar ausência de frases proibidas |
| 4 | Sinais têm evidência real | Verificar campo `evidence` em cada sinal |
| 5 | Oportunidades têm resumo executivo | Verificar campo `executive_summary` |
| 6 | Diagnóstico explica fontes e ausências | Verificar seção Jurídico no Diagnóstico |
| 7 | Playbook usa dados da empresa | Verificar que nome/segmento/sinais aparecem |
| 8 | Nada inventado sem fonte | Verificar badges de confiança |
| 9 | Simples Nacional não recomenda PIS/COFINS NC | Testar cenário 05 |
| 10 | Score 0 explicado (não silencioso) | Verificar módulos bloqueados |

A v18 é **REPROVADA** se qualquer um dos itens abaixo ocorrer:

| # | Reprovação automática |
|---|----------------------|
| R1 | Sistema exibe processo judicial não fornecido |
| R2 | Sistema inventa nome de sócio/advogado |
| R3 | Simples Nacional recomenda módulos PIS/COFINS não-cumulativo |
| R4 | Dois CNPJs totalmente diferentes geram conteúdo idêntico |
| R5 | Playbook contém frases da lista proibida |
| R6 | Narrativa de Operação usa frases genéricas proibidas |
| R7 | Crash da aplicação em CNPJ válido |
| R8 | Campo obrigatório vazio sem explicação |
