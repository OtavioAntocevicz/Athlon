# Melhorias pendentes - ATHLON

Itens fora do escopo do MVP atual, organizados por prioridade.

**Pendências que só o dono consegue concluir** (Play Store, testers, prints logados, Expo): [WHITELIST.md](./WHITELIST.md).

---

## Concluído recentemente (out/2026)

- **Revisão interna de código (branch `cursor/code-improvements-a5fd`, out/2026):** melhorias automatizáveis da análise de API/serviços/componentes — ver [DOCUMENTACAO.md §21.6](./DOCUMENTACAO.md#216-melhorias-de-código-revisão-interna-out2026).
  - **Inadimplência:** sync de bloqueios em batch (uma query de pagamentos + agrupamento; elimina N+1 por matrícula em `sincronizarBloqueiosInadimplencia` / `sincronizarBloqueioAluno`).
  - **Crons:** advisory lock PostgreSQL por job (`apps/backend/src/lib/cron-lock.ts`); log de falhas nos jobs agendados; batch de `usuario_id` em notificações de atraso e mensalidade nova.
  - **Mensalidade nova:** notificação só quando o INSERT do mês é novo; dedup por tipo `MENSALIDADE_NOVA:{turmaId}:{YYYY-MM}` (`criarNotificacaoUnicaPorTipo`).
  - **Eventos:** notificação ao **editar** evento (`EVENTO_TURMA_ATUALIZADO`); lookup de usuários em batch em avisos de evento (`usuarioIdsPorAlunos`).
  - **API:** `asyncHandler` nas rotas HTTP `/api/cron/*`; middleware `validateParams`; error handler reconhece códigos PostgreSQL de conexão (`08*`).
  - **Frontend:** retry de sessão limitado a uma tentativa por requisição em `api.ts`; `useAdminListQuery` em dashboard / alunos / auditoria ADM.
  - **Mobile:** handlers `onError` / `onHttpError` no WebView (`apps/mobile/App.tsx`).
  - **Testes:** `pnpm test` inclui backend (`node --test` em `apps/backend/src/**/*.test.ts`); correção do teste `hide-boot-splash`.
- **Documentação sincronizada** com a `main` pós-PRs #16–#43: índice no `README.md`, guias Play Store, `WHITELIST.md` e referência em [DOCUMENTACAO.md §21.4](./DOCUMENTACAO.md#214-estado-do-repositório-e-prs-mescladas-out2026).
- **PRs obsoletas fechadas:** [#16](https://github.com/OtavioAntocevicz/Athlon/pull/16) (ícones PWA) e [#25](https://github.com/OtavioAntocevicz/Athlon/pull/25) (checklist Play Store) — conteúdo já incorporado na `main`.
- **[#44](https://github.com/OtavioAntocevicz/Athlon/pull/44)** — segunda passagem de docs (`README`, `DOCUMENTACAO`, `DEPLOY`, `WHITELIST`, `Melhoria`, Play Store, `apps/mobile`).
- **[#45](https://github.com/OtavioAntocevicz/Athlon/pull/45)** — primeira onda UX: estados vazios/skeleton/toast/OTP; avisos do aluno (`GET /alunos/meus-avisos`); bottom nav e turma com abas; melhorias em mensalidades/comprovantes; API com paginação de notificações e validação de query.
- **[#46](https://github.com/OtavioAntocevicz/Athlon/pull/46)** — [DESIGN.md](./DESIGN.md); fila de comprovantes com `previewUrl` e ações rápidas; upload aluno via `upload-url` + stepper; admin desktop (grid + erro/skeleton); MFA ADM com `StepIndicator`; batch de contagens em `listarProfessores` / status financeiro em `listarAlunosAdmin`; eventos do aluno com filtro passados/próximos.

## Concluído recentemente (ago/2026)

- **Migração de infraestrutura:** Supabase → Railway (PostgreSQL) + Cloudflare R2 + API separada (`api.athlonsport.app.br`)
- **Crons unificados:** `node-cron` no Railway (avisos horários, diário, mensal)
- **Três canais de acesso:** Web + PWA + app Play Store (`apps/mobile` — Expo + WebView apontando para o site)
- **Domínio próprio:** `athlonsport.app.br` (frontend) + `api.athlonsport.app.br` (API)
- **Verificação de e-mail do aluno:** cadastro sem código da turma → código 6 dígitos por e-mail → entrar na turma depois
- **Resend em produção:** recuperação de senha, verificação de e-mail e resposta de chamado funcionando
- **E-mail ao responder chamado:** ADM responde → aluno/professor recebe e-mail com a resposta
- **App Play Store (shell):** `apps/mobile` com detecção `__ATHLON_APP__`; banner PWA oculto dentro do WebView
- Migrations consolidadas em `apps/backend/migrations/` (inclui `003_email_verificacao.sql`)
- Guias: [DEPLOY.md](./DEPLOY.md), [play-store-mobile.md](./play-store-mobile.md), [WHITELIST.md](./WHITELIST.md), [play-store-ficha.md](./play-store-ficha.md)
- **Web Push:** VAPID no Railway; subscription no login; notificação na barra do sistema (PWA / HTTPS)
- **Exclusão definitiva de professor:** detalhe do professor e Edição → Professores (`DELETE /admin/professores/:id`)
- **MFA obrigatório no ADM:** um QR só até confirmar; códigos de backup consultáveis na tabela `"MfaBackupCode"`; regenerar códigos em `/admin/perfil`
- **API:** subdomínio `api.athlonsport.app.br` (Railway) + proxy na Vercel (`/api/v1`, `/api/cron`)
- **Segurança (PRs #26–#30):** rate limit, validação de origem, cookies httpOnly com rotação de refresh (`Sessao`), endurecimento de CORS/CRON
- **MFA + auditoria ADM (#29–#39):** TOTP obrigatório, log em `AuditoriaAdmin`, tela **Edição → Log de auditoria**
- **Play Store no repo (#42–#43):** screenshots públicos 1080×1920, `play-store-ficha.md`, `WHITELIST.md` operacional
- **Ícones PWA (#24):** `icon-192.png` / `icon-512.png` quadrados a partir de `logo.png`

## Concluído recentemente (jul/2026)

Estes itens saíram do pendente ou foram entregues nesta rodada de UX/Admin:

- Refino visual do app do **professor** (login, dashboard, turmas com foto, alunos, BottomNav, eventos)
- Painel **ADM** expandido: jornada Professor → Turma → Aluno; lista global de alunos; área **Edição** (matricular, remover, trocar, desbloquear, ativar/desativar professor)
- Foto da turma (`foto_url` + bucket `turmas-fotos`)
- Dashboard ADM sem lista duplicada de professores (métricas + atalhos)
- Travessões tipográficos padronizados para hífen (`-`)
- UX do **aluno**: BottomNav com 5 itens (Eventos | Mensal | Início | Turmas | Perfil); dashboard; turmas com foto; perfil com **Chamado**
- **Chamados**: aluno e professor abrem/acompanham; ADM responde em Edição → Chamados (migrations `20250712000000_chamados.sql`, `20250714000000_chamado_professor.sql`)
- Comprovante: arquivo removido do R2 ao aprovar/recusar
- Guia de configuração: [config-resend-web-push.md](./config-resend-web-push.md)
- Economia free tier: polling de notificações 180s; react-query `staleTime` 90s / sem refetch on focus; signed URL só no detalhe do comprovante
- **Code-splitting** no frontend: rotas com `React.lazy` (só login eager); bundle inicial menor (~438 KB); chunks sob demanda
- Tutorial **iOS** (PWA): Safari → Tela de Início

Detalhes em [DOCUMENTACAO.md §21.1](./DOCUMENTACAO.md#211-atualizações-recentes-jul2026).

---

## Pós-MVP

### Relatório financeiro

- Visão consolidada para o professor: recebimentos por período, inadimplência por turma, projeção de caixa.
- Pode incluir exportação (PDF/CSV) em fase posterior.
- **Status:** pendente (outro momento).

### Presença / chamada (RSVP)

- **Já implementado:** eventos de turma do tipo **amistoso** e **campeonato** - aviso informativo na tela da turma (professor) e no dashboard/turma do aluno, com notificação `EVENTO_TURMA`. Sem confirmação de presença.
- **Pendente:** usar a tabela `Presenca` para chamada/RSVP - professor registra presença por evento; aluno confirma ou visualiza histórico (opcional).
- Ver regras em [DOCUMENTACAO.md §10 - Eventos de turma](./DOCUMENTACAO.md#eventos-de-turma).
- **Status:** pendente (outro momento).

### Instalação (Web / PWA / Play Store)

- **Web:** navegador em https://athlonsport.app.br
- **PWA — Android / Chromium:** banner com `beforeinstallprompt` ("Instalar app").
- **PWA — iOS:** tutorial Safari → Adicionar à Tela de Início.
- **Play Store:** app nativo shell (`apps/mobile`) — WebView do mesmo frontend; guia em [play-store-mobile.md](./play-store-mobile.md).
- Dentro do app da loja, o banner de instalar PWA **não** aparece (`is-athlon-app.ts`).

### Web Push em produção

- **Status:** entregue em produção (ago/2026, refinado na [#41](https://github.com/OtavioAntocevicz/Athlon/pull/41)). Configuração: [config-resend-web-push.md](./config-resend-web-push.md) (Parte B) e [web-push-producao.md](./web-push-producao.md).
- Requisitos do usuário: HTTPS, permissão concedida; no iOS, PWA na Tela de Início. No app da Play Store o push nativo (FCM) continua como fase 2.

### E-mail transacional (Resend)

- **Status:** configurado e **funcionando em produção** (domínio verificado, `RESEND_API_KEY` no Railway).
- Tipos enviados: recuperação de senha, verificação de e-mail do aluno, resposta de chamado.
- **Configuração / troubleshooting:** [config-resend-web-push.md](./config-resend-web-push.md) (Parte A)
- **Contorno dev:** sem `RESEND_API_KEY`, o backend loga `[email:dev]` no terminal.
- **Contorno legado:** `RECOVERY_SHOW_CODE=true` exibe código na tela (desligar em produção).

---

## Refinamento

### Eventos de turma

- **Entregue (#46):** aluno vê passados em `/eventos` (filtros Próximos / Passados / Todos).
- **Entregue (out/2026):** notificação ao editar evento (tipo `EVENTO_TURMA_ATUALIZADO`).
- **Pendente:** —

### BottomNav do aluno

- Entregue: 5 itens como o professor - `Eventos | Mensal | Início | Turmas | Perfil` (Turmas ocultas se bloqueado).
### Testes E2E (futuro)

- Testes unitários do PWA já existem (`pnpm test`, Vitest).
- Pendente: E2E com Playwright (PWA no browser, incluindo fluxo de instalação simulado).
- Pendente: testes de integração da API `POST /dispositivos` com banco de teste.

### Analytics e Feature Flags

- Camadas desacopladas no frontend (`lib/analytics/`, `lib/feature-flags/`) com providers no-op.
- Pendente: integrar PostHog, Firebase Analytics ou Amplitude; Feature Flags reais por ambiente/plataforma.

### Sentry no frontend web

- Pendente: `@sentry/react` no frontend web para crash reporting.

### Comprovante temporário (R2)

- **Entregue:** ao aprovar ou recusar, o arquivo é removido do R2 e `arquivo_url` é limpo (`null`).
- Falha ao apagar o R2 é só logada - a aprovação/recusa do pagamento não é bloqueada.
- **Entregue (#46):** fila do professor expõe `previewUrl` para imagens; mensalidades continuam sem signed URL por item na listagem.
- **Entregue (#46):** aluno envia via URL assinada de escrita (stepper na mensalidade); rota legada base64 permanece para compatibilidade.

### Otimização N+1 (PostgreSQL)

- **Entregue (#46):** `listarProfessores` (contagem de turmas/alunos em batch) e `listarAlunosAdmin` (`statusFinanceiroPorAlunos` em batch).
- **Ainda adiado (volume baixo):** outros loops pontuais em avisos até métricas de produção.

### Notificação de nova mensalidade

- **Entregue (out/2026):** deduplicação por chave `MENSALIDADE_NOVA:{turmaId}:{YYYY-MM}`; notificação só quando o INSERT da mensalidade do mês é novo (job mensal).

### Bloqueio do aluno

- Hoje o bloqueio por inadimplência restringe turmas e mantém acesso a home, mensalidades e perfil.
- Melhoria opcional: bloqueio mais rígido - redirecionar o aluno direto para mensalidades em atraso e ocultar home/perfil até regularizar.

### Painel ADM - exclusão de professores

- O ADM pode **inativar** a conta (`PATCH /admin/professores/:id/status`) e **excluir definitivamente** (`DELETE /admin/professores/:id`) no detalhe do professor e em **Edição → Professores**.
- A exclusão remove login, turmas e dados das turmas; alunos do sistema são preservados.

---

## Pendente técnico (revisão interna out/2026)

Itens que **não** entraram na branch de melhorias de código porque exigem credenciais de terceiros, decisão de produto ou trabalho manual amplo. Detalhes em [DOCUMENTACAO.md §21.6](./DOCUMENTACAO.md#216-melhorias-de-código-revisão-interna-out2026).

| Área | Pendência |
|------|-----------|
| **Observabilidade** | Sentry no frontend web; analytics real (PostHog / Firebase / Amplitude) e feature flags por ambiente |
| **Testes** | E2E Playwright (login, MFA ADM, comprovante); integração `POST /dispositivos` com banco de teste |
| **Mobile** | Push nativo FCM (fase 2; hoje só Web Push no PWA/WebView) |
| **Segurança HTTP** | Content-Security-Policy no Helmet (hoje desligado para compatibilidade PWA) |
| **API / DX** | `asyncHandler` em todas as rotas Express; `validateParams` (Zod) nos `:id` de rotas sensíveis |
| **Auth** | Evitar query extra por request em `requireAlunoEmailVerificado` / `requireAdminMfa` (claims no JWT + invalidação ao confirmar e-mail / habilitar MFA) |
| **Comprovantes** | Remover rota legada base64 após métricas de uso (upload via URL assinada já é o fluxo principal) |
| **Performance** | Consolidar SQL do dashboard ADM; loops em **avisos agendados** se o volume crescer |
| **Crons em produção** | Garantir **uma** instância com `CRON_ENABLED=true` ou cron só via `/api/cron` + lock (lock já existe; falta política de deploy) |
| **Frontend admin** | Estender `useAdminListQuery` às demais telas admin (professores, chamados, edição, etc.) |
| **Produto** | Bloqueio de aluno mais rígido (redirecionar só para mensalidades); relatório financeiro; RSVP/`Presenca` |
| **Operação** | Itens do dono: [WHITELIST.md](./WHITELIST.md) (Play Store, Expo, testers, screenshots logados) |
