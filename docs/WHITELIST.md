# Whitelist — pendências do dono

Lista do que **ainda precisa de você** (conta Google Play, celular, testers, Expo).
O código e os textos prontos ficam no repositório; o que está aqui não dá para o agente concluir sozinho.

Atualizado em agosto/2026. Marque os itens na Play Console e volte neste arquivo.

Guia completo da loja: [play-store-mobile.md](./play-store-mobile.md).
Textos para colar: [play-store-ficha.md](./play-store-ficha.md).

---

## Play Store (bloqueia o lançamento)

Ordem real. O passo 7 é o que trava produção em conta **pessoal** criada depois de 13/11/2023.

| # | Item | Status | Onde |
|---|------|--------|------|
| 1 | Conta Google Play Developer + taxa US$ 25 | Feito | Play Console |
| 2 | Verificar identidade (RG/CNH + selfie) | Pendente | Play Console → conta do desenvolvedor |
| 3 | Criar o app `ATHLON` (pacote `br.app.athlonsport`) | Pendente | Play Console → Criar app |
| 4 | Ficha: nome, descrições, categoria Esporte | Textos prontos | [play-store-ficha.md](./play-store-ficha.md) |
| 5 | Ícone 512×512 + feature graphic 1024×500 | Arquivos prontos | `apps/mobile/store-assets/` |
| 6 | Screenshots públicos (login/cadastro) 1080×1920 | 4 prontos | `apps/mobile/store-assets/screenshots/` |
| 7 | Screenshots **logados** (dashboard, turma, PIX, comprovante, eventos) | Pendente | Capturar no celular com conta demo |
| 8 | Política / termos na ficha | URLs prontas | `https://athlonsport.app.br/privacidade` e `/termos` |
| 9 | Data safety, IARC 18+, anúncios = não | Rascunho pronto | [play-store-ficha.md](./play-store-ficha.md) |
| 10 | Duas contas demo (aluno + professor) para o Google revisar | Pendente | Criar no app e colar na Console |
| 11 | `eas login` + `eas build:configure` (grava `projectId` real no `app.json`) | Pendente | Sua conta Expo |
| 12 | AAB de produção (`eas build -p android --profile production`) | Pendente | Depois do passo 11 |
| 13 | Upload do AAB no **teste fechado** (não o interno) | Pendente | Play Console |
| 14 | **12 testers inscritos por 14 dias seguidos** | Pendente | Convide 15–20 pessoas |
| 15 | Pedir acesso à produção | Pendente | Depois dos 14 dias |

Teste interno (e-mails Gmail) é útil para você, mas **não conta** para o passo 14.

Placeholder atual em `apps/mobile/app.json`: `extra.eas.projectId` = `substituir-ao-criar-projeto-eas`. Depois do `eas build:configure`, commite o UUID real.

---

## Prints que faltam (login obrigatório)

Já no repo (telas públicas):

- `01-escolha-perfil.png`
- `02-login-aluno.png`
- `03-login-professor.png`
- `04-cadastro-aluno.png`

Ainda capturar no Android, 1080×1920, **sem dados reais de alunos**:

- [ ] Dashboard (início)
- [ ] Turma com foto
- [ ] Mensalidades + chave PIX
- [ ] Envio de comprovante
- [ ] Eventos / avisos

A loja pede no mínimo 2 screenshots; o ideal são 4 a 8. Pode misturar os 4 públicos com os logados.

---

## MFA (admin)

Já em produção:

- MFA obrigatório; não dá para desativar
- Secret pendente reutilizado (um QR só até confirmar)
- 8 códigos de backup; coluna `codigo` em `"MfaBackupCode"` (consulta no banco)
- No autenticador, se houver várias contas ATHLON, use a **mais recente**

Nesta entrega (código):

- Botão **Gerar novos códigos de backup** em `/admin/perfil` (pede o TOTP de 6 dígitos; os antigos deixam de valer na hora)

O que continua com você:

- [ ] Guardar os códigos atuais (ou gerar novos pelo perfil e guardar a lista nova)
- [ ] Não espalhar os códigos em print, chat ou commit

---

## Produção web (já no ar — só conferir)

| Item | Status |
|------|--------|
| Frontend Vercel `https://athlonsport.app.br` | No ar |
| API `https://api.athlonsport.app.br` | No ar (`/health` ok) |
| Proxy Vercel `/api/v1` e `/api/cron` | Aponta para a API |
| Cookies httpOnly + refresh com rotação | No ar |
| Web Push (VAPID no Railway, registro no login) | No ar — o usuário precisa aceitar a permissão |
| Resend (e-mail) | No ar |
| Excluir professor em Edição | No ar |

Push no iOS só com PWA na Tela de Início. No app da Play Store o Web Push é limitado (FCM seria fase 2).

---

## PRs antigos (pode fechar depois desta whitelist)

| PR | Assunto | Nota |
|----|---------|------|
| #25 | Checklist Play Store | Conteúdo útil veio para `main` via esta entrega (ficha, feature graphic, guia). Pode fechar após o merge. |
| #16 | Ícones PWA 192/512 | Obsoleto: os ícones já estão no `main`. |

---

## Backlog (outro momento — não trava a loja)

Detalhe em [Melhoria.md](./Melhoria.md):

- Relatório financeiro do professor
- Presença / RSVP (tabela `Presenca` já existe)
- Histórico de eventos passados + notificação ao editar evento
- FCM nativo no app da loja
- E2E Playwright
- Analytics / feature flags reais
- App Store iOS (conta Apple US$ 99/ano)
