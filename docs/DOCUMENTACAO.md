# ATHLON - Documentação Completa do Projeto

> Versão do projeto: **1.7.1**  
> Última atualização deste documento: agosto/2026  
> Software proprietário - ver `LICENSE`

> **Infraestrutura atual (pós-migração):** Frontend na Vercel, API + PostgreSQL + crons no Railway, storage no Cloudflare R2, e-mail via Resend. Guia de deploy: [DEPLOY.md](./DEPLOY.md).

Este documento descreve o sistema por completo para facilitar onboarding em outro computador, manutenção e deploy. Use junto com `README.md` (início rápido) e `.env.example` (variáveis).

Pendências operacionais do dono (Play Store, testers, Expo): [WHITELIST.md](./WHITELIST.md).

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
9. [Banco de dados (PostgreSQL)](#9-banco-de-dados-postgresql)
10. [Regras de negócio](#10-regras-de-negócio)
11. [Notificações e cron jobs](#11-notificações-e-cron-jobs)
12. [Autenticação e segurança](#12-autenticação-e-segurança)
13. [PWA e Web Push](#13-pwa-e-web-push)
14. [Variáveis de ambiente](#14-variáveis-de-ambiente)
15. [Desenvolvimento local](#15-desenvolvimento-local)
16. [Deploy em produção (Vercel + Railway)](#16-deploy-em-produção-vercel--railway)
17. [Scripts disponíveis](#17-scripts-disponíveis)
18. [Arquivos-chave](#18-arquivos-chave)
19. [Decisões arquiteturais](#19-decisões-arquiteturais)
20. [Checklist para clonar em outro PC](#20-checklist-para-clonar-em-outro-pc)
21. [Funcionalidades futuras](#21-funcionalidades-futuras)
22. [Testes automatizados](#22-testes-automatizados)

---

## 1. O que é o ATHLON

O **ATHLON** é uma plataforma **mobile-first** de gestão esportiva voltada principalmente para **treinadores** que administram turmas/equipes e **alunos** que participam dessas turmas. Disponível na **web**, como **PWA** instalável e no **app da Play Store** (WebView do mesmo frontend).

O núcleo do MVP é o **fluxo financeiro de mensalidades**:

1. Administrador (ADM) cria a conta do treinador; o treinador cadastra turmas com valor de mensalidade e chave PIX.
2. Aluno se cadastra (sem código da turma), confirma o e-mail com código de 6 dígitos e depois entra na turma com o código de convite.
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
| **Backend** | Node.js, Express 4, TypeScript, JWT, bcryptjs, Zod, `pg` |
| **Banco** | PostgreSQL (Railway) |
| **Arquivos** | Cloudflare R2 (`comprovantes/`, `turmas-fotos/`) |
| **E-mail** | Resend |
| **Push** | Web Push (VAPID) |
| **Instalação** | Web, PWA (Android/iOS) e app Play Store (`apps/mobile` — WebView) |
| **Testes** | Vitest (shared-types + frontend) |
| **Monorepo** | pnpm workspaces |
| **Tipos compartilhados** | `@athlon/shared-types` (Zod schemas + enums) |
| **Produção** | Vercel (frontend) + Railway (API + PostgreSQL + crons) |

---

## 4. Estrutura do monorepo

```
Athlon/
├── package.json                 # Scripts raiz (dev, build, db:migrate)
├── pnpm-workspace.yaml          # apps/* e packages/*
├── vercel.json                  # Deploy do frontend (SPA)
├── railway.toml                 # Deploy do backend (Railway)
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
│       │   ├── app.ts           # Montagem Express
│       │   ├── server.ts        # Listen + node-cron
│       │   ├── config/          # env.ts, database.ts
│       │   ├── middleware/      # auth, validate, error-handler, cron-auth
│       │   ├── modules/         # Rotas por domínio (auth, admin, turmas, etc.)
│       │   ├── lib/             # db, jwt, email, storage (R2), notificacoes, push
│       │   └── jobs/cron.ts     # Lógica dos jobs agendados
│       ├── migrations/          # Schema SQL (PostgreSQL)
│       └── scripts/             # migrate, test-db, seed-admin, generate-vapid-keys
│
│   └── mobile/                  # App Play Store (@athlon/mobile — Expo + WebView)
│       ├── App.tsx              # WebView → athlonsport.app.br
│       ├── app.json             # package Android, ícones, permissões
│       └── assets/              # ícones
│
├── packages/
│   └── shared-types/            # Contratos Zod + enums compartilhados
│
└── docs/
    ├── DOCUMENTACAO.md          # Este arquivo
    ├── DEPLOY.md                # Guia de deploy (Vercel + Railway)
    ├── WHITELIST.md             # Pendências do dono (Play Store, testers, Expo)
    ├── Melhoria.md              # Pendências e melhorias
    ├── config-resend-web-push.md
    ├── play-store-mobile.md     # App Android (Play Store)
    ├── play-store-ficha.md      # Textos para colar na Play Console
    └── web-push-producao.md     # Guia de push em produção
```

### Fluxo de requisição em produção

```
Navegador (athlonsport.app.br)
    │
    ├── /, /login, /turmas...  →  Vercel (apps/frontend/dist — SPA)
    │
    └── /api/v1/*, /health     →  api.athlonsport.app.br (Railway Express)
                                      ├── PostgreSQL (Railway)
                                      └── Cloudflare R2 (comprovantes, turmas-fotos)
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
| `GuestRoute` | Login/cadastro — redireciona logados (aluno não verificado → `/verificar-email`; ADM → `/admin`) |
| `ProtectedRoute` | Exige usuário autenticado |
| `AlunoEmailGate` | Aluno sem e-mail verificado só acessa `/verificar-email`, `/perfil` e `/chamados` |
| `AlunoVerificacaoRoute` | Tela de verificação — apenas aluno com e-mail pendente |
| `ProfessorRoute` | Apenas professor |
| `AdminRoute` | Apenas ADM; sem login redireciona para `/login/professor`. Sem MFA ativo, o painel fica limitado ao perfil para configurar o autenticador |
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
   - Dados pessoais (sem código da turma)
   - E-mail de verificação com código de 6 dígitos
3. Verificação (/verificar-email)
   - Até confirmar: acesso limitado (verificar e-mail, perfil, chamados, sair)
4. Após verificar → Dashboard aluno
   - Se ainda sem turma: CTA "Entrar com código" em Minhas turmas
5. Mensalidades (/mensalidades)
   - Lista com filtros por status
   - Detalhe: copiar PIX, enviar comprovante
6. Minhas turmas (/minhas-turmas)
   - Entrar em turma com código de convite
   - Ver colegas, camisa, posição
   - Ver próximos eventos da turma (amistoso/campeonato)
7. Se inadimplente (2+ meses atrasados na mesma turma):
   - Bloqueado em "Minhas turmas" e entrar turma
   - Ainda acessa home, mensalidades e perfil para regularizar
8. Upload de comprovante (fluxo em 2 passos)
   a) POST upload-url → recebe URL assinada do Cloudflare R2
   b) PUT arquivo direto no R2
   c) POST confirmar comprovante → status EM_ANALISE
9. Recebe notificações in-app e push (se habilitado)
10. Chamados de suporte: abre em Perfil; recebe e-mail quando o ADM responde
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
   - Dados, PIX, ativar/desativar, **excluir conta** (definitivo)
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
   - Excluir conta do aluno (definitivo)
9. Edição (/admin/edicao)
   - Matricular aluno em turma
   - Remover aluno da turma
   - Trocar aluno de turma
   - Desbloquear inadimplência
   - Professores: ativar, desativar **ou excluir** a conta
   - Atalho para alunos sem turma
10. Perfil (/admin/perfil) - MFA obrigatório, alterar senha, logout
11. BottomNav: Profs | Alunos | Início | Edição | Perfil
```

> `/login/admin` redireciona para `/login/professor` (compatibilidade com links antigos).

Seed: `pnpm seed:admin` (variáveis `ADMIN_EMAIL`, `ADMIN_PASSWORD` em `apps/backend/.env`)

### 6.4 Fluxo de comprovante (detalhado)

```
Aluno                          Storage (R2)                    Professor
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
| `/cadastro/aluno` | RegisterAlunoPage | Cadastro aluno (sem matrícula; envia código por e-mail) |
| `/termos` | TermosDeUsoPage | Termos de uso |
| `/privacidade` | PoliticaPrivacidadePage | Política de privacidade |

### Rotas autenticadas

| Rota | Guard | Tela | Descrição |
|------|-------|------|-----------|
| `/verificar-email` | Protected + AlunoVerificacao | VerificarEmailPage | Confirma e-mail com código de 6 dígitos (aluno) |
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
| `/eventos` | Protected | EventosAlunoPage ou EventosProfessorPage | Eventos agregados por perfil |
| `/minhas-turmas` | AlunoTurmas | TurmasAlunoPage | Turmas do aluno |
| `/minhas-turmas/:id` | AlunoTurmas | TurmaAlunoDetailPage | Detalhe da turma e próximos eventos |
| `/chamados` | Protected | AlunoChamadosPage | Lista de chamados (aluno/professor) |
| `/chamados/:id` | Protected | AlunoChamadoDetailPage | Detalhe do chamado |
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
| `/admin/edicao/professores` | AdminEdicaoProfessoresPage | Ativar, desativar ou excluir professor |
| `/admin/chamados` | AdminChamadosPage | Lista de chamados (ADM) |
| `/admin/chamados/:id` | AdminChamadoDetailPage | Responder chamado |
| `/admin/perfil` | AdminPerfilPage | Perfil do ADM |

### Navegação inferior (`BottomNav.tsx` / `AdminBottomNav.tsx`)

**Professor:** Eventos | Mensal | Início (centro) | Turmas | Alunos  
**Aluno (e-mail verificado):** Eventos | Mensal | Início (centro) | Turmas | Perfil (Turmas oculta se bloqueado)  
**Aluno (e-mail pendente):** Verificar | Perfil  
**ADM:** Profs | Alunos | Início (centro) | Edição | Perfil

---

## 8. API REST - endpoints

**Base URL local:** `http://localhost:<PORT>/api/v1` (default porta 3001)  
**Base URL produção:** `https://api.athlonsport.app.br/api/v1`  
**Health check:** `GET /health` (em `https://api.athlonsport.app.br/health`)

Montagem: `apps/backend/src/app.ts`

### Auth - `/api/v1/auth`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/register/aluno` | Público | Cadastro aluno (conta + envio de código de verificação por e-mail) |
| POST | `/login` | Público | Login (e-mail + senha + perfil). ADM pode entrar com `perfil: "PROFESSOR"` na tela de treinador. Se o ADM tem MFA, a resposta traz `requiresMfa: true` |
| POST | `/login/mfa` | Cookie MFA pendente | Confirma login do ADM com código TOTP (6 dígitos) ou código de backup |
| GET | `/mfa/status` | JWT ADM | `{ habilitado, setupPendente, backupCodesRestantes }` |
| POST | `/mfa/setup` | JWT ADM | Gera ou **reutiliza** o secret pendente e devolve QR (`otpauthUrl`, `qrCodeDataUrl`) |
| POST | `/mfa/confirm` | JWT ADM | Ativa MFA com código de 6 dígitos; devolve 8 códigos de backup |
| POST | `/mfa/backup-codes` | JWT ADM | Regenera 8 códigos (invalida os antigos). Corpo: `{ codigo }` TOTP de 6 dígitos |
| POST | `/verificar-email/confirmar` | JWT (aluno) | Confirma e-mail com código de 6 dígitos |
| POST | `/verificar-email/reenviar` | JWT (aluno) | Reenvia código de verificação por e-mail |
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
| DELETE | `/professores/:id` | Exclusão definitiva (login + turmas; alunos do sistema são preservados) |
| GET | `/professores/:id/turmas` | Turmas do professor |
| GET | `/professores/:id/alunos` | Alunos do professor (`?turmaId`) |
| GET | `/turmas` | Lista turmas da plataforma (`?busca`) |
| GET | `/turmas/:id` | Detalhe da turma (dados + alunos) |
| GET | `/alunos` | Lista alunos (`?busca`, `?semTurma=true`) |
| GET | `/alunos/:id` | Perfil admin (conta, matrículas com datas, mensalidades) |
| DELETE | `/alunos/:id` | Exclusão definitiva do cadastro do aluno |
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

## 9. Banco de dados (PostgreSQL)

**Migrations:** `apps/backend/migrations/` — aplicadas via `pnpm db:migrate`.

Para banco novo, o schema completo está em `apps/backend/migrations/001_schema.sql` (inclui tabelas, índices, enums e dados iniciais).

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
Usuario (1) ── (N) Chamado
```

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `Usuario` | Conta de acesso (e-mail, senha_hash, perfil, `email_verificado_em`) |
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
| `Chamado` | Suporte aluno/professor → ADM |
| `Presenca` | Preparado para futuro (chamada/RSVP) |

### Segurança do banco

- Acesso **somente via backend** (conexão `DATABASE_URL` no Railway).
- **Não usa auth externo** — autenticação própria com JWT.
- Em produção, o PostgreSQL fica na rede interna do Railway (não exposto publicamente).

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

- Upload direto ao **Cloudflare R2** (URL assinada), prefixo `comprovantes/` (privado).
- Tipos aceitos: JPEG, PNG, WebP, PDF.
- Status que permitem envio: `PENDENTE`, `RECUSADO`, `ATRASADO`.
- Envio → `EM_ANALISE`; aprovação → `PAGO`; recusa → `RECUSADO`.
- Sem R2 configurado, uploads retornam erro 503 (`STORAGE_UNAVAILABLE`).
- Após **aprovar** ou **recusar**, o arquivo é removido do R2 e `arquivo_url` fica `null`.
- URL assinada de leitura só no **detalhe** do comprovante (fila/listagens não geram signed URL por item).

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

Toda notificação in-app também dispara **Web Push** (barra do sistema / PWA), se o usuário tiver um dispositivo `WEB` registrado.

Em produção as chaves **VAPID já estão no Railway**. O frontend pede permissão e grava a subscription **no login** (aluno e professor), não só ao abrir o sino.

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
| Produção | Avisos | A cada hora | `node-cron` no Railway |
| Produção | Diário | 06:00 | `node-cron` no Railway |
| Produção | Mensal | 07:00 dia 1 | `node-cron` no Railway |

Endpoints manuais (opcional, com `CRON_SECRET`): `GET /api/cron/avisos`, `/diario`, `/mensal`.

> Todos os crons rodam no processo Express do Railway (`CRON_ENABLED=true` por padrão). O `railway.toml` também executa migrations e seed do ADM na subida do serviço.

---

## 12. Autenticação e segurança

- Senhas com **bcrypt** (12 rounds).
- Tokens JWT com secrets separados (access e refresh).
- Refresh automático no frontend (`apps/frontend/src/lib/api.ts`).
- Rate limit em login/cadastro.
- `CRON_SECRET` protege endpoints de cron manuais.
- **Nunca** commitar `.env` (está no `.gitignore`).
- Secrets (`JWT_*`, `DATABASE_URL`, `R2_*`, `VAPID_PRIVATE_KEY`) **somente** no Railway.
- **MFA TOTP obrigatório para ADM** (`/admin/perfil`). O secret pendente é reutilizado (não gera conta nova no autenticador a cada clique). Login: `POST /auth/login` + `POST /auth/login/mfa`.

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

### Verificação de e-mail (aluno)

Fluxo obrigatório após o cadastro (`POST /auth/register/aluno`):

1. Sistema envia **código de 6 dígitos** por e-mail (válido por 30 minutos)
2. Aluno informa o código em `/verificar-email` → `POST /auth/verificar-email/confirmar`
3. Até confirmar, o app restringe navegação (`AlunoEmailGate`): apenas `/verificar-email`, `/perfil`, `/chamados` e logout
4. Após verificar, o aluno entra na turma em **Minhas turmas** com o código de convite (`POST /alunos/entrar-turma`)

Reenvio: `POST /auth/verificar-email/reenviar` (rate limit igual ao login).

Migration: `apps/backend/migrations/003_email_verificacao.sql` (`Usuario.email_verificado_em`).

#### Envio de e-mail (Resend)

O backend envia e-mails via [Resend](https://resend.com) (`apps/backend/src/lib/email.ts`).

| Tipo | Quando |
|------|--------|
| Recuperação de senha | Usuário solicita "Esqueci minha senha" |
| Verificação de e-mail | Aluno se cadastra (código 6 dígitos) |
| Chamado respondido | ADM responde chamado de aluno ou professor |

| Variável | Descrição |
|----------|-----------|
| `RESEND_API_KEY` | Chave da API Resend |
| `EMAIL_FROM` | Remetente (ex.: `ATHLON <noreply@athlonsport.app.br>`) |
| `APP_URL` | URL do frontend para montar links (ex.: chamado, redefinição de senha) |

> **Status:** Resend **configurado e funcionando em produção**. Guia de setup: [config-resend-web-push.md](./config-resend-web-push.md).
**Desenvolvimento local sem Resend:** se `RESEND_API_KEY` estiver vazio, o backend **não envia e-mail** e imprime no terminal do `pnpm dev:backend`:

```
[email:dev] Recuperação de senha para usuario@email.com
  Código: 123456
  Link: http://localhost:5173/login/professor/redefinir-senha/...
```

Use esse log para testar o fluxo localmente.

---

## 13. PWA, app Play Store e Web Push

Web, PWA e app da Play Store usam **o mesmo frontend** (`apps/frontend`). O app da loja é um shell nativo (`apps/mobile`) com WebView apontando para o site em produção.

### Canais de instalação

| Canal | Como acessa |
|-------|-------------|
| **Web** | Navegador → https://athlonsport.app.br |
| **PWA** | Instalar pelo Chrome (Android) ou Safari (iOS) |
| **Play Store** | App `apps/mobile` (Expo + WebView) |

Guia Play Store: [play-store-mobile.md](./play-store-mobile.md)

### PWA e instalação

- Manifest: nome ATHLON, `start_url: /`, tema `#5C3D2E`, display `standalone`, ícones 192×192 e 512×512.
- Service Worker com auto-update (`vite-plugin-pwa`); ícone maskable no manifest.
- **Android / Chromium:** banner com botão "Instalar app" aciona o prompt nativo (`beforeinstallprompt`).
- **iOS / Safari:** tutorial (Safari → Compartilhar → Adicionar à Tela de Início). Dispensa por 7 dias no `localStorage`.
- Nenhum convite é exibido se o app já estiver em modo standalone (instalado) **ou** dentro do shell Play Store (`isAthlonMobileApp()`).

**Arquivos:**

| Arquivo | Papel |
|---------|-------|
| `apps/frontend/src/lib/is-athlon-app.ts` | Detecta WebView do app Play Store |
| `apps/frontend/src/lib/use-pwa-install.ts` | Hook: detecção iOS/standalone/app nativo, eventos de instalação |
| `apps/frontend/src/lib/pwa-install-storage.ts` | Persistência da dispensa do tutorial iOS |
| `apps/frontend/src/components/pwa/PwaInstallPrompt.tsx` | Banner de convite (Android e iOS) |
| `apps/frontend/src/components/pwa/TutorialInstalacaoIOS.tsx` | Modal passo a passo para iOS |
| `apps/mobile/App.tsx` | WebView + injeção `window.__ATHLON_APP__` |

### Web Push (PWA no browser)

**Status produção (ago/2026):** VAPID configurado no Railway. Push da barra do sistema ativo para quem concedeu permissão.

1. Após login de **aluno** ou **professor**, o app solicita permissão de notificação (`registrarPushNotifications` no `AuthProvider`).
2. Frontend obtém a chave VAPID pública (`GET /notificacoes/vapid-public-key`). Sem essa chave a subscription não é criada.
3. Cria/atualiza a subscription no Service Worker e envia para `POST /api/v1/dispositivos` (`pushProvider: WEB`, `pushToken` = JSON da subscription).
4. `public/push-handler.js` (importado pelo SW do `vite-plugin-pwa`) chama `showNotification` na barra do sistema, mesmo com o app fechado.
5. `WebPushProvider` envia com TTL 24h e `urgency: high`. Subscriptions 404/410/403 são removidas.

**Requisitos no aparelho:** HTTPS; permissão concedida; no **iOS**, PWA instalado na Tela de Início (16.4+). Dentro do WebView da Play Store o push web é limitado.

O endpoint legado `POST /notificacoes/push-token` ainda funciona (delega ao `DeviceService`).

**Guia:** [config-resend-web-push.md](./config-resend-web-push.md) (Parte B) e [web-push-producao.md](./web-push-producao.md)

Chaves já estão no Railway de produção. Só regenere com `pnpm --filter @athlon/backend generate-vapid-keys` se houver comprometimento — todos os aparelhos precisarão se inscrever de novo.

---

## 14. Variáveis de ambiente

### Backend - `apps/backend/.env`

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | PostgreSQL (local ou Railway) |
| `DATABASE_SSL` | Não | `true` em produção Railway |
| `JWT_SECRET` | Sim | Secret do access token |
| `JWT_REFRESH_SECRET` | Sim | Secret do refresh token |
| `PORT` | Não | Porta local (default 3001) |
| `CORS_ORIGIN` | Não | Origem(s) CORS (local: `http://localhost:5173`; prod: `https://athlonsport.app.br`) |
| `APP_URL` | Não | URL do frontend para links mágicos (default: `CORS_ORIGIN`) |
| `R2_ACCOUNT_ID` | Upload* | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Upload* | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Upload* | R2 secret key |
| `R2_BUCKET` | Não | Default: `athonsport` |
| `R2_PUBLIC_BASE_URL` | Upload* | URL pública do bucket (fotos de turma) |
| `CRON_SECRET` | Não | Proteção dos endpoints `/api/cron/*` manuais |
| `CRON_ENABLED` | Não | Default `true`; desabilita `node-cron` |
| `VAPID_PUBLIC_KEY` | Produção | Web Push (já configurado no Railway) |
| `VAPID_PRIVATE_KEY` | Produção | Web Push (já configurado no Railway) |
| `VAPID_SUBJECT` | Produção | `mailto:suporte@athlonsport.app.br` |
| `RESEND_API_KEY` | Recuperação de senha | Chave Resend |
| `EMAIL_FROM` | Recuperação de senha | Remetente (ex.: `ATHLON <noreply@athlonsport.app.br>`) |
| `RECOVERY_SHOW_CODE` | Dev | `true` exibe código na tela sem e-mail (desligar em produção) |
| `ADMIN_EMAIL` | Seed ADM | E-mail do administrador (`pnpm seed:admin`) |
| `ADMIN_PASSWORD` | Seed ADM | Senha inicial do administrador |
| `ADMIN_NOME` | Seed ADM | Nome exibido (opcional) |

\* Obrigatório para upload de comprovantes e fotos de turma.

### Frontend - `apps/frontend/.env`

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL da API. Local: `http://localhost:3001/api/v1`. Produção (Vercel): `https://api.athlonsport.app.br/api/v1` |

### Vercel (frontend)

| Variável | Valor |
|----------|-------|
| `VITE_API_URL` | `https://api.athlonsport.app.br/api/v1` |

**Não** configure variáveis de backend na Vercel — apenas no Railway.

### Railway (backend)

Todas as variáveis do backend listadas acima. O `DATABASE_URL` é injetado automaticamente ao vincular o serviço PostgreSQL.

Exemplo de produção:

```
CORS_ORIGIN=https://athlonsport.app.br
APP_URL=https://athlonsport.app.br
```

Guia completo de deploy: [DEPLOY.md](./DEPLOY.md)

---

## 15. Desenvolvimento local

### Pré-requisitos

- Node.js 18+
- pnpm 9.x (`packageManager` no `package.json`)
- PostgreSQL local (ou instância remota com `DATABASE_URL`)

### Passo a passo

```bash
# 1. Clonar repositório
git clone <url-do-repo>
cd Athlon

# 2. Instalar dependências (OBRIGATÓRIO usar pnpm, não npm)
pnpm install

# 3. Configurar PostgreSQL
#    - Criar banco local (ex.: athonsport)
#    - Copiar apps/backend/.env.example → apps/backend/.env
#    - Ajustar DATABASE_URL

# 4. Aplicar migrations e criar ADM
pnpm db:migrate
pnpm seed:admin

# 5. Configurar frontend
cp apps/frontend/.env.example apps/frontend/.env
# VITE_API_URL=http://localhost:3001/api/v1

# 6. Testar conexão com banco
pnpm test:db

# 7. Rodar em dois terminais
pnpm dev:backend    # API em http://localhost:3001
pnpm dev:frontend   # PWA em http://localhost:5173

# Ou ambos juntos:
pnpm dev

# 8. Rodar testes automatizados (recomendado antes do deploy)
pnpm test
```

### Proxy local

O Vite (`vite.config.ts`) faz proxy de `/api` para o backend em desenvolvimento quando `VITE_API_URL` não é usado com URL absoluta.

### Storage (R2) em dev

Opcional. Sem as variáveis `R2_*`, uploads de comprovante/foto retornam 503. Para testar uploads localmente, configure um bucket R2 no Cloudflare.

---

## 16. Deploy em produção (Vercel + Railway)

### Arquitetura

- **Vercel:** frontend PWA em `https://athlonsport.app.br`
- **Railway:** API Express em `https://api.athlonsport.app.br` + PostgreSQL + crons (`node-cron`)
- **Cloudflare R2:** storage de comprovantes e fotos de turma
- **Resend:** e-mail transacional

Guia passo a passo: **[DEPLOY.md](./DEPLOY.md)**

### Passo a passo resumido

1. **Railway**
   - Criar projeto com serviço PostgreSQL + serviço da API (GitHub repo)
   - Configurar variáveis de ambiente (ver §14 e DEPLOY.md)
   - Vincular `DATABASE_URL` do Postgres ao serviço da API
   - Deploy automático via `railway.toml` (migrations + seed + start)
   - Configurar domínio `api.athlonsport.app.br`

2. **Vercel**
   - Importar repositório (frontend)
   - `VITE_API_URL=https://api.athlonsport.app.br/api/v1`
   - Build: `pnpm run build:frontend` (via `vercel.json`)
   - Domínio `athlonsport.app.br`

3. **Cloudflare R2**
   - Bucket com prefixos `comprovantes/` (privado) e `turmas-fotos/` (público)
   - Configurar `R2_PUBLIC_BASE_URL` para fotos de turma

4. **Resend**
   - Verificar domínio `athlonsport.app.br` (SPF, DKIM, DMARC)
   - Configurar `RESEND_API_KEY` e `EMAIL_FROM` no Railway

5. **Validar**
   - `https://api.athlonsport.app.br/health` → `{"status":"ok"}`
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
| `pnpm dev:mobile` | Expo dev server (`apps/mobile`) |
| `pnpm build` | Build completo (shared-types + backend + frontend) |
| `pnpm build:frontend` | Build só do frontend (Vercel) |
| `pnpm build:backend` | Build só do backend (Railway) |
| `pnpm build:vercel` | Alias para `build:frontend` |
| `pnpm db:migrate` | Aplica migrations SQL |
| `pnpm test` | Testes automatizados (shared-types + frontend) |
| `pnpm test:db` | Testa conexão PostgreSQL |
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
| `apps/backend/src/server.ts` | Servidor + node-cron |
| `railway.toml` | Deploy Railway (build, migrations, health check) |
| `vercel.json` | Deploy frontend (SPA) |
| `apps/backend/src/middleware/auth.ts` | JWT e roles |
| `apps/backend/src/modules/admin/` | API administrativa |
| `apps/backend/src/lib/storage/r2-storage.service.ts` | Upload R2 (URLs assinadas) |
| `apps/backend/src/lib/email.ts` | Envio de e-mail (Resend) |
| `apps/backend/scripts/seed-admin.ts` | Seed do usuário ADM inicial |
| `apps/backend/scripts/migrate.ts` | Aplica migrations SQL |
| `apps/frontend/src/features/admin/` | Telas do painel administrativo |
| `apps/backend/src/modules/eventos/eventos.service.ts` | Eventos de turma (amistoso/campeonato) |
| `apps/backend/src/lib/inadimplencia.ts` | Regra de bloqueio |
| `apps/backend/src/lib/mensalidade-focus.ts` | Status efetivo e foco |
| `apps/backend/src/jobs/cron.ts` | Jobs agendados |
| `packages/shared-types/` | Schemas Zod compartilhados |
| `apps/frontend/src/lib/is-athlon-app.ts` | Detecção app Play Store (WebView) |
| `apps/frontend/src/lib/use-pwa-install.ts` | Hook de instalação PWA (Android + iOS + app nativo) |
| `apps/frontend/src/components/pwa/PwaInstallPrompt.tsx` | Banner de convite para instalar |
| `apps/frontend/src/lib/push-notifications.ts` | Registro push VAPID (PWA) |
| `apps/backend/migrations/` | Schema do banco |

---

## 19. Decisões arquiteturais

1. **Auth própria** com JWT — controle total de perfis e tokens.
2. **Backend como único ponto de acesso ao banco** — sem RLS; segurança na camada API.
3. **Monorepo + shared-types** — validação Zod idêntica no front e back.
4. **Frontend e API separados** — Vercel (SPA) + Railway (Express), comunicação via `VITE_API_URL`.
5. **Crons no Railway** — `node-cron` no processo Express (avisos horários, diário, mensal).
6. **Upload direto ao R2** — backend gera URL assinada; não proxya arquivos.
7. **Bloqueio por turma** — inadimplência granular, não bloqueia o app inteiro.
8. **Eventos de turma** — amistoso/campeonato informativos, sem presença/RSVP; tabela `Presenca` reservada para expansão futura.
9. **Três canais, um frontend** — Web + PWA + app Play Store (`apps/mobile` WebView); sem UI duplicada em nativo.

---

## 20. Checklist para clonar em outro PC

```
[ ] Instalar Node.js 18+ e pnpm 9.x
[ ] git clone <repositorio>
[ ] pnpm install
[ ] Criar apps/backend/.env (copiar de .env.example — NÃO commitar)
[ ] Criar apps/frontend/.env com VITE_API_URL apontando para o backend local
[ ] Configurar PostgreSQL local (DATABASE_URL)
[ ] pnpm db:migrate
[ ] Configurar ADMIN_EMAIL e ADMIN_PASSWORD em apps/backend/.env
[ ] pnpm seed:admin
[ ] (Opcional) Configurar R2 para testar uploads
[ ] pnpm test:db
[ ] pnpm test
[ ] pnpm dev
[ ] (Produção) Configurar variáveis no Railway (ver DEPLOY.md)
[ ] (Produção) Configurar VITE_API_URL na Vercel
[ ] (Produção) Configurar Resend (recuperação de senha, verificação de e-mail, chamados)
[ ] (Produção) Validar https://api.athlonsport.app.br/health e fluxo de upload
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
- Notificação ao professor quando aluno envia comprovante
- Bloqueio mais rígido de inadimplência (redirecionar direto para mensalidades)
- Exclusão definitiva de conta de professor (hoje só inativação)

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
- Aba **Edição**: chamados, matricular, remover, trocar turma, desbloquear, **ativar/desativar/excluir professor**
- BottomNav: Profs | Alunos | Início | Edição | Perfil

### Padronização de texto

- Travessões tipográficos (em dash / en dash Unicode) substituídos por hífen (`-`) no código e na documentação

### Performance frontend (code-splitting)

- Rotas com `React.lazy` + `Suspense` em [`apps/frontend/src/app/router.tsx`](../apps/frontend/src/app/router.tsx)
- **Eager (bundle inicial):** `ProfileSelectPage`, `LoginFormPage`
- **Lazy (chunk sob demanda):** demas páginas (dashboards, aluno, professor, admin, legal, recuperação de senha)
- Bundle principal ~438 KB (antes ~550 KB); não altera quantidade de requests à API

### Otimização de requests

- Polling de notificações: 180s; React Query `staleTime` 90s e `refetchOnWindowFocus: false`
- Signed URL de comprovante só no detalhe (não na fila/listagem)

### Onboarding iOS (PWA)

- Tutorial Safari → Compartilhar → Adicionar à Tela de Início
- Em navegadores que não são Safari no iPhone, modal orienta a abrir no Safari

---

## 21.2. Migração de infraestrutura (ago/2026)

Migração completa de Supabase para **Railway + Cloudflare R2**. Detalhes em [DEPLOY.md](./DEPLOY.md).

### O que mudou

| Antes | Depois |
|-------|--------|
| Supabase (PostgreSQL + Storage + pg_cron) | PostgreSQL no Railway |
| Supabase Storage (comprovantes, fotos) | Cloudflare R2 |
| API serverless na Vercel (`api/index.ts`) | API Express no Railway (`api.athlonsport.app.br`) |
| Crons híbridos (Vercel + pg_cron) | `node-cron` no processo Railway |
| TWA/APK Android (legado) | App Play Store (`apps/mobile` WebView) + PWA |
| Domínio `*.vercel.app` | `athlonsport.app.br` |

### Código

- Cliente `pg` (`apps/backend/src/lib/db.ts`) substitui `@supabase/supabase-js`
- Storage via `apps/backend/src/lib/storage/r2-storage.service.ts`
- Migrations consolidadas em `apps/backend/migrations/001_schema.sql`
- `railway.toml`: migrations + seed + start na subida do serviço
- Removidos: `api/index.ts`, `apps/backend/supabase/`, variáveis `SUPABASE_*`

### Domínio e CORS

- Frontend: `https://athlonsport.app.br` (Vercel)
- API: `https://api.athlonsport.app.br` (Railway)
- CORS aceita apex e `www` (configurável via `CORS_ORIGIN`)

### 21.3 Segurança, MFA, Web Push e exclusão de professor (ago/2026)

- **MFA obrigatório no ADM:** login em duas etapas; o QR é gerado **uma vez** (secret reutilizado até confirmar). Códigos de backup de 8 caracteres; coluna `codigo` em `"MfaBackupCode"` para consulta no banco. Em `/admin/perfil` dá para **gerar novos códigos** (TOTP de 6 dígitos; os antigos deixam de valer). Se houver várias contas ATHLON no autenticador, use a **mais recente**.
- **Proxy da API:** Vercel `/api/v1` e `/api/cron` apontam para `https://api.athlonsport.app.br` (DNS e certificado Railway ativos).
- **Web Push:** `VAPID_*` no Railway; registro da subscription no login; notificação na barra do sistema via `push-handler.js`.
- **Exclusão definitiva de professor:** `DELETE /admin/professores/:id` no detalhe e em **Edição → Professores** (transação; turmas somem, alunos permanecem).

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
| `frontend` | `is-athlon-app.test.ts` | Detecção do shell Play Store |
| `frontend` | `use-pwa-install.test.ts` | Detecção iOS, standalone e app nativo |

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
- `docs/DEPLOY.md` - deploy Vercel + Railway
- `docs/WHITELIST.md` - pendências operacionais (Play Store)
- `docs/play-store-mobile.md` - lançamento Android
- `docs/web-push-producao.md` - push em produção
- `docs/Melhoria.md` - backlog de melhorias
