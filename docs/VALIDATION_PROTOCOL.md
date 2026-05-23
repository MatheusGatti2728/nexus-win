# NEXUS — Protocolo de Validação

## Como testar 10 empresas

Para cada empresa registrar:

| Campo | Descrição |
|-------|-----------|
| CNPJ | CNPJ real testado |
| Segmento | servicos / comercio / industria |
| Regime | lucro_real / lucro_presumido / simples_nacional |
| Flags | Flags operacionais informadas |
| Resultado esperado | O que o consultor espera ver |
| Resultado obtido | O que o Nexus mostrou |
| Módulos corretos | Módulos que fazem sentido para o perfil |
| Módulos errados | Módulos que não fazem sentido |
| Dados encontrados | Dados reais que vieram de fontes externas |
| Dados ausentes | O que faltou mas deveria aparecer |
| Pitch aprovado | O pitch gerado foi bom? |
| Ajustes necessários | O que precisaria mudar |

---

## Critérios de Aprovação

1. **Empresas diferentes geram dados diferentes** — inserir dois CNPJs diferentes e verificar que razão social, cidade, CNAE e módulos mudam.

2. **Segmentos diferentes geram módulos diferentes** — mesmo CNPJ com `servicos + LR` vs `comercio + LR` deve gerar listas de módulos diferentes.

3. **Pesquisa externa altera ao menos parte do dossiê** — se o site foi encontrado com sinal de exportação, IPI Exportação deve ter score mais alto e aparecer na aba Sinais.

4. **Copilot usa sinais reais** — a aba `◈ Sinais` deve mostrar:
   - Fatos confirmados → seção "Pode afirmar"
   - Hipóteses → seção "Use com cautela"
   - Baixa confiança → seção "Transforme em pergunta"

5. **Hipótese nunca aparece como fato** — qualquer sinal com `confidence < "high"` ou `is_confirmed = false` deve aparecer com linguagem cautelosa.

6. **Score muda quando sinais relevantes aparecem** — o painel Score Adjustment deve mostrar ajustes positivos/negativos com explicação da fonte.

---

## Checklist por CNPJ

```
□ CNPJ testado: ____________
□ Razão social apareceu corretamente?
□ Cidade/UF apareceu?
□ CNAE apareceu?
□ Sócios/QSA apareceram?
□ Site foi encontrado? URL: ____________
□ Notícias foram encontradas? Quantas: ____
□ Sinais gerados: ____________
□ Módulos recomendados fazem sentido?
□ Módulos bloqueados fazem sentido?
□ Score base: ____ Score ajustado: ____
□ Pitch usa dados reais?
□ Hipóteses rotuladas como hipóteses?
□ E-mail personalizado com dados da empresa?
□ WhatsApp natural e específico?
□ Observações: ____________
```

---

## Fontes de dados esperadas por confiança

| Fonte | Confiança esperada | Campo |
|-------|-------------------|-------|
| BrasilAPI / Receita Federal com QSA | high | razao_social, cnae, qsa, data_abertura |
| BrasilAPI sem QSA | medium | razao_social, cnae, municipio |
| CNPJ.ws (fallback) | medium | razao_social, qsa |
| ReceitaWS (fallback) | medium | razao_social |
| Site oficial encontrado | medium | sinais operacionais |
| Google News | medium | sinais de expansão/contratação |
| Input manual do consultor | medium | decisores, jurídico |
| Inferência por CNAE | low→medium | segmento, operação |

---

## Problemas comuns e soluções

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| Razão social não aparece | BrasilAPI rate limit ou CNPJ inválido | Verificar debug panel, tentar novamente em 60s |
| Site não encontrado | Nome da empresa tem siglas ou é muito genérico | Informar URL manualmente no campo "Site da empresa" |
| Nenhuma notícia | Empresa tem baixa cobertura midiática | Normal para PMEs — não é erro |
| Módulo errado recomendado | Flags operacionais não informadas | Adicionar flags relevantes no formulário |
| Score não mudou | Nenhum sinal externo de alta confiança | Enriquecer com site e notícias |
| Hipótese como fato | Bug de confiança | Verificar `is_confirmed` no debug |

---

## Acesso à página de validação

```
http://localhost:3000/validation
```

A página permite:
- Testar CNPJs rapidamente
- Ver sinais encontrados e módulos recomendados
- Registrar observações por teste
- Acompanhar métricas de aprovação
