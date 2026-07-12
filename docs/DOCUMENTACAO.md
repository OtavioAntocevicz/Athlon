# ATHLON - Documentação Completa do Projeto

> Versão do projeto: **1.7.1**  
> Última atualização deste documento: junho/2026  
> Software proprietário - ver `LICENSE`

Este documento descreve o sistema por completo para facilitar onboarding em outro computador, manutenção e deploy. Use junto com `README.md` (início rápido) e `.env.example` (variáveis).

---

## Índice

1. [O que é o ATHLON](#1-o-que-é-o-athlon)
2. [Para quem é](#2-para-quem-é)
3. [Stack tecnológica](#3-stack-tecnológica)
4. [Estrutura do monorepo](#4-estrutura-do-monorepo)
5. [Tipos de usuário e permissões](#5-tipos-de-usuário-e-permissões)
6. [Jornadas de usuário](#6-jornadas-de-usuário)
7. [Frontend - rotas e telas](#7-frontend---rotas-e-telas)
8. [API REST - endpoints](#8-api-rest---endpoints)
9. [Banco de dados (Supabase)](#9-banco-de-dados-supabase)
10. [Regras de negócio](#10-regras-de-negócio)
11. [Notificações e cron jobs](#11-notificações-e-cron-jobs)
12. [Autenticação e segurança](#12-autenticação-e-segurança)
13. [PWA e Web Push](#13-pwa-e-web-push)
14. [Variáveis de ambiente](#14-variáveis-de-ambiente)
15. [Desenvolvimento local](#15-desenvolvimento-local)
16. [Deploy em produção (Vercel + Supabase)](#16-deploy-em-produção-vercel--supabase)
17. [Scripts disponíveis](#17-scripts-disponíveis)
18. [Arquivos-chave](#18-arquivos-chave)
19. [Decisões arquiteturais](#19-decisões-arquiteturais)
20. [Checklist para clonar em outro PC](#20-checklist-para-clonar-em-outro-pc)
21. [Funcionalidades futuras](#21-funcionalidades-futuras)
22. [Testes automatizados](#22-testes-automatizados)

---

## 1. O que é o ATHLON

O **ATHLON** é uma plataforma **mobile-first** (PWA) de gestão esportiva voltada principalmente para **treinadores** que administram turmas/equipes e **alunos** que participam dessas turmas.

O núcleo do MVP é o **fluxo financeiro de mensalidades**:

1. Administrador (ADM) cria a conta do treinador; o treinador cadastra turmas com valor de mensalidade e chave PIX.
2. Aluno se cadastra com código de convite da turma.
3. Aluno visualiza mensalidades, copia o PIX e envia comprovante de pagamento.
4. Treinador valida comprovantes na fila (aprovar ou recusar).
5. O sistema controla atrasos, bloqueios por inadimplência e notificações.

Além disso, o professor pode enviar **avisos** para a turma (imediato ou agendado) e acompanhar métricas no **dashboard**.

---

## 2. Para quem é

| Público | Perfil no sistema | Necessidade atendida |
|---------|-------------------|---------------------|
| Operador da plataforma | `ADM` | Criar professores, consultar alunos/turmas, matricular/afastar, desbloquear, ativar/desativar contas |
| Treinador / professor | `PROFESSOR` | Criar turmas, gerenciar alunos, validar pagamentos, comunicar turma |
| Atleta / aluno | `ALUNO` | Pagar mensalidade, enviar comprovante, acompanhar situação financeira |
| Dono do produto | - | Gestão esportiva simplificada sem planilhas |

**Não é** (ainda): sistema de presença/chamada (RSVP) em produção - a tabela `Presenca` existe no banco, mas sem API/UI. **Eventos de turma** (amistoso e campeonato) já estão implementados (ver §10).

---

## 3. Stack tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 19, Vite 6, React Router 7, TanStack Query, Tailwind CSS, React Hook Form, Zod, PWA (`vite-plugin-pwa`) |
| **Backend** | Node.js, Express 4, TypeScript, JWT, bcryptjs, Zod |
| **Banco** | PostgreSQL via Supabase |
| **Arquivos** | Supabase Storage (comprovantes) |
| **Push** | Web Push (VAPID) |
| **Instalação** | PWA instalável pelo navegador (Android: prompt nativo; iOS: tutorial manual) |
| **Testes** | Vitest (shared-types + frontend) |
| **Monorepo** | pnpm workspaces |
| **Tipos compartilhados** | `@athlon/shared-types` (Zod schemas + enums) |
| **Produção** | Vercel (frontend estático + API serverless) + Supabase |

---

## 4. Estrutura do monorepo

```
Athlon/
├── package.json                 # Scripts raiz (dev, build, build:vercel)
├── pnpm-workspace.yaml          # apps/* e packages/*
├── vercel.json                  # Deploy unificado (SPA + API + crons)
├── api/index.ts                 # Entrypoint serverless da Vercel → Express
├── .env.example                 # Template geral de variáveis
├── LICENSE
├── README.md
│
├── apps/
│   ├── frontend/                # PWA React (@athlon/frontend)
│   │   ├── src/
│   │   │   ├── app/             # App.tsx, router.tsx, guards.tsx
│   │   │   ├── features/        # Páginas por domínio (auth, turmas, etc.)
│   │   │   ├── components/      # Layout, UI, componentes de domínio
│   │   │   └── lib/             # api.ts, auth-context, use-pwa-install, analytics
│   │   ├── public/              # Ícones PWA, push-handler.js
│   │   └── vite.config.ts
│   │
│   └── backend/                 # API REST (@athlon/backend)
│       ├── src/
│       │   ├── app.ts           # Montagem Express (exportável)
│       │   ├── server.ts        # Dev local (listen + node-cron)
│       │   ├── config/          # env.ts, supabase.ts
│       │   ├── middleware/      # auth, validate, error-handler, cron-auth
│       │   ├── modules/         # Rotas por domínio (auth, admin, turmas, etc.)
│       │   ├── lib/             # db, jwt, email, inadimplencia, notificacoes, push
│       │   └── jobs/cron.ts     # Lógica dos jobs agendados
│       ├── supabase/migrations/ # Schema SQL
│       └── scripts/             # test-db, seed-admin, generate-vapid-keys
│
├── packages/
│   └── shared-types/            # Contratos Zod + enums compartilhados
│
└── docs/
    ├── DOCUMENTACAO.md          # Este arquivo
    ├── Melhoria.md              # Pendências e melhorias
    └── web-push-producao.md     # Guia de push em produção
```

### Fluxo de requisição em produção

```
Navegador (athlonsport.vercel.app)
    │
    ├── /, /login, /turmas...  →  apps/frontend/dist (SPA)
    │
    └── /api/v1/*, /health     →  api/index.ts (serverless)
                                      └── apps/backend/dist/app.js (Express)
                                              └── Supabase (Postgres + Storage)
```

---

## 5. Tipos de usuário e permissões

### Perfis (`PerfilUsuario`)

| Valor | Descrição |
|-------|-----------|
| `ADM` | Operador da plataforma - cria professores, consulta alunos/turmas e executa edições administrativas |
| `PROFESSOR` | Treinador com turmas, alunos e validação de comprovantes |
| `ALUNO` | Atleta matriculado em uma ou mais turmas |

### Status de mensalidade (`StatusMensalidade`)

| Status | Significado |
|--------|-------------|
| `PENDENTE` | Aguardando pagamento |
| `EM_ANALISE` | Comprovante enviado, aguardando professor |
| `PAGO` | Confirmado (comprovante aprovado ou baixa manual) |
| `RECUSADO` | Comprovante recusado; aluno pode reenviar |
| `ATRASADO` | Vencimento passou sem pagamento |

### JWT (payload)

```typescript
{
  sub: string;          // usuario.id
  email: string;
  nome: string;
  perfil: "ADM" | "PROFESSOR" | "ALUNO";
  professorId?: string;
  alunoId?: string;
}
```

- **Access token:** 15 minutos
- **Refresh token:** 7 dias

### Middlewares no backend

| Middleware | Arquivo | Função |
|------------|---------|--------|
| `authenticate` | `middleware/auth.ts` | Exige `Authorization: Bearer <token>` |
| `requireProfessor` | `middleware/auth.ts` | Apenas perfil professor |
| `requireAdmin` | `middleware/auth.ts` | Apenas perfil ADM |
| `requireAluno` | `middleware/auth.ts` | Apenas perfil aluno |
| `requireAlunoSemBloqueio` | `middleware/inadimplencia-guard.ts` | Bloqueia aluno inadimplente (403) |
| `requireCronAuth` | `middleware/cron-auth.ts` | Protege `/api/cron/*` com `CRON_SECRET` |
| `validate(schema)` | `middleware/validate.ts` | Valida body com Zod |

### Guards no frontend (`apps/frontend/src/app/guards.tsx`)

| Guard | Uso |
|-------|-----|
| `GuestRoute` | Login/cadastro - redireciona logados para `/` (ADM vai para `/admin`) |
| `ProtectedRoute` | Exige usuário autenticado |
| `ProfessorRoute` | Apenas professor |
| `AdminRoute` | Apenas ADM; sem login redireciona para `/login/professor` |
| `AlunoRoute` | Apenas aluno |
| `AlunoTurmasRoute` | Aluno sem bloqueio por inadimplência |

| Perfil | Início | Mensalidades | Alunos | Turmas | Admin |
|--------|--------|--------------|--------|--------|-------|
| Professor | Sim | Sim | Sim | Sim | Não |
| Aluno | Sim | Próprias | Não | Minhas turmas* | Não |
| ADM | `/admin` | Não | Não | Não | Sim |

\* Aluno bloqueado: sem acesso a minhas turmas.

### Matriz de acesso resumida (professor e aluno)

| Recurso | Professor | Aluno | Aluno bloqueado |
|---------|-----------|-------|-----------------|
| Home / dashboard | Sim | Sim | Sim |
| Mensalidades | Todas das suas turmas | Próprias | Sim |
| Fila de comprovantes | Sim | Não | Não |
| Gestão de turmas | Sim | Não | Não |
| Minhas turmas | Não | Sim | **Não** |
| Entrar em nova turma | Não | Sim | **Não** |
| Lista de alunos | Sim | Não | Não |
| Avisos (criar) | Sim | Não | Não |
| Eventos de turma (criar) | Sim | Não | Não |
| Perfil | Sim | Sim | Sim |

---

## 6. Jornadas de usuário

### 6.1 Jornada do Professor (Treinador)

```
1. Acessa /login → escolhe "Treinador"
2. Login (/login/professor) - conta criada pelo ADM
3. Dashboard professor
   - Métricas: turmas ativas, alunos, comprovantes aguardando, inadimplentes
4. Cria turma (/turmas/nova)
   - Nome, modalidade, nível, dias/horário, local
   - Valor mensalidade, dia vencimento, chave PIX da turma
   - Sistema gera código de convite e mensalidades iniciais
5. No detalhe da turma (/turmas/:id)
   - Pode enviar/alterar foto da turma
   - Visualiza dados em hero + chips + treino + financeiro
6. Compartilha código de convite com alunos
7. Gerencia alunos (/alunos, /turmas/:id)
   - Filtros por status financeiro e turma; busca por nome
   - Pode adicionar aluno manualmente (com ou sem conta)
   - Pode afastar aluno da turma
   - Pode desbloquear inadimplência manualmente
8. Recebe comprovantes na fila (/comprovantes)
   - Aprova → mensalidade PAGO + notificação ao aluno
   - Recusa → mensalidade RECUSADO + motivo + notificação
9. Pode marcar mensalidade como paga manualmente (sem comprovante)
10. Envia avisos (/avisos) - formulário sob demanda
11. Lista eventos agregados (/eventos) e cadastra no detalhe da turma
    - Amistoso ou campeonato (data, adversário, local, descrição)
    - Notificação automática aos alunos matriculados
12. BottomNav: Eventos | Mensal | Início | Turmas | Alunos
13. Edita perfil, altera senha, gerencia/exclui turmas
```

### 6.2 Jornada do Aluno

```
1. Acessa /login → escolhe "Aluno"
2. Cadastro (/cadastro/aluno)
   - Dados pessoais + código de convite da turma
   - Matrícula automática na turma
3. Login → Dashboard aluno
   - Destaque da mensalidade em foco (mais urgente)
   - Próximo evento (amistoso/campeonato mais próximo entre todas as turmas)
   - Turmas, horários, PIX
4. Mensalidades (/mensalidades)
   - Lista com filtros por status
   - Detalhe: copiar PIX, enviar comprovante
5. Upload de comprovante (fluxo em 2 passos)
   a) POST upload-url → recebe URL assinada do Supabase Storage
   b) PUT arquivo direto no Storage
   c) POST confirmar comprovante → status EM_ANALISE
6. Minhas turmas (/minhas-turmas)
   - Ver colegas, camisa, posição
   - Ver próximos eventos da turma (amistoso/campeonato)
   - Entrar em nova turma com código (se não bloqueado)
7. Se inadimplente (2+ meses atrasados na mesma turma):
   - Bloqueado em "Minhas turmas" e entrar turma
   - Ainda acessa home, mensalidades e perfil para regularizar
8. Recebe notificações in-app e push (se habilitado)
```

### 6.3 Jornada do Administrador (ADM)

```
1. Acessa /login → escolhe "Treinador" (ou vai direto a /login/professor)
2. Login com e-mail e senha de ADM (mesma tela do treinador)
   - Backend aceita perfil ADM quando o login é feito como PROFESSOR
   - Após login, redireciona automaticamente para /admin
3. Dashboard (/admin) - métricas globais + ações rápidas (sem lista duplicada)
4. Professores (/admin/professores)
   - Lista, busca, filtro ativos/inativos, criar professor
5. Detalhe do professor (/admin/professores/:id)
   - Dados, PIX, ativar/desativar
   - Turmas clicáveis → /admin/turmas/:id
   - Alunos clicáveis → /admin/alunos/:id
6. Jornada de leitura:
   Professor → turma → dados da turma → aluno → perfil do aluno
7. Alunos (/admin/alunos)
   - Busca por nome, e-mail, CPF ou RG
   - Filtro "Sem turma" + atalho para matricular
8. Perfil do aluno (/admin/alunos/:id)
   - Dados, data de criação da conta, data de entrada em cada turma
   - Atalhos de edição (matricular, remover, trocar, desbloquear)
9. Edição (/admin/edicao)
   - Matricular aluno em turma
   - Remover aluno da turma
   - Trocar aluno de turma
   - Desbloquear inadimplência
   - Ativar/desativar professor
   - Atalho para alunos sem turma
10. Perfil (/admin/perfil) - alterar senha, logout
11. BottomNav: Profs | Alunos | Início | Edição | Perfil
```

> `/login/admin` redireciona para `/login/professor` (compatibilidade com links antigos).

Seed: `pnpm seed:admin` (variáveis `ADMIN_EMAIL`, `ADMIN_PASSWORD` em `apps/backend/.env`)

### 6.4 Fluxo de comprovante (detalhado)

```
Aluno                          Storage (Supabase)              Professor
  │                                   │                            │
  ├─ Solicita upload-url ────────────►│                            │
  │◄─ URL assinada + arquivoUrl ──────┤                            │
  ├─ PUT arquivo ────────────────────►│                            │
  ├─ Confirma comprovante ────────────┼──► DB: EM_ANALISE          │
  │                                   │                            │
  │                                   │         ◄── Vê na fila ────┤
  │                                   │         ── Aprova/Recusa ─►│
  │◄── Notificação ───────────────────┼────────────────────────────┤
```

---

## 7. Frontend - rotas e telas

Arquivo: `apps/frontend/src/app/router.tsx`

### Rotas públicas

| Rota | Tela | Descrição |
|------|------|-----------|
| `/login` | ProfileSelectPage | Escolha professor ou aluno |
| `/login/professor` | LoginFormPage | Login treinador **e administrador (ADM)** |
| `/login/aluno` | LoginFormPage | Login aluno |
| `/login/admin` | Redirect | Redireciona para `/login/professor` |
| `/login/professor/esqueci-senha` | EsqueciSenhaPage | Recuperar senha (treinador e ADM) |
| `/login/aluno/esqueci-senha` | EsqueciSenhaPage | Recuperar senha (aluno) |
| `/login/professor/redefinir-senha/:token` | RedefinirSenhaTokenPage | Nova senha via link do e-mail (treinador/ADM) |
| `/login/aluno/redefinir-senha/:token` | RedefinirSenhaTokenPage | Nova senha via link do e-mail (aluno) |
| `/cadastro/aluno` | RegisterAlunoPage | Cadastro aluno |
| `/termos` | TermosDeUsoPage | Termos de uso |
| `/privacidade` | PoliticaPrivacidadePage | Política de privacidade |

### Rotas autenticadas

| Rota | Guard | Tela | Descrição |
|------|-------|------|-----------|
| `/` | Protected | DashboardProfessor ou DashboardAluno | Home por perfil |
| `/mensalidades` | Protected | MensalidadesPage | Lista de mensalidades |
| `/mensalidades/:id` | Protected | MensalidadeDetailPage | Detalhe, PIX, comprovante |
| `/comprovantes` | Professor | ComprovantesFilaPage | Fila de validação |
| `/comprovantes/:id` | Professor | ComprovanteValidacaoPage | Aprovar/recusar |
| `/turmas` | Professor | TurmasPage | Lista de turmas |
| `/turmas/nova` | Professor | NovaTurmaPage | Criar turma |
| `/turmas/:id` | Professor | TurmaDetailPage | Detalhe, alunos e eventos |
| `/alunos` | Professor | AlunosPage | Lista de alunos |
| `/alunos/:id` | Professor | AlunoDetailPage | Perfil do aluno |
| `/avisos` | Professor | AvisosProfessorPage | Criar/listar avisos |
| `/eventos` | Professor | EventosProfessorPage | Lista agregada de eventos |
| `/minhas-turmas` | AlunoTurmas | TurmasAlunoPage | Turmas do aluno |
| `/minhas-turmas/:id` | AlunoTurmas | TurmaAlunoDetailPage | Detalhe da turma e próximos eventos |
| `/gerir-turmas` | Professor | GerirTurmasPage | Excluir turmas |
| `/perfil` | Protected | PerfilPage | Dados, senha, logout |
| `/perfil/gerir-turmas` | Professor | GerirTurmasPage | Gestão via perfil |

### Rotas ADM (`AdminRoute`)

| Rota | Tela | Descrição |
|------|------|-----------|
| `/admin` | AdminDashboardPage | Dashboard (métricas + atalhos) |
| `/admin/professores` | AdminProfessoresPage | Lista de professores |
| `/admin/professores/novo` | AdminNovoProfessorPage | Criar professor |
| `/admin/professores/:id` | AdminProfessorDetailPage | Detalhe do professor |
| `/admin/alunos` | AdminAlunosPage | Lista global de alunos |
| `/admin/alunos/:id` | AdminAlunoDetailPage | Perfil do aluno (leitura + atalhos) |
| `/admin/turmas/:id` | AdminTurmaDetailPage | Detalhe da turma (leitura) |
| `/admin/edicao` | AdminEdicaoPage | Hub de ações administrativas |
| `/admin/edicao/matricular` | AdminEdicaoMatricularPage | Matricular aluno |
| `/admin/edicao/remover` | AdminEdicaoRemoverPage | Remover aluno da turma |
| `/admin/edicao/trocar` | AdminEdicaoTrocarPage | Trocar aluno de turma |
| `/admin/edicao/desbloquear` | AdminEdicaoDesbloquearPage | Desbloquear inadimplência |
| `/admin/edicao/professores` | AdminEdicaoProfessoresPage | Ativar/desativar professor |
| `/admin/perfil` | AdminPerfilPage | Perfil do ADM |

### Navegação inferior (`BottomNav.tsx` / `AdminBottomNav.tsx`)

**Professor:** Eventos | Mensal | Início (centro) | Turmas | Alunos  
**Aluno:** Início | Mensal | Turmas (oculta se bloqueado) | Perfil  
**ADM:** Profs | Alunos | Início (centro) | Edição | Perfil

---

## 8. API REST - endpoints

**Base URL local:** `http://localhost:<PORT>/api/v1` (default porta 3001)  
**Base URL produção:** `https://<seu-dominio>.vercel.app/api/v1`  
**Health check:** `GET /health`

Montagem: `apps/backend/src/app.ts`

### Auth - `/api/v1/auth`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/register/aluno` | Público | Cadastro aluno + matrícula |
| POST | `/login` | Público | Login (e-mail + senha + perfil). ADM pode entrar com `perfil: "PROFESSOR"` na tela de treinador |
| POST | `/recuperar-senha/solicitar` | Público | Envia código de 6 dígitos + link por e-mail |
| POST | `/recuperar-senha/confirmar` | Público | Redefine senha com código ou token do link |
| GET | `/me` | JWT | Perfil atual |
| PATCH | `/me` | JWT | Atualizar perfil |
| POST | `/me/senha` | JWT | Alterar senha (logado; exige senha atual) |
| POST | `/refresh` | Público | Renovar tokens |

Rate limit: 20 tentativas / 15 min em login, cadastro e recuperação de senha.

### Admin - `/api/v1/admin` (ADM)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/dashboard` | Métricas globais (+ lista de professores no payload) |
| GET | `/professores` | Lista de professores com contagens (`?busca`, `?ativo`) |
| POST | `/professores` | Criar professor |
| GET | `/professores/:id` | Detalhe + turmas + alunos |
| PATCH | `/professores/:id/status` | `{ ativo: boolean }` desativar/reativar |
| GET | `/professores/:id/turmas` | Turmas do professor |
| GET | `/professores/:id/alunos` | Alunos do professor (`?turmaId`) |
| GET | `/turmas` | Lista turmas da plataforma (`?busca`) |
| GET | `/turmas/:id` | Detalhe da turma (dados + alunos) |
| GET | `/alunos` | Lista alunos (`?busca`, `?semTurma=true`) |
| GET | `/alunos/:id` | Perfil admin (conta, matrículas com datas, mensalidades) |
| GET | `/bloqueios` | Alunos bloqueados por inadimplência |
| POST | `/alunos/:id/matricular` | `{ turmaId }` matricular e gerar mensalidades |
| POST | `/alunos/:id/afastar` | `{ turmaId }` remover da turma |
| POST | `/alunos/:id/trocar-turma` | `{ turmaOrigemId, turmaDestinoId }` |
| POST | `/alunos/:id/desbloquear` | `{ turmaId }` liberar bloqueio de inadimplência |

### Turmas - `/api/v1/turmas` (Professor)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Listar turmas |
| POST | `/` | Criar turma |
| GET | `/:id` | Detalhe |
| PATCH | `/:id` | Atualização parcial |
| PATCH | `/:id/basico` | Edição completa dos campos básicos |
| POST | `/:id/foto/upload-url` | URL assinada para upload da foto |
| PATCH | `/:id/foto` | `{ fotoUrl }` grava foto (apaga antiga só após sucesso) |
| GET | `/:id/alunos` | Alunos + status financeiro |
| POST | `/:id/alunos` | Adicionar aluno |
| DELETE | `/:id` | Excluir turma |
| GET | `/:id/mensalidades` | Mensalidades da turma |
| GET | `/:id/eventos` | Listar eventos da turma (futuros e passados) |
| POST | `/:id/eventos` | Criar evento (amistoso/campeonato) |
| PATCH | `/:id/eventos/:eventoId` | Editar evento |
| DELETE | `/:id/eventos/:eventoId` | Excluir evento (soft delete) |

### Alunos - `/api/v1/alunos`

| Método | Rota | Auth extra | Descrição |
|--------|------|------------|-----------|
| GET | `/` | JWT | Lista (professor: todos; aluno: próprio) |
| GET | `/me/bloqueio` | Aluno | Status de bloqueio |
| GET | `/minhas-turmas` | Aluno sem bloqueio | Turmas do aluno |
| GET | `/minhas-turmas/:turmaId` | Aluno sem bloqueio | Detalhe |
| GET | `/minhas-turmas/:turmaId/eventos` | Aluno sem bloqueio | Próximos eventos da turma |
| PATCH | `/minhas-turmas/:turmaId` | Aluno sem bloqueio | Camisa/posição |
| GET | `/:id` | Ownership | Detalhe |
| PATCH | `/:id` | Ownership | Atualizar |
| POST | `/preview-turma` | Aluno sem bloqueio | Preview por código |
| POST | `/entrar-turma` | Aluno sem bloqueio | Matricular em turma |
| POST | `/:id/desbloquear-inadimplencia` | Professor | Desbloqueio manual |
| POST | `/:id/afastar-turma` | Professor | Afastar da turma |

### Mensalidades - `/api/v1/mensalidades`

| Método | Rota | Auth extra | Descrição |
|--------|------|------------|-----------|
| GET | `/` | JWT | Lista (`?status`, `?turmaId`) |
| GET | `/:id` | Ownership | Detalhe |
| POST | `/:id/marcar-pago` | Professor | Baixa manual |
| POST | `/gerar` | Professor | Gerar mensalidades |

### Comprovantes

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/v1/comprovantes/fila` | Professor | Fila EM_ANALISE |
| GET | `/api/v1/comprovantes/:id` | Professor | Detalhe + URL assinada |
| POST | `/api/v1/comprovantes/:id/aprovar` | Professor | Aprovar |
| POST | `/api/v1/comprovantes/:id/recusar` | Professor | Recusar |
| POST | `/api/v1/mensalidades/:id/comprovante/upload-url` | Aluno | URL de upload |
| POST | `/api/v1/mensalidades/:id/comprovante` | Aluno | Confirmar envio |

### Dashboard - `/api/v1/dashboard`

| Método | Rota | Auth |
|--------|------|------|
| GET | `/professor` | Professor |
| GET | `/aluno` | Aluno |

### Eventos - `/api/v1/eventos` (Professor)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Lista agregada de eventos de todas as turmas do professor |

CRUD por turma continua em `/api/v1/turmas/:id/eventos`.

### Notificações - `/api/v1/notificacoes`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/vapid-public-key` | Chave pública VAPID |
| GET | `/` | Últimas 50 notificações |
| GET | `/contagem` | Contagem não lidas |
| PATCH | `/:id/lida` | Marcar como lida |
| POST | `/marcar-todas-lidas` | Marcar todas |
| POST | `/push-token` | Registrar subscription push (alias → DeviceService) |

### Dispositivos - `/api/v1/dispositivos`

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/` | Registrar/atualizar dispositivo (web ou mobile) |

### Avisos - `/api/v1/avisos` (Professor)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Listar avisos |
| POST | `/` | Criar (imediato ou agendado) |

### Cron - `/api/cron` (protegido por CRON_SECRET)

| Método | Rota | Job |
|--------|------|-----|
| GET | `/avisos` | Processar avisos agendados |
| GET | `/diario` | Atrasos, bloqueios, notificações |
| GET | `/mensal` | Gerar mensalidades do mês |

### Formato de resposta padrão

**Sucesso:**
```json
{ "data": { ... } }
```

**Erro:**
```json
{ "error": { "code": "CODIGO", "message": "Mensagem legível" } }
```

---

## 9. Banco de dados (Supabase)

**Migration (banco novo):**
- `apps/backend/supabase/migrations/20250612000000_schema.sql` - schema completo
- `apps/backend/supabase/migrations/20250627000000_dispositivos.sql` - tabela `Dispositivo` (bancos existentes)
- `apps/backend/supabase/migrations/20250705000000_eventos_turma.sql` - eventos de turma
- `apps/backend/supabase/migrations/20250711000000_turma_foto.sql` - coluna `foto_url` + bucket `turmas-fotos`

### Diagrama de relacionamentos

```
Usuario (1) ── (0..1) Professor ── (N) Turma
Usuario (1) ── (0..1) Aluno
Aluno (N) ── MatriculaTurma ── (N) Turma
Aluno + Turma ── (N) Pagamento
Pagamento (1) ── (N) Comprovante
Turma (1) ── (N) Evento ── (N) Presenca   [Presenca sem UI]
Usuario (1) ── (N) Notificacao
Usuario (1) ── (N) RecuperacaoSenha
Usuario (1) ── (N) Dispositivo
Usuario (1) ── (N) TokenPushFcm   [legado - migrado para Dispositivo]
Professor + Turma ── (N) AvisoProfessor
```

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `Usuario` | Conta de acesso (e-mail, senha_hash, perfil) |
| `Professor` | Extensão do usuário treinador (chave_pix) |
| `Aluno` | Dados do atleta (usuario_id opcional) |
| `Turma` | Turma/equipe com mensalidade, PIX, convite |
| `MatriculaTurma` | Vínculo aluno-turma (afastado, bloqueio, camisa) |
| `Pagamento` | Mensalidade de um mês (status, vencimento, valor) |
| `Comprovante` | Arquivo enviado pelo aluno |
| `Notificacao` | Notificação in-app |
| `RecuperacaoSenha` | Código e link mágico para redefinir senha (expira em 15 min) |
| `Dispositivo` | Dispositivo registrado (web/mobile) para push e metadados |
| `TokenPushFcm` | Subscription Web Push (legado; migrado para `Dispositivo`) |
| `AvisoProfessor` | Avisos do professor para turma |
| `Evento` | Amistosos e campeonatos por turma (avisos informativos) |
| `Presenca` | Preparado para futuro (chamada/RSVP) |
| `_athlon_cron_config` | URL Vercel + CRON_SECRET para pg_cron |

### Segurança do banco

- `REVOKE ALL` para roles `anon` e `authenticated` em todas as tabelas.
- Acesso **somente via service role** no backend.
- **Não usa Supabase Auth** - autenticação própria com JWT.

---

## 10. Regras de negócio

### Mensalidades

- Geradas ao: criar turma, matricular aluno, cron mensal (dia 1).
- Unique: `(aluno_id, turma_id, mes_referencia)` - não duplica mês.
- Dia de vencimento limitado a **28** (evita problemas em fevereiro).
- Meses futuros não aparecem na listagem.
- **Status efetivo:** `PENDENTE`/`RECUSADO` com vencimento passado exibido como `ATRASADO` antes do cron persistir.
- Cron diário persiste `ATRASADO` no banco.

### Inadimplência

- **Regra:** `MESES_PARA_BLOQUEIO = 2` mensalidades atrasadas **na mesma turma**.
- Flag: `MatriculaTurma.bloqueado_inadimplencia` (por turma).
- Efeito: bloqueia acesso a minhas turmas e entrar em turma.
- Desbloqueio: automático ao regularizar OU manual pelo professor.
- Sincronizado após pagamentos, dashboard e crons.

### Comprovantes

- Upload direto ao Supabase Storage (signed URL), bucket `comprovantes` (privado).
- Tipos aceitos: JPEG, PNG, WebP, PDF.
- Status que permitem envio: `PENDENTE`, `RECUSADO`, `ATRASADO`.
- Envio → `EM_ANALISE`; aprovação → `PAGO`; recusa → `RECUSADO`.
- O bucket é criado pelo schema SQL ou automaticamente no primeiro upload (`storage.service.ts`).
- Após **aprovar** ou **recusar**, o arquivo é removido do Storage e `arquivo_url` fica `null` (migration `20250713000000_comprovante_arquivo_nullable.sql`).
- URL assinada de leitura só no **detalhe** do comprovante (fila/listagens não geram signed URL por item - economia no free tier).

### Turmas

- Código convite: 8 caracteres alfanuméricos únicos.
- PIX obrigatório na criação.
- Professor pode adicionar aluno sem conta (só nome/telefone).
- Excluir turma remove dados relacionados (pagamentos, comprovantes, matrículas).

### Avisos

- Enviados para todos alunos **ativos** (não afastados) da turma.
- Imediato ou agendado (`agendado_para`).
- Agendados processados pelo cron horário.

### Eventos de turma

- Tipos expostos na UI: **AMISTOSO** e **CAMPEONATO** (treino não é cadastrado pelo app).
- Professor cadastra na tela da turma (`/turmas/:id`): tipo, adversário, data/hora, local e descrição opcional.
- Título gerado automaticamente quando omitido (ex.: "Amistoso vs Time X").
- `permite_confirmacao_aluno` sempre `false` - **sem RSVP**; é apenas aviso informativo.
- Exclusão é soft delete (`ativo = false`).
- Ao criar, notificação `EVENTO_TURMA` para todos alunos ativos da turma (in-app + push).
- **Aluno:** card "Próximo evento" no dashboard (o mais próximo entre todas as turmas); lista "Próximos eventos" na tela da turma.
- Eventos passados somem das listas do aluno; o professor ainda vê passados para editar/excluir.
- Implementação: `apps/backend/src/modules/eventos/eventos.service.ts`, migration `20250705000000_eventos_turma.sql`.

---

## 11. Notificações e cron jobs

### Notificações automáticas

| Evento | Destinatário | Tipo | Quando |
|--------|--------------|------|--------|
| Nova mensalidade | Aluno | `MENSALIDADE_NOVA` | Cron mensal (dia 1) |
| Mensalidade atrasada | Aluno | `MENSALIDADE_ATRASADA:{turmaId}` | Cron diário (máx. 1x/semana) |
| Aviso do professor | Aluno | `AVISO_PROFESSOR` | Imediato ou cron horário |
| Evento da turma | Aluno | `EVENTO_TURMA` | Professor cria amistoso/campeonato |
| Comprovante aprovado | Aluno | `COMPROVANTE_APROVADO` | Ação do professor |
| Comprovante recusado | Aluno | `COMPROVANTE_RECUSADO` | Ação do professor |
| Pagamento confirmado | Aluno | `PAGAMENTO_CONFIRMADO` | Marcar pago manual |

Toda notificação in-app também dispara **Web Push** (PWA), conforme dispositivos registrados.

### Arquitetura de notificações

```
Evento de negócio
       ↓
NotificationService.send()
       ↓
├── InAppProvider      → tabela Notificacao (+ url deep link)
└── WebPushProvider    → dispositivos push_provider = WEB
```

Registro de dispositivos via `DeviceService` (`POST /api/v1/dispositivos`):

| Campo | Descrição |
|-------|-----------|
| `platform` | `WEB`, `ANDROID`, `IOS` |
| `pushProvider` | `WEB` (subscription VAPID) ou `EXPO` (legado, dispositivos antigos) |
| `pushToken` | Token do canal |
| `notificationPermission` | `granted`, `denied`, `default` |

O endpoint legado `POST /notificacoes/push-token` delega ao `DeviceService` (compatibilidade PWA).

### Agendadores

| Ambiente | Job | Horário | Onde |
|----------|-----|---------|------|
| Local (dev) | Avisos | A cada hora | `node-cron` em `server.ts` |
| Local (dev) | Diário | 06:00 | `node-cron` |
| Local (dev) | Mensal | 07:00 dia 1 | `node-cron` |
| Produção | Diário | 06:00 UTC | Vercel Cron → `/api/cron/diario` |
| Produção | Mensal | 07:00 dia 1 UTC | Vercel Cron → `/api/cron/mensal` |
| Produção | Avisos | A cada hora | Supabase `pg_cron` → HTTP na Vercel |

> Plano Hobby da Vercel limita crons a 1x/dia; por isso avisos horários rodam no Supabase.

---

## 12. Autenticação e segurança

- Senhas com **bcrypt** (12 rounds).
- Tokens JWT com secrets separados (access e refresh).
- Refresh automático no frontend (`apps/frontend/src/lib/api.ts`).
- Rate limit em login/cadastro.
- `CRON_SECRET` protege endpoints de cron.
- **Nunca** commitar `.env` (está no `.gitignore`).
- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- `service_role` só no backend/Vercel Environment Variables.

### Recuperação de senha ("Esqueci minha senha")

Fluxo em duas etapas, disponível nas telas de login de **treinador** (inclui ADM), **aluno**:

1. Usuário informa o e-mail → `POST /auth/recuperar-senha/solicitar`
2. Sistema gera **código de 6 dígitos** + **link mágico** (válidos por 15 minutos) e tenta enviar por e-mail
3. Usuário confirma identidade de uma das formas:
   - **Código:** digita o código + nova senha em `/login/{professor|aluno}/esqueci-senha`
   - **Link:** abre o link do e-mail em `/login/{professor|aluno}/redefinir-senha/:token`
4. `POST /auth/recuperar-senha/confirmar` atualiza a senha e invalida tokens pendentes

A resposta do passo 1 é sempre genérica (*"Se o e-mail estiver cadastrado, você receberá um código"*) para não revelar se o e-mail existe.

**Alterar senha no perfil** (`POST /auth/me/senha`) continua separado: exige estar logado e informar a senha atual.

#### Envio de e-mail (Resend)

O backend envia os e-mails via [Resend](https://resend.com) (`apps/backend/src/lib/email.ts`).

| Variável | Descrição |
|----------|-----------|
| `RESEND_API_KEY` | Chave da API Resend |
| `EMAIL_FROM` | Remetente (ex.: `ATHLON <noreply@seudominio.com>`) |
| `APP_URL` | URL do frontend para montar o link mágico (ex.: `http://localhost:5173` em dev) |

> **Status:** o código está pronto; falta configurar Resend em produção. **Passo a passo:** [config-resend-web-push.md](./config-resend-web-push.md).
**Desenvolvimento local sem Resend:** se `RESEND_API_KEY` estiver vazio, o backend **não envia e-mail** e imprime no terminal do `pnpm dev:backend`:

```
[email:dev] Recuperação de senha para usuario@email.com
  Código: 123456
  Link: http://localhost:5173/login/professor/redefinir-senha/...
```

Use esse log para testar o fluxo localmente.

---

## 13. PWA e Web Push

Web e PWA usam **o mesmo código** (`apps/frontend`). A diferença é que o PWA é instalável (Add to Home Screen) e registra push via Service Worker.

### PWA e instalação

- Manifest: nome ATHLON, `start_url: /`, tema `#5C3D2E`, display `standalone`, ícones 192×192 e 512×512.
- Service Worker com auto-update (`vite-plugin-pwa`).
- **Android / Chromium:** banner com botão "Instalar app" aciona o prompt nativo (`beforeinstallprompt`).
- **iOS / Safari:** banner aparece após ~30s de uso ou primeira navegação; abre tutorial em 3 passos (Compartilhar → Adicionar à Tela de Início). Dispensa fica salva por 7 dias no `localStorage`.
- Nenhum convite é exibido se o app já estiver em modo standalone (instalado).

**Arquivos:**

| Arquivo | Papel |
|---------|-------|
| `apps/frontend/src/lib/use-pwa-install.ts` | Hook: detecção iOS/standalone, eventos de instalação, timing |
| `apps/frontend/src/lib/pwa-install-storage.ts` | Persistência da dispensa do tutorial iOS |
| `apps/frontend/src/components/pwa/PwaInstallPrompt.tsx` | Banner de convite (Android e iOS) |
| `apps/frontend/src/components/pwa/TutorialInstalacaoIOS.tsx` | Modal passo a passo para iOS |

### Web Push (PWA no browser)

1. Após login de **aluno**, o painel de notificações solicita permissão.
2. Frontend obtém chave VAPID pública da API (`GET /notificacoes/vapid-public-key`).
3. Registra subscription no Service Worker e envia para `POST /api/v1/dispositivos` (`pushProvider: WEB`).
4. `public/push-handler.js` exibe notificações no service worker.

O endpoint legado `POST /notificacoes/push-token` ainda funciona (delega ao `DeviceService`).

**Guia detalhado (VAPID em produção):** [config-resend-web-push.md](./config-resend-web-push.md) (Parte B) e [web-push-producao.md](./web-push-producao.md)

**Gerar chaves VAPID:**
```bash
pnpm --filter @athlon/backend generate-vapid-keys
```

---

## 14. Variáveis de ambiente

### Backend - `apps/backend/.env`

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `JWT_SECRET` | Sim | Secret do access token |
| `JWT_REFRESH_SECRET` | Sim | Secret do refresh token |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave service role (secreta) |
| `PORT` | Não | Porta local (default 3001) |
| `CORS_ORIGIN` | Não | Origem CORS (local: `http://localhost:5173`) |
| `STORAGE_BUCKET` | Não | Default: `comprovantes` |
| `CRON_SECRET` | Prod | Proteção dos crons |
| `VAPID_PUBLIC_KEY` | Opcional | Web Push |
| `VAPID_PRIVATE_KEY` | Opcional | Web Push |
| `VAPID_SUBJECT` | Opcional | Ex: `mailto:seu@email.com` |
| `RESEND_API_KEY` | Recuperação de senha | Chave Resend (**pendente configuração - ver §12**) |
| `EMAIL_FROM` | Recuperação de senha | Remetente dos e-mails (ex.: `ATHLON <noreply@seudominio.com>`) |
| `APP_URL` | Recuperação de senha | URL do frontend para links mágicos (default: `CORS_ORIGIN`) |
| `ADMIN_EMAIL` | Seed ADM | E-mail do administrador (`pnpm seed:admin`) |
| `ADMIN_PASSWORD` | Seed ADM | Senha inicial do administrador |
| `ADMIN_NOME` | Seed ADM | Nome exibido (opcional) |

### Frontend - `apps/frontend/.env`

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL da API em dev. Ex: `http://localhost:3002/api/v1`. **Não definir na Vercel.** |

### Vercel (Environment Variables)

Copiar variáveis do backend + ajustar:

```
CORS_ORIGIN=https://seu-dominio.vercel.app
APP_URL=https://seu-dominio.vercel.app
```

**Não** definir `VITE_API_URL` na Vercel.

### Supabase (após deploy)

Configurar cron de avisos (após aplicar o schema):

```sql
INSERT INTO "_athlon_cron_config" (vercel_url, cron_secret)
VALUES ('https://seu-dominio.vercel.app', 'mesmo-CRON_SECRET-da-vercel')
ON CONFLICT (id) DO UPDATE SET
  vercel_url = EXCLUDED.vercel_url,
  cron_secret = EXCLUDED.cron_secret;
```

---

## 15. Desenvolvimento local

### Pré-requisitos

- Node.js 18+
- pnpm 9.x (`packageManager` no `package.json`)
- Conta Supabase com schema aplicado

### Passo a passo

```bash
# 1. Clonar repositório
git clone <url-do-repo>
cd Athlon

# 2. Instalar dependências (OBRIGATÓRIO usar pnpm, não npm)
pnpm install

# 3. Configurar Supabase
#    - Criar projeto em supabase.com
#    - SQL Editor: executar apps/backend/supabase/migrations/20250612000000_schema.sql

# 4. Bucket "comprovantes" - incluído no schema (ou criado automaticamente no 1º upload)

# 5. Configurar variáveis
cp .env.example apps/backend/.env
# Editar apps/backend/.env com suas chaves

cp apps/frontend/.env.example apps/frontend/.env   # se existir
# Ou criar apps/frontend/.env:
# VITE_API_URL=http://localhost:3001/api/v1
# (ajustar porta conforme PORT no backend)

# 6. Testar conexão com banco
pnpm test:db

# 7. Rodar em dois terminais
pnpm dev:backend    # API em http://localhost:3001 (ou PORT do .env)
pnpm dev:frontend   # PWA em http://localhost:5173

# Ou ambos juntos:
pnpm dev

# 8. Rodar testes automatizados (recomendado antes do deploy)
pnpm test
```

### Proxy local

O Vite (`vite.config.ts`) faz proxy de `/api` para o backend em desenvolvimento quando `VITE_API_URL` não é usado com URL absoluta.

---

## 16. Deploy em produção (Vercel + Supabase)

### Arquitetura

- **Vercel:** frontend (SPA) + API Express (serverless) no mesmo domínio
- **Supabase:** PostgreSQL + Storage + pg_cron (avisos horários)

### Plano Free do Supabase

- O plano free (`t4g.nano`) é adequado enquanto o produto não tem tráfego de venda.
- RAM ~40–60% em idle é **normal** (Postgres + PostgREST); não indica necessidade de upgrade.
- Critérios para upar: Disk ou conexões apertando, crons falhando/lentos, ou muitos usuários ativos + Storage/backup maiores.
- Detalhes e pendências de otimização: [Melhoria.md - Supabase Free](./Melhoria.md#supabase-free-consumo).

### Passo a passo

1. **Supabase**
   - Criar projeto
   - Aplicar `20250612000000_schema.sql` no SQL Editor
   - Configurar `_athlon_cron_config` (avisos horários)
   - `pnpm seed:admin` para criar o primeiro ADM

2. **Git**
   - Push para GitHub/GitLab

3. **Vercel**
   - Importar repositório
   - Root Directory: `./` (raiz)
   - Framework: Other (usa `vercel.json`)
   - Environment Variables: todas do backend (incl. `APP_URL` e `CORS_ORIGIN` com a URL final)
   - `CORS_ORIGIN` = URL final do app

4. **Deploy**
   - `vercel.json` executa `pnpm run build:vercel`
   - Build compila shared-types → backend → frontend

5. **Validar**
   - `https://seu-dominio.vercel.app/health` → `{"status":"ok"}`
   - `pnpm test`
   - Testar login e fluxo de comprovante
   - Chrome DevTools → Application → Manifest (Installability OK)
   - Testar instalação PWA no Android e tutorial iOS no Safari

### O que NÃO vai no Git

- `apps/backend/.env`
- `apps/frontend/.env`
- `node_modules/`, `dist/`

O `.gitignore` já protege esses arquivos. Use `.env.example` como referência.

---

## 17. Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm install` | Instala dependências do monorepo |
| `pnpm dev` | Frontend + backend em paralelo |
| `pnpm dev:frontend` | Só frontend (Vite :5173) |
| `pnpm dev:backend` | Só backend (Express + crons locais) |
| `pnpm build` | Build completo (shared-types + backend + frontend) |
| `pnpm build:vercel` | Build para deploy Vercel |
| `pnpm test` | Testes automatizados (shared-types + frontend) |
| `pnpm test:db` | Testa conexão Supabase |
| `pnpm seed:admin` | Cria usuário ADM inicial no banco |
| `pnpm --filter @athlon/frontend test:watch` | Testes do PWA em modo watch |
| `pnpm --filter @athlon/backend generate-vapid-keys` | Gera chaves VAPID |

---

## 18. Arquivos-chave

| Arquivo | Função |
|---------|--------|
| `apps/frontend/src/app/router.tsx` | Rotas do app (`React.lazy` / code-splitting) |
| `apps/frontend/src/app/guards.tsx` | Proteção de rotas no cliente |
| `apps/frontend/src/lib/api.ts` | Cliente HTTP, tokens, erros |
| `apps/frontend/src/lib/auth-context.tsx` | Estado de autenticação |
| `apps/backend/src/app.ts` | Montagem da API Express |
| `apps/backend/src/server.ts` | Servidor local + crons |
| `api/index.ts` | Entrypoint serverless Vercel |
| `vercel.json` | Config de deploy |
| `apps/backend/src/middleware/auth.ts` | JWT e roles |
| `apps/backend/src/modules/admin/` | API administrativa |
| `apps/backend/src/modules/comprovantes/storage.service.ts` | Upload Storage (bucket + URLs assinadas) |
| `apps/backend/src/lib/email.ts` | Envio de e-mail (Resend) |
| `apps/backend/scripts/seed-admin.ts` | Seed do usuário ADM inicial |
| `apps/frontend/src/features/admin/` | Telas do painel administrativo |
| `apps/backend/src/modules/eventos/eventos.service.ts` | Eventos de turma (amistoso/campeonato) |
| `apps/backend/src/lib/inadimplencia.ts` | Regra de bloqueio |
| `apps/backend/src/lib/mensalidade-focus.ts` | Status efetivo e foco |
| `apps/backend/src/jobs/cron.ts` | Jobs agendados |
| `packages/shared-types/` | Schemas Zod compartilhados |
| `apps/frontend/src/lib/use-pwa-install.ts` | Hook de instalação PWA (Android + iOS) |
| `apps/frontend/src/components/pwa/PwaInstallPrompt.tsx` | Banner de convite para instalar |
| `apps/frontend/src/lib/push-notifications.ts` | Registro push VAPID (PWA) |
| `apps/backend/supabase/migrations/` | Schema do banco |

---

## 19. Decisões arquiteturais

1. **Auth própria** em vez de Supabase Auth - controle total de JWT e perfis.
2. **Service role only** - segurança na camada API, não RLS no app.
3. **Monorepo + shared-types** - validação Zod idêntica no front e back.
4. **Deploy unificado Vercel** - SPA + API no mesmo domínio, sem CORS complexo.
5. **Crons híbridos** - Vercel (diário/mensal) + Supabase pg_cron (avisos horários).
6. **Upload direto ao Storage** - backend não proxya arquivos.
7. **Bloqueio por turma** - inadimplência granular, não bloqueia o app inteiro.
8. **Eventos de turma** - amistoso/campeonato informativos, sem presença/RSVP; tabela `Presenca` reservada para expansão futura.

---

## 20. Checklist para clonar em outro PC

```
[ ] Instalar Node.js 18+ e pnpm 9.x
[ ] git clone <repositorio>
[ ] pnpm install
[ ] Criar apps/backend/.env (copiar do .env.example ou do PC antigo - NÃO commitar)
[ ] Criar apps/frontend/.env com VITE_API_URL apontando para o backend local
[ ] Aplicar schema no Supabase (banco novo):
    - apps/backend/supabase/migrations/20250612000000_schema.sql
[ ] (Banco existente) Aplicar migration Dispositivo:
    - apps/backend/supabase/migrations/20250627000000_dispositivos.sql
[ ] (Banco existente) Aplicar migration Eventos de turma:
    - apps/backend/supabase/migrations/20250705000000_eventos_turma.sql
    - apps/backend/supabase/migrations/20250711000000_turma_foto.sql
[ ] Configurar ADMIN_EMAIL e ADMIN_PASSWORD em apps/backend/.env
[ ] pnpm seed:admin
[ ] (Opcional) Criar bucket comprovantes manualmente - já incluso no schema
[ ] pnpm test:db
[ ] pnpm test
[ ] pnpm dev
[ ] (Produção) Configurar variáveis na Vercel (incluir APP_URL e CORS_ORIGIN com a URL final)
[ ] (Produção) Configurar Resend para recuperação de senha (pendente)
[ ] (Produção) Configurar _athlon_cron_config no Supabase
[ ] (Produção) Validar /health e fluxo de upload de comprovante
```

### Subir para o Git (primeira vez)

```bash
git add .
git status                    # conferir que .env NÃO aparece
git commit -m "docs: documentação completa e projeto Athlon"
git remote add origin <url>
git push -u origin main
```

### Clonar no outro PC

```bash
git clone <url>
cd Athlon
pnpm install
# Recriar .env localmente (não vem do git)
```

---

## 21. Funcionalidades futuras

Documentadas em `docs/Melhoria.md`:

- Presença/chamada com RSVP (tabela `Presenca` - eventos de turma já existem, mas sem confirmação de presença)
- Histórico de eventos passados visível para o aluno
- Exclusão do arquivo de comprovante no Storage após aprovação/recusa
- Notificação ao professor quando aluno envia comprovante
- Bloqueio mais rígido de inadimplência (redirecionar direto para mensalidades)
- Exclusão definitiva de conta de professor (hoje só inativação)
- BottomNav do aluno alinhado ao padrão do professor (Início no centro), se desejado

---

## 21.1. Atualizações recentes (jul/2026)

### UX / marca (professor)

- Login e seleção de perfil alinhados à marca (marrom + dourado)
- Dashboard com métricas operacionais (turmas, alunos, comprovantes, inadimplentes)
- Cards de turmas com foto, nome e código; detalhe com hero + treino + financeiro
- Foto da turma (upload no detalhe; migration `20250711000000_turma_foto.sql`)
- Lista de alunos com filtros de status financeiro, contador e empty states
- BottomNav: Eventos | Mensal | Início | Turmas | Alunos
- Página `/eventos` com listagem agregada

### UX / marca (aluno)

- BottomNav: Eventos | Mensal | Início (elevado) | Turmas | Perfil (Turmas ocultas se bloqueado)
- Página `/eventos` agrega amistosos/campeonatos de todas as turmas do aluno
- Dashboard com métricas financeiras, CTA de pagamento e aviso de bloqueio por turma
- Lista e detalhe de turmas com foto / hero alinhados ao professor
- Perfil com atalho **Chamado (suporte)**

### Chamados (suporte)

- Aluno e professor: `GET/POST /api/v1/chamados`, `GET /api/v1/chamados/:id` - telas `/chamados` e `/chamados/:id` (atalho no Perfil)
- ADM: `GET/PATCH /api/v1/admin/chamados` - telas em Edição → Chamados (`/admin/chamados`)
- Migrations: `20250712000000_chamados.sql`, `20250714000000_chamado_professor.sql` (`aluno_id` ou `professor_id`)

### Painel ADM

- Dashboard só com métricas + atalhos (lista completa em Professores)
- Jornada Professor → Turma → Aluno
- Aba Alunos global (busca nome/e-mail/CPF/RG; filtro sem turma)
- Perfil do aluno com data de conta e data de matrícula por turma
- Aba **Edição**: chamados, matricular, remover, trocar turma, desbloquear, ativar/desativar professor
- BottomNav: Profs | Alunos | Início | Edição | Perfil

### Padronização de texto

- Travessões tipográficos (em dash / en dash Unicode) substituídos por hífen (`-`) no código e na documentação

### Performance frontend (code-splitting)

- Rotas com `React.lazy` + `Suspense` em [`apps/frontend/src/app/router.tsx`](../apps/frontend/src/app/router.tsx)
- **Eager (bundle inicial):** `ProfileSelectPage`, `LoginFormPage`
- **Lazy (chunk sob demanda):** demas páginas (dashboards, aluno, professor, admin, legal, recuperação de senha)
- Bundle principal ~438 KB (antes ~550 KB); não altera quantidade de requests à API/Supabase

### Economia Supabase (free tier)

- Polling de notificações: 180s; React Query `staleTime` 90s e `refetchOnWindowFocus: false`
- Signed URL de comprovante só no detalhe (não na fila/listagem)
- Guia de métricas e quando upar: [Melhoria.md - Supabase Free](./Melhoria.md#supabase-free-consumo)

---

## 22. Testes automatizados

O projeto usa **Vitest** para validar schemas compartilhados e lógica do frontend PWA.

### Executar

```bash
pnpm test
```

Roda, em sequência:

1. Build de `@athlon/shared-types`
2. Testes dos schemas Zod
3. Testes do frontend (push, instalação PWA)

### O que é coberto

| Pacote | Arquivo(s) | Cenários |
|--------|------------|----------|
| `frontend` | `push-notifications.test.ts` | Fluxo VAPID no browser |
| `frontend` | `pwa-install-storage.test.ts` | Dispensa do tutorial iOS (localStorage) |
| `frontend` | `use-pwa-install.test.ts` | Detecção iOS e modo standalone |

### O que não é coberto (manual ou futuro)

- `beforeinstallprompt` real no Chrome Android (testar em dispositivo)
- Tutorial iOS no Safari real
- `POST /dispositivos` contra API real
- E2E de login e fluxo completo (Playwright)

### Modo watch (desenvolvimento)

```bash
pnpm --filter @athlon/frontend test:watch
```

---

## Contato e licença

Software proprietário de **Otávio Morais Antocevicz**. Consulte `LICENSE` para termos de uso.

Para dúvidas técnicas sobre deploy, consulte também:
- `README.md` - início rápido
- `docs/web-push-producao.md` - push em produção
- `docs/Melhoria.md` - backlog de melhorias
