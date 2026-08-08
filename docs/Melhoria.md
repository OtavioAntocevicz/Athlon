# Melhorias pendentes - ATHLON

Itens fora do escopo do MVP atual, organizados por prioridade.

---

## Concluído recentemente (ago/2026)

- **Migração de infraestrutura:** Supabase → Railway (PostgreSQL) + Cloudflare R2 + API separada (`api.athlonsport.app.br`)
- **Crons unificados:** `node-cron` no Railway (avisos horários, diário, mensal)
- **Remoção TWA/APK:** canal único de instalação via PWA
- **Domínio próprio:** `athlonsport.app.br` (frontend) + `api.athlonsport.app.br` (API)
- Migrations consolidadas em `apps/backend/migrations/`
- Guia de deploy: [DEPLOY.md](./DEPLOY.md)

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

### Instalação PWA

- **Android / Chromium:** banner com `beforeinstallprompt` ("Instalar app").
- **iOS:** tutorial Safari → Adicionar à Tela de Início.
- Canal único de instalação: **PWA**.

### Web Push em produção

- Código e chaves VAPID: configuração documentada em [config-resend-web-push.md](./config-resend-web-push.md) (Parte B) e [web-push-producao.md](./web-push-producao.md).
- **Ajuste pendente:** com VAPID no Railway e permissão aceita pelo aluno, a notificação **ainda não aparece na barra do sistema** (só o fluxo in-app, se houver). Investigar subscription (`POST /dispositivos`), Service Worker (`push-handler.js`), envio `web-push` e diferença Android/iOS/PWA.

### Recuperação de senha - Resend (e-mail)

- Fluxo implementado no código.
- **Passo a passo de configuração:** [config-resend-web-push.md](./config-resend-web-push.md) (Parte A)
- **Status atual:** Resend **ainda precisa ser configurado** em produção no Railway (`RESEND_API_KEY`, `EMAIL_FROM`, domínio verificado, `APP_URL`).
- **Contorno sem domínio:** `RECOVERY_SHOW_CODE=true` mostra o código na tela (ver [config-resend-web-push.md](./config-resend-web-push.md)).

---

## Refinamento

### Eventos de turma

- Histórico de eventos passados visível para o aluno (hoje somem das listas após a data).
- Notificação ao editar evento (hoje só dispara na criação).

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
- Listagens (fila/mensalidades) não geram signed URL por item; preview fica no detalhe.

### Otimização N+1 (PostgreSQL) - adiado

- **Adiado até volume real de matrículas/usuários.**
- Candidatos: `sincronizarBloqueiosInadimplencia` (query por matrícula), `listarAlunos` / admin (status financeiro por aluno), loops de notificação em crons/avisos/eventos.
- Não implementar agora: infraestrutura ainda folgada com poucos usuários.

### Notificação de nova mensalidade

- Hoje o cron do dia 1 pode gerar notificação de "nova mensalidade" sem deduplicação (diferente do atraso, que já é limitado a 1x por semana).
- Melhoria: enviar apenas uma vez por mês/turma/aluno, ou só quando a mensalidade for realmente criada pela primeira vez.

### Bloqueio do aluno

- Hoje o bloqueio por inadimplência restringe turmas e mantém acesso a home, mensalidades e perfil.
- Melhoria opcional: bloqueio mais rígido - redirecionar o aluno direto para mensalidades em atraso e ocultar home/perfil até regularizar.

### Painel ADM - exclusão de professores

- Hoje o ADM pode **inativar** a conta (`PATCH /admin/professores/:id/status`) e também pela área **Edição**.
- Melhoria ainda pendente: **exclusão definitiva** da conta (com confirmação e regras claras sobre turmas, alunos e dados vinculados).
