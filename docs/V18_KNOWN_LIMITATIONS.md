# NEXUS v18 — LIMITAÇÕES CONHECIDAS

**Data:** 18/05/2026
**Status:** Documentado para validação consciente

---

## CATEGORIA A — LIMITAÇÕES DE FONTE

Estas limitações são estruturais e não serão resolvidas na v18.

### A1. TRF / Jurídico — sem acesso direto

**O que acontece:** A pesquisa jurídica automática não acessa TRF1-6 diretamente. Os tribunais exigem autenticação ou CAPTCHA.

**Como funciona atualmente:** O sistema usa Google News RSS como proxy — busca `"[empresa] tributário TRF3"` para detectar menções em mídia. Isso captura casos noticiados, não o processo diretamente.

**O que o usuário vê no Diagnóstico:** "Nenhuma ação tributária identificada automaticamente — cole dados do JusBrasil/Escavador no campo manual."

**Workaround disponível:** O usuário pode colar texto do JusBrasil/Escavador no campo `court_input` do input manual. O engine processa e extrai: teses, escritório, OAB, número de processo.

**Critério de validação:** O diagnóstico deve sempre explicar a fonte e ausência de resultado. **Nunca deve aparecer processo inventado.**

---

### A2. LinkedIn — sem acesso a dados pessoais

**O que acontece:** O sistema não acessa LinkedIn de forma automatizada. Gera URLs candidatas por slug de nome.

**O que o usuário vê:** URLs candidatas de LinkedIn (ex: `linkedin.com/company/woodpack`) marcadas como "confirmar manualmente".

**Workaround disponível:** O usuário pode colar lista de decisores do LinkedIn no campo `extra_paste` (formato: `"Nome — Cargo"`). O engine classifica e gera abertura personalizada.

**Critério de validação:** Nenhum perfil de LinkedIn deve aparecer como "confirmado" sem input manual.

---

### A3. Site institucional — depende do domínio

**O que acontece:** O sistema tenta 5 domínios candidatos gerados pelo `entity-normalizer`. Se nenhum responder, site aparece como "não encontrado".

**Exemplos de falha:**
- Empresa com subdomínio: `wp.grupostrategi.com.br` → não encontra
- Empresa com site fora do padrão .com.br: `woodpack.ind.br` → pode não tentar
- Sites com bloqueio por User-Agent → retorna não encontrado

**O que o usuário vê:** "Site não encontrado em X domínios candidatos. Informe a URL manualmente."

**Workaround:** Campo `website_url` no input manual.

---

### A4. Notícias — apenas grandes empresas

**O que acontece:** Google News RSS retorna resultados para empresas com cobertura midiática. Empresas de médio porte sem PR ativo raramente aparecem.

**O que o usuário vê:** "Sem cobertura midiática identificada" ou 0 notícias na aba Pesquisa.

**Critério de validação:** Ausência de notícias não é bug — é resultado honesto.

---

## CATEGORIA B — LIMITAÇÕES DE COBERTURA CNAE

### B1. CNA não mapeados no CNAE_PROFILES

A v18 tem 8 perfis setoriais. CNAEs fora desses perfis recebem narrativa genérica.

**Setores sem perfil específico:**
- Agronegócio / Agricultura
- Saúde (hospitais, clínicas)
- Educação
- Imobiliário
- Mineração
- Petróleo e gás
- Financeiro / Seguros

**O que o usuário vê nesses casos:** Narrativa baseada apenas no texto do CNAE, sem perfil setorial.

**Critério de validação:** Se CNAE não é reconhecido, a narrativa pode ser menos específica — mas ainda deve mencionar o CNAE real, não frases como "empresa com maturidade tributária média".

---

### B2. CNAE secundários não usados na narrativa

**O que acontece:** Apenas o CNAE principal dispara o perfil setorial. CNAEs secundários não são analisados.

**Impacto:** Empresas com múltiplas atividades podem ter perfil incompleto.

**Exemplo:** Supermercado com CNAE secundário de "Restaurante" — o perfil de alimentação não será ativado.

---

## CATEGORIA C — LIMITAÇÕES DE DADOS CADASTRAIS

### C1. Capital social — nem sempre disponível

**Fontes que fornecem:** ReceitaWS (às vezes), CNPJ.ws (às vezes).
**BrasilAPI:** Não fornece capital social diretamente.
**Impacto:** Campo pode aparecer como "A confirmar" mesmo para empresas de grande porte.

### C2. Sócios (QSA) — disponibilidade variável

**Fontes que fornecem:** BrasilAPI, CNPJ.ws.
**Empresas S/A:** QSA pode estar desatualizado ou incompleto.
**Impacto:** "Sócios a confirmar" para algumas empresas.

### C3. Nome fantasia — nem sempre preenchido na Receita

**O que acontece:** Muitas empresas não têm nome fantasia cadastrado na Receita. Campo aparece vazio.

---

## CATEGORIA D — MÓDULOS TRIBUTÁRIOS

### D1. Dois módulos sem campos de profundidade na v18

| Módulo | Status |
|--------|--------|
| `pis_cofins_folha` | Sem `executive_summary`, `curiosity_trigger`, `expected_questions` |
| `plurifasico_beneficio` | Sem `executive_summary`, `curiosity_trigger`, `expected_questions` |

**Impacto:** Esses módulos aparecem sem resumo executivo e Q&A no painel expandido.

**Plano:** Será corrigido na v19 após validação da v18.

### D2. Calculadora — não tem inputs automáticos

**O que acontece:** A calculadora financeira (Sistema S, Taxa Cartão, IPI Atacadista) requer inputs manuais — folha, faturamento, % cartão.

**Por quê:** A Receita Federal não fornece dados financeiros via CNPJ. Seriam estimativas sem base.

---

## CATEGORIA E — COMPORTAMENTOS ESPERADOS (NÃO SÃO BUGS)

| Comportamento | Motivo |
|---------------|--------|
| Temperatura "fria" para empresa nova | Menos de 5 anos → poucos pontos de heat score |
| Score 0 para Simples Nacional em módulos PIS/COFINS | Correto — Simples não tem PIS/COFINS não-cumulativo |
| Site não encontrado para empresa sem domínio .com.br/.com | Motor tenta apenas os sufixos mais comuns |
| Notícias em inglês para exportadoras | Google News retorna qualquer idioma |
| Jurídico vazio para empresa conservadora | Correto — não deve inventar processos |

---

## PRIORIDADE PARA V19

Baseado nas limitações acima, os ajustes prioritários para a próxima versão são:

1. Enriquecer `pis_cofins_folha` e `plurifasico_beneficio` com campos de profundidade
2. Adicionar 4-5 perfis setoriais: agro, saúde, educação, imobiliário, financeiro
3. Tentar mais sufixos de domínio (`.ind.br`, `.net.br`, `.org.br`)
4. Usar CNAEs secundários na narrativa quando primário não reconhecido
5. Exportar Executive Briefing como PDF
