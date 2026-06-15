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

### Web Push em produção

- Código implementado; falta configurar no ambiente de deploy.
- Guia completo: [web-push-producao.md](./web-push-producao.md)
- Resumo: gerar chaves VAPID, configurar variáveis no backend, publicar frontend em HTTPS e testar permissão de notificação no dispositivo do aluno.

---

## Refinamento

### Notificação de nova mensalidade

- Hoje o cron do dia 1 pode gerar notificação de “nova mensalidade” sem deduplicação (diferente do atraso, que já é limitado a 1x por semana).
- Melhoria: enviar apenas uma vez por mês/turma/aluno, ou só quando a mensalidade for realmente criada pela primeira vez.

### Bloqueio do aluno

- Hoje o bloqueio por inadimplência restringe turmas e mantém acesso a home, mensalidades e perfil.
- Melhoria opcional: bloqueio mais rígido - redirecionar o aluno direto para mensalidades em atraso e ocultar home/perfil até regularizar.
