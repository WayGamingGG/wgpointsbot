# Plano de implementação — Bot de pontos para Discord

## Como usar este documento

Copia este ficheiro para a raiz do projeto (ex: `PLANO.md`). Em cada sessão do Claude Code, podes simplesmente dizer "lê o PLANO.md e executa a Etapa X" — cada etapa de código já tem um prompt pronto a colar.

**Stack**: Next.js (App Router) na Vercel + Supabase (Postgres) + Discord Interactions via HTTP (sem Gateway, sem processo permanente).

**Pressupostos assumidos** (muda se quiseres):
- Repositório novo, separado do Stratara — nome sugerido: `points-bot`
- Projeto Supabase novo e separado
- Valor do ACE: 10 pontos (placeholder — ajustas na seed da Etapa 2)
- Node.js 18+ instalado localmente

---

## Etapa 0 — Contas e acessos (fazes tu, manualmente)

O Claude Code não consegue clicar em dashboards nem gerar tokens — isto é só teu, antes de abrires o editor.

- [ ] Vai a https://discord.com/developers/applications → "New Application" → dá-lhe um nome
- [ ] Em "Bot": cria o bot, copia o **Bot Token** (guarda num gestor de password, nunca no código)
- [ ] Em "General Information": copia o **Application ID** e o **Public Key**
- [ ] Em "OAuth2 → URL Generator": scopes `bot` + `applications.commands`; permissões Send Messages, Embed Links, Attach Files, Use Slash Commands → abre o link gerado e convida o bot para um servidor de testes
- [ ] Cria um canal `#validacoes` nesse servidor (Discord → Definições → Avançadas → ativa o Modo de programador → botão direito no canal → Copiar ID)
- [ ] Cria um projeto novo em https://supabase.com → copia **Project URL**, **anon key**, **service role key**
- [ ] Confirma que tens conta Vercel ligada ao GitHub (já deves ter, do Stratara)

No fim desta etapa deves ter guardados:
`DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_VALIDACAO_CHANNEL_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Etapa 1 — Scaffold do projeto

**Prompt para o Claude Code:**
> Cria um novo projeto Next.js (App Router, TypeScript) chamado `points-bot`. Instala `discord-interactions`, `@supabase/supabase-js` e `discord-api-types`. Cria um `.env.local.example` com as variáveis DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, DISCORD_PUBLIC_KEY, DISCORD_VALIDACAO_CHANNEL_ID, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. Cria a estrutura de pastas: `app/api/discord/interactions/route.ts`, `lib/discord/`, `lib/supabase/`, `scripts/`.

- [ ] `npm run dev` arranca sem erros
- [ ] `.env.local` (com os valores reais da Etapa 0) está no `.gitignore`

---

## Etapa 2 — Schema da base de dados

**Prompt para o Claude Code:**
> No Supabase, cria uma migration SQL com 4 tabelas: `players` (id uuid pk, discord_id text unique, nome text, criado_em timestamptz default now()); `event_types` (id uuid pk, codigo text unique, pontos int, ativo bool default true); `matches` (id uuid pk, player_id uuid fk players, screenshot_url text, registado_por text, status text check in ('pendente','aprovado','rejeitado') default 'pendente', criado_em timestamptz default now()); `point_events` (id uuid pk, match_id uuid fk matches, event_type_id uuid fk event_types, pontos int, criado_em timestamptz default now()). Adiciona índices em matches(player_id, status, criado_em). Inclui seed de event_types: MVP=15, ACE=10.

- [ ] Tabelas visíveis no Supabase Table Editor
- [ ] Seed de `event_types` confirmado

---

## Etapa 3 — Registo dos slash commands

**Prompt para o Claude Code:**
> Cria `scripts/register-commands.ts`, um script Node standalone que define 5 slash commands (`registar`, `geral`, `semanal`, `mensal`, `points`) com as respetivas opções, e faz um PUT autenticado à Discord API (`/applications/{id}/commands`) usando DISCORD_BOT_TOKEN e DISCORD_APPLICATION_ID do `.env`. Adiciona o script `discord:register` ao `package.json`.

- [ ] Depois de correr `npm run discord:register`, os comandos aparecem ao escrever `/` no Discord

---

## Etapa 4 — Endpoint de interações

**Prompt para o Claude Code:**
> Implementa `app/api/discord/interactions/route.ts`: valida a assinatura Ed25519 do pedido com `discord-interactions`, usando DISCORD_PUBLIC_KEY; responde PONG a um PING; dispatcha por tipo de interação (APPLICATION_COMMAND → router por nome do comando; MESSAGE_COMPONENT → router por custom_id) para handlers em `lib/discord/handlers/`.

- [ ] Verificação fica pendente até à Etapa 7 (precisa de um URL público para testar)

---

## Etapa 5 — `/registar` + fluxo de aprovação

Esta é a etapa central — o botão que substitui o Excel.

**Prompt para o Claude Code:**
> Implementa o handler do comando `/registar` (opções: jogador opcional — default quem executa, tipo MVP/ACE, anexo obrigatório): cria um registo em `matches` com status pendente e os `point_events` associados; publica uma embed no canal DISCORD_VALIDACAO_CHANNEL_ID com a imagem do anexo e dois botões (custom_id `aprovar:{match_id}` e `rejeitar:{match_id}`). Implementa os handlers desses botões: confirmam que quem clicou tem um cargo de staff (lista de role IDs em env), atualizam o status da match, e editam a embed original para refletir o resultado, removendo os botões.

- [ ] Testar manualmente: submeter print → embed aparece em `#validacoes` → clicar ✅ → status muda para `aprovado` no Supabase

---

## Etapa 6 — Comandos de ranking

**Prompt para o Claude Code:**
> Implementa os handlers de `/geral`, `/semanal`, `/mensal` (queries Supabase agregando `point_events` via `matches.status = 'aprovado'`, com filtro de data para semanal/mensal) e `/points` (total, COUNT DISTINCT matches, média, últimos 5 point_events). Formata as respostas como embeds Discord, com paginação simples se houver mais de 10 jogadores.

- [ ] Cada comando devolve valores que coincidem com uma query manual feita diretamente no Supabase

---

## Etapa 7 — Deploy e ligação final

Etapa mista — o deploy é código, mas colar o URL é manual.

- [ ] (Claude Code) Configura as env vars no projeto Vercel e faz deploy
- [ ] (Tu) Copia o URL gerado (ex: `https://points-bot.vercel.app/api/discord/interactions`) e cola em "Interactions Endpoint URL" no Developer Portal — deve aparecer "verificado"
- [ ] (Tu) Corre `npm run discord:register` apontado ao ambiente de produção

- [ ] Critério de conclusão: `/registar` funciona ponta a ponta no servidor de testes

---

## Etapa 8 — Migração do Excel e arranque em paralelo

**Prompt para o Claude Code:**
> Escreve `scripts/migrar-excel.ts`: lê um CSV exportado (colunas jogador, MVP, ACE, ...) e cria os `players`, uma `match` por contagem histórica (sem screenshot, status `aprovado`) e os `point_events` correspondentes, preservando os totais atuais.

- [ ] (Tu) Exporta o Excel atual para CSV
- [ ] (Claude Code) Corre o script de migração
- [ ] (Tu) Confirma no `/geral` que os totais coincidem com o Excel
- [ ] Correr os dois sistemas em paralelo durante uma semana antes de desligar o Excel

---

## Etapa 9 — Lançamento

- [ ] Convida o bot para o servidor real da equipa (repete o passo 4 da Etapa 0, agora no servidor definitivo)
- [ ] Define os cargos de staff que podem aprovar/rejeitar (env var ou tabela `staff_roles`)
- [ ] Anuncia à equipa: os prints continuam a ser publicados, mas agora via `/registar`
- [ ] Desliga o Excel
