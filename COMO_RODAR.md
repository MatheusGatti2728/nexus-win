# Como Rodar o Nexus Tax Intelligence Localmente
### Guia completo — do zero ao dashboard funcionando

---

## O que você vai conseguir fazer

Ao final deste guia, você vai:
- Abrir o dashboard do Nexus no navegador
- Digitar um CNPJ e ver o pipeline rodar em tempo real
- Ver o score aparecer antes do dossiê
- Explorar os 7 cenários de teste no Sandbox
- Ver o Pilot Mode funcionando

**Tempo estimado: 10 minutos.**

Tudo funciona em **modo simulado** — sem precisar de banco de dados, sem precisar de chave de IA, sem gastar nada.

---

## O que você precisa instalar (apenas uma vez)

### 1. Node.js

O Node.js é o motor que roda o JavaScript no seu computador.

**Como instalar:**
1. Abra o navegador e acesse: **https://nodejs.org**
2. Clique no botão verde grande que diz **"LTS"** (Long Term Support)
3. Baixe e instale normalmente (Next, Next, Finish)
4. Após instalar, **feche e reabra o terminal**

**Como verificar se funcionou:**
Abra o terminal e digite:
```
node --version
```
Deve aparecer algo como: `v20.15.0` (qualquer versão acima de 18 está ok)

---

### 2. Como abrir o terminal

**Windows:**
- Pressione `Windows + R`
- Digite `cmd` ou `powershell`
- Pressione Enter

**Mac:**
- Pressione `Cmd + Espaço`
- Digite `Terminal`
- Pressione Enter

**Linux:**
- Pressione `Ctrl + Alt + T`

---

### 3. pnpm (gerenciador de dependências)

No terminal, digite este comando e pressione Enter:

```
npm install -g pnpm
```

Aguarde terminar. Depois verifique:
```
pnpm --version
```
Deve aparecer algo como: `9.4.0`

---

## Baixar e organizar o projeto

### Estrutura de pastas

O projeto deve estar organizado assim na sua máquina:

```
📁 nexus-app/
├── 📁 app/
│   ├── 📁 (dashboard)/
│   │   ├── 📄 page.tsx          ← Dashboard principal
│   │   ├── 📄 layout.tsx        ← Topbar de navegação
│   │   ├── 📁 history/          ← Histórico de dossiês
│   │   ├── 📁 sandbox/          ← Cenários de teste
│   │   ├── 📁 pilot/            ← Pilot Mode
│   │   └── 📁 dossiers/[id]/    ← Detalhe do dossiê
│   ├── 📁 api/
│   │   ├── 📁 health/           ← Health check
│   │   └── 📁 dossiers/generate ← Gerar dossiê
│   ├── 📄 layout.tsx            ← Layout raiz
│   ├── 📄 page.tsx              ← Redireciona para /dashboard
│   └── 📄 globals.css           ← Estilos globais
├── 📁 hooks/
│   └── 📄 useDossierProgress.ts ← Pipeline em tempo real
├── 📁 lib/ui/
│   └── 📄 utils.ts              ← Formatters e utilitários
├── 📁 src/
│   ├── 📄 types.ts              ← Todos os tipos TypeScript
│   └── 📄 mock-data.ts          ← Dados dos 7 cenários
├── 📁 scripts/
│   └── 📄 check-system.ts       ← Verificação do sistema
├── 📄 package.json              ← Dependências do projeto
├── 📄 next.config.js            ← Configuração Next.js
├── 📄 tailwind.config.ts        ← Design system
├── 📄 tsconfig.json             ← Configuração TypeScript
└── 📄 .env.example              ← Modelo de variáveis
```

---

## Passo a passo para rodar

### Passo 1 — Entrar na pasta do projeto

No terminal, navegue até a pasta `nexus-app`.

**Se você salvou em Downloads:**
```bash
# Windows:
cd C:\Users\SeuNome\Downloads\nexus-app

# Mac/Linux:
cd ~/Downloads/nexus-app
```

**Como saber se está na pasta certa:**
Digite `ls` (Mac/Linux) ou `dir` (Windows) e você deve ver:
`package.json`, `app/`, `src/`, `hooks/` etc.

---

### Passo 2 — Criar o arquivo de configuração

O projeto precisa de um arquivo chamado `.env.local` com as configurações.

No terminal, execute:

**Mac/Linux:**
```bash
cp .env.example .env.local
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

O arquivo `.env.local` que foi criado já está configurado para modo simulado. **Você não precisa mudar nada** para o primeiro run.

---

### Passo 3 — Instalar dependências

Execute no terminal:
```bash
pnpm install
```

Isso vai baixar todos os pacotes necessários. Aguarde aparecer algo como:
```
Packages: +245
Progress: resolved 245, reused 245, downloaded 0, added 245, done
```

Pode demorar 1-3 minutos na primeira vez.

---

### Passo 4 — Iniciar o projeto

Execute:
```bash
pnpm dev
```

Aguarde aparecer:
```
  ▲ Next.js 14.2.5
  - Local:        http://localhost:3000
  - Environments: .env.local

  ✓ Starting...
  ✓ Ready in 2.1s
```

---

### Passo 5 — Abrir no navegador

Abra o navegador (Chrome, Firefox, Safari) e acesse:

**http://localhost:3000**

Você vai ser redirecionado automaticamente para o dashboard.

---

## O que você vai ver

### Tela inicial do Dashboard

Uma tela escura com fundo verde-petróleo, tipografia sharp, e no centro:

> **"Transforme um CNPJ em inteligência comercial tributária."**

Abaixo, três CNPJs para você clicar direto sem precisar digitar:
- `11.222.333/0001-81` — Supermercado (cenário padrão)
- `22.333.444/0001-99` — Simples Nacional (teste crítico)
- `44.555.666/0001-77` — Indústria Exportadora

---

### Gerando o primeiro dossiê

**Opção A — Digitar:**
1. No campo CNPJ (esquerda), digite: `11.222.333/0001-81`
   - A máscara se aplica automaticamente
2. Clique em "**Gerar dossiê estratégico**"

**Opção B — Clicar diretamente:**
Clique em qualquer um dos CNPJs na tela inicial.

---

### O que acontece depois de gerar

**Em ~2 segundos** (score_pronto):
- A timeline na esquerda começa a preencher
- O **Score Ring** aparece com a nota 84/100
- Os módulos recomendados aparecem na aba "Módulos"

**Em ~5 segundos** (financial_estimations_ready):
- Estimativas financeiras disponíveis na aba "Financeiro"
- Potencial combinado: ~R$ 2,88M

**Em ~10 segundos** (report_ready):
- Dossiê completo na aba "Dossiê"
- Resumo executivo, abordagem, agenda de reunião

---

## Navegando pelo produto

### Menu de navegação (topo)

| Link | O que é |
|------|---------|
| **Dashboard** | Tela principal — gerar dossiês |
| **Histórico** | Lista de dossiês gerados (mock) |
| **Sandbox** | 7 cenários de teste com validação automática |
| **Pilot** | Modo piloto — feedback e aprovação |

---

### Sandbox — Onde testar tudo

Acesse: **http://localhost:3000/dashboard/sandbox**

À esquerda: lista de 7 cenários de teste
1. Clique em qualquer cenário
2. O pipeline roda automaticamente
3. Validação automática compara o resultado com o esperado

**Cenário mais importante:** "Simples Nacional — Hard Rules"
- Score deve ser 0–25
- Nenhum módulo PIS/COFINS não-cumulativo deve aparecer
- Se aparecer: seria um bug no Rule Engine

---

### Histórico

Acesse: **http://localhost:3000/dashboard/history**

Lista os dossiês gerados (dados mock em modo simulado).
Clique em qualquer item para ver o detalhe.

---

### Pilot Mode

Acesse: **http://localhost:3000/dashboard/pilot**

Mostra o status dos dossiês em revisão. Clique em qualquer item para:
- Ver o status (draft_internal, awaiting_review, etc.)
- Preencher o formulário de feedback (10 critérios de 1 a 5)
- Ver o score de prontidão calculado automaticamente

---

## Verificando se está tudo funcionando

Execute no terminal (em outro terminal, deixe o `pnpm dev` rodando):
```bash
pnpm check:system
```

Resultado esperado:
```
✅ Node.js version       (v20.15.0)
⚠️  Supabase credentials  — não configurado — mock mode only
✅ Pipeline mode         (mock — sem chamadas reais)
✅ APP_ENV               (local)
✅ Mock data             (src/mock-data.ts encontrado)
✅ Dashboard             (página principal encontrada)
✅ Sandbox               (página de testes encontrada)
```

Os warnings de Supabase são **normais em modo simulado**.

---

## Parar o servidor

No terminal onde está rodando `pnpm dev`:
- Pressione `Ctrl + C`

Para voltar a rodar: `pnpm dev`

---

## Troubleshooting — Soluções para problemas comuns

### "command not found: pnpm"
O pnpm não foi instalado corretamente.
```bash
npm install -g pnpm
```
Feche e reabra o terminal.

---

### "Error: Cannot find module"
As dependências não foram instaladas.
```bash
pnpm install
```

---

### "Port 3000 is already in use"
Outro programa está usando a porta 3000. Tente:
```bash
# Rodar em outra porta:
pnpm dev -- --port 3001
```
Depois acesse: http://localhost:3001

---

### O CNPJ não aceita a digitação
O campo só aceita CNPJ válido com dígito verificador correto.
Use um dos CNPJs de teste:
- `11.222.333/0001-81`
- `22.333.444/0001-99`
- `44.555.666/0001-77`

---

### A tela fica em branco
Verifique se o terminal mostra erros. Se sim, copie o erro e procure a solução acima.

Se não houver erros: force um refresh com `Ctrl + Shift + R` no navegador.

---

### Fontes não carregam (texto genérico)
Normal ao abrir offline pela primeira vez. O projeto usa Google Fonts (Syne + JetBrains Mono). Com internet, as fontes carregam automaticamente.

---

## Modo real (com LLM e Supabase)

O modo simulado é suficiente para explorar o produto. Quando quiser conectar ao pipeline real:

1. Crie uma conta em **supabase.com**
2. Obtenha uma chave em **console.anthropic.com**
3. Edite `.env.local`:
   ```bash
   NEXT_PUBLIC_USE_MOCK_PIPELINE=false
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_DB_URL=postgresql://...
   ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Execute as migrations: `pnpm db:push`
5. Reinicie: `pnpm dev`

Ver `docs/STAGING_SETUP.md` para o guia completo.
