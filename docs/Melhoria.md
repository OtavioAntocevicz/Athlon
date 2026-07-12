# Melhorias pendentes - ATHLON

Itens fora do escopo do MVP atual, organizados por prioridade.

---

## Concluído recentemente (jul/2026)

Estes itens saíram do pendente ou foram entregues nesta rodada de UX/Admin:

- Refino visual do app do **professor** (login, dashboard, turmas com foto, alunos, BottomNav, eventos)
- Painel **ADM** expandido: jornada Professor → Turma → Aluno; lista global de alunos; área **Edição** (matricular, remover, trocar, desbloquear, ativar/desativar professor)
- Foto da turma (`foto_url` + bucket `turmas-fotos`)
- Dashboard ADM sem lista duplicada de professores (métricas + atalhos)
- Travessões tipográficos padronizados para hífen (`-`)
- UX do **aluno**: BottomNav com 5 itens (Eventos | Mensal | Início | Turmas | Perfil); dashboard; turmas com foto; perfil com **Chamado**
- **Chamados**: aluno abre/acompanha; ADM responde em Edição → Chamados (migration `20250712000000_chamados.sql`)
- Comprovante: arquivo removido do Storage ao aprovar/recusar (migration `20250713000000_comprovante_arquivo_nullable.sql`)
- Guia de configuração: [config-resend-web-push.md](./config-resend-web-push.md)

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

- Implementado: banner Android (`beforeinstallprompt`) + tutorial iOS com timing e dispensa persistente.
- Pendente em produção: validar Installability no Chrome DevTools após deploy.

### Web Push em produção

- Código implementado; falta configurar no ambiente de deploy.
- **Passo a passo:** [config-resend-web-push.md](./config-resend-web-push.md) (Parte B)
- Guia complementar: [web-push-producao.md](./web-push-producao.md)

### Recuperação de senha - Resend (e-mail)

- Fluxo implementado no código.
- **Passo a passo de configuração:** [config-resend-web-push.md](./config-resend-web-push.md) (Parte A)
- **Status atual:** Resend **ainda precisa ser configurado** em produção (`RESEND_API_KEY`, `EMAIL_FROM`, domínio verificado, `APP_URL`).

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

### Comprovante temporário (Storage)

- **Entregue:** ao aprovar ou recusar, o arquivo é removido do bucket e `arquivo_url` é limpo (`null`).
- Migration: `20250713000000_comprovante_arquivo_nullable.sql`
- Falha ao apagar o Storage é só logada - a aprovação/recusa do pagamento não é bloqueada.

### Notificação de nova mensalidade

- Hoje o cron do dia 1 pode gerar notificação de "nova mensalidade" sem deduplicação (diferente do atraso, que já é limitado a 1x por semana).
- Melhoria: enviar apenas uma vez por mês/turma/aluno, ou só quando a mensalidade for realmente criada pela primeira vez.

### Bloqueio do aluno

- Hoje o bloqueio por inadimplência restringe turmas e mantém acesso a home, mensalidades e perfil.
- Melhoria opcional: bloqueio mais rígido - redirecionar o aluno direto para mensalidades em atraso e ocultar home/perfil até regularizar.

### Painel ADM - exclusão de professores

- Hoje o ADM pode **inativar** a conta (`PATCH /admin/professores/:id/status`) e também pela área **Edição**.
- Melhoria ainda pendente: **exclusão definitiva** da conta (com confirmação e regras claras sobre turmas, alunos e dados vinculados).
