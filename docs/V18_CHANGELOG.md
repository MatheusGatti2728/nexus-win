# NEXUS v18 — CHANGELOG

**Data:** 18/05/2026
**Versão anterior:** v17fix
**Status:** Candidata a produção — aguarda validação

---

## RESUMO EXECUTIVO

A v18 resolve o problema central da v17: **profundidade real de informação**.

A v17 entendia que uma empresa era industrial mas não sabia o que isso significa operacionalmente e tributariamente para aquela empresa específica. A v18 corrige isso em três camadas: operação, sinais e oportunidades.

---

## ARQUIVOS MODIFICADOS

| Arquivo | Tipo | O que mudou |
|---------|------|-------------|
| `src/intelligence/company-profile-engine.ts` | **RECONSTRUÍDO** | Novo engine com 8 perfis setoriais CNAE |
| `src/engine/rule-engine.ts` | **ENRIQUECIDO** | 10 módulos com 7 novos campos de profundidade |
| `app/dashboard/page.tsx` | **ATUALIZADO** | Aba Operação e Oportunidades com novos campos |

---

## MUDANÇAS DETALHADAS

### 1. `src/intelligence/company-profile-engine.ts` — RECONSTRUÍDO

**Problema anterior:**
```
"empresa com maturidade tributária média"
"empresa de indústria no Lucro Real"
```

**Solução: `CNAE_PROFILES` — 8 perfis setoriais**

Cada perfil tem:
- `sector` — nome do setor
- `activity` — descrição da atividade
- `business_model` — modelo de negócio específico
- `revenue_model` — como ganha dinheiro
- `typical_ops[]` — operações típicas do setor
- `tax_signals[]` — temas tributários com maior aderência
- `key_ops[]` — palavras-chave operacionais

**Setores cobertos:**
- Embalagens industriais
- Varejo alimentar / supermercados
- Distribuição e atacado
- Construção civil e engenharia
- Farmacêutico e drogarias
- Tecnologia e software
- Transporte e logística
- Alimentos e bebidas

**Resultado com CNAE "Fabricação de embalagens plásticas":**
```
"Embalagens Wood Pack atua em fabricação de embalagens industriais
sediada em Campinas/SP, com modelo de negócio B2B com venda direta
a indústrias e distribuidores. A operação típica envolve fabricação
própria, cadeia de insumos (resinas, tintas, adesivos), operação
interestadual."
```

**Sinais operacionais agora têm 3 camadas:**

| Camada | Antes | Depois |
|--------|-------|--------|
| `tax_impact` | "Insumos PIS/COFINS" | "Créditos de insumos PIS/COFINS (REsp 1.221.170) + IPI sobre saídas + crédito presumido exportação" |
| `operational_impact` | — (não existia) | "Processo produtivo com cadeia de insumos — energia, embalagens, matéria-prima qualificam como insumos PIS/COFINS" |
| `commercial_read` | — (não existia) | "Empresas industriais normalmente têm créditos de insumos não revisados com base no novo conceito do STJ" |

---

### 2. `src/engine/rule-engine.ts` — ENRIQUECIDO

**Interface `TaxModule` — novos campos:**

```typescript
executive_summary:  string    // explicação comercial simples
commercial_read:    string    // contexto de mercado que torna relevante
curiosity_trigger:  string    // frase curta para gerar interesse
expected_questions: Array<{q:string; a:string}>  // Q&A prontas
legal_basis:        string    // STJ/STF/Lei exata
retroactive_period: string    // "60 meses (5 anos)"
how_to_use_in_call: string    // linguagem exata para a ligação
```

**Módulos enriquecidos (10 de 13):**

| Módulo | Status |
|--------|--------|
| `verbas_indenizatorias` | ✅ Enriquecido |
| `sistema_s` | ✅ Enriquecido |
| `icms_iss_acao_coletiva` | ✅ Enriquecido |
| `revisao_insumos_pis_cofins` | ✅ Enriquecido |
| `ipi_credito_presumido_exportacao` | ✅ Enriquecido |
| `icms_st_pis_cofins` | ✅ Enriquecido |
| `difal_pis_cofins` | ✅ Enriquecido |
| `ipi_atacadista` | ✅ Enriquecido |
| `icms_grossup` | ✅ Enriquecido |
| `bonificacoes_descontos` | ✅ Enriquecido |
| `pis_cofins_folha` | ⚠️ Campos base (sem novos campos) |
| `plurifasico_beneficio` | ⚠️ Campos base (sem novos campos) |

---

### 3. `app/dashboard/page.tsx` — ATUALIZADO

**Aba Empresa > Operação:**
- Narrativa operacional em destaque (accent bar dourada)
- Exposição tributária provável (bloco específico)
- Perfil setorial com modelo de negócio + operações típicas
- Sinais com 3 colunas: impacto operacional | impacto tributário | como usar na ligação

**Aba Oportunidades (módulo expandido):**
- Resumo executivo + por que cabe (grid 2 colunas)
- Como introduzir na ligação + linguagem exata com botão copiar
- Curiosity trigger com botão copiar
- Questionamentos esperados com respostas (Q&A)
- Estimativa financeira + fundamento jurídico + período retroativo
- Riscos

---

## BUGS CORRIGIDOS

| Bug | Versão | Fix |
|-----|--------|-----|
| `expected ';' got ':'` no `unified-copilot-engine.ts` | v17 | Chave `}` duplicada removida (v17fix) |
| Narrativa operacional genérica para qualquer CNAE | v17fix | Substituído por `CNAE_PROFILES` (v18) |
| Sinais sem impacto operacional ou leitura comercial | v17fix | 3 novas camadas por sinal (v18) |
| Oportunidades sem resumo executivo ou Q&A | v17fix | 7 novos campos por módulo (v18) |

---

## O QUE NÃO MUDOU NA V18

- Pipeline de CNPJ (BrasilAPI → CNPJ.ws → ReceitaWS) — sem alteração
- Legal Intelligence Engine — sem alteração
- Decision Maker Intelligence — sem alteração
- Unified Copilot Engine — sem alteração (exceto v17fix)
- Design system / CSS — sem alteração
- Calculadora financeira — sem alteração
- Pesquisa externa (website + news) — sem alteração
- Executive Briefing — sem alteração
