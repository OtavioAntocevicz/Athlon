# Melhorias pendentes - ATHLON

Itens fora do escopo do MVP atual, organizados por prioridade.

---

## Pós-MVP

### Presença / chamada

- Tabelas `Evento` e `Presenca` já existem no banco, mas não há tela nem fluxo no app.
- Escopo sugerido: professor registra chamada por turma/evento; aluno visualiza histórico (opcional).

### Relatório financeiro

- Visão consolidada para o professor: recebimentos por período, inadimplência por turma, projeção de caixa.
- Pode incluir exportação (PDF/CSV) em fase posterior.

### Instalação PWA

- Implementado: banner Android (`beforeinstallprompt`) + tutorial iOS com timing e dispensa persistente.
- Pendente em produção: validar Installability no Chrome DevTools após deploy.

### Web Push em produção

- Código implementado; falta configurar no ambiente de deploy.
- Guia completo: [web-push-producao.md](./web-push-producao.md)
- Resumo: gerar chaves VAPID, configurar variáveis no backend, publicar frontend em HTTPS e testar permissão de notificação no dispositivo do aluno.

---

## Refinamento

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

- Hoje o arquivo permanece no bucket após aprovação ou recusa; só sai da fila do professor.
- Melhoria: apagar o arquivo no Supabase Storage e limpar `arquivo_url` após aprovação (e opcionalmente após recusa).

### Recuperação de senha — Resend (e-mail)

- Fluxo implementado: código de 6 dígitos + link mágico, tabela `RecuperacaoSenha`, telas em `/login/*/esqueci-senha`.
- **Pendente:** configurar [Resend](https://resend.com) em produção (`RESEND_API_KEY`, `EMAIL_FROM`, domínio verificado, `APP_URL` na Vercel).
- **Status atual:** Resend **não está funcionando** no ambiente real; em dev, código e link aparecem no log do backend (`[email:dev]`).
- Documentação completa: [DOCUMENTACAO.md §12 — Recuperação de senha](./DOCUMENTACAO.md#recuperação-de-senha-esqueci-minha-senha).

### Notificação de nova mensalidade

- Hoje o cron do dia 1 pode gerar notificação de “nova mensalidade” sem deduplicação (diferente do atraso, que já é limitado a 1x por semana).
- Melhoria: enviar apenas uma vez por mês/turma/aluno, ou só quando a mensalidade for realmente criada pela primeira vez.

### Bloqueio do aluno

- Hoje o bloqueio por inadimplência restringe turmas e mantém acesso a home, mensalidades e perfil.
- Melhoria opcional: bloqueio mais rígido - redirecionar o aluno direto para mensalidades em atraso e ocultar home/perfil até regularizar.
