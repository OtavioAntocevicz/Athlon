import bcrypt from "bcryptjs";
import {
  execute,
  generateId,
  now,
  queryMaybeOne,
  queryOne,
} from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { signAccessToken } from "../../lib/jwt.js";
import { criarSessao, revogarSessaoPorToken, revogarTodasSessoes, rotacionarSessao } from "../../lib/sessao.js";
import type { JwtPayload } from "../../middleware/auth.js";
import type {
  LoginInput,
  RegisterAlunoInput,
  UpdateProfessorPerfilInput,
  UpdateAlunoPerfilInput,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ConfirmPasswordResetInput,
  ConfirmEmailVerificationInput,
} from "@athlon/shared-types";
import {
  sendAccountExistsEmail,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "../../lib/email.js";
import { env } from "../../config/env.js";
import { createHash, randomInt } from "node:crypto";
import {
  confirmarMfaSetup,
  getMfaStatus,
  iniciarMfaSetup,
  regenerarBackupCodes,
  obterMfaSecret,
  usuarioRequerMfa,
  validarMfaCodigo,
} from "../../lib/mfa.js";

const BCRYPT_ROUNDS = 12;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const EMAIL_VERIFY_TTL_MS = 30 * 60 * 1000;
const EMAIL_VERIFY_RESEND_COOLDOWN_MS = 60 * 1000;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateResetCode(): string {
  return String(randomInt(100000, 1000000));
}

function perfilLoginPath(perfil: string): string {
  return perfil === "PROFESSOR" || perfil === "ADM" ? "professor" : "aluno";
}

function perfilMatchesLogin(usuarioPerfil: string, inputPerfil: string): boolean {
  if (usuarioPerfil === inputPerfil) return true;
  return inputPerfil === "PROFESSOR" && usuarioPerfil === "ADM";
}

async function findUsuarioPorEmailPerfil(email: string, perfil: string) {
  const usuario = await queryMaybeOne<{
    id: string;
    email: string;
    nome: string;
    perfil: string;
  }>(`SELECT id, email, nome, perfil FROM "Usuario" WHERE email = $1`, [email]);

  if (!usuario || !perfilMatchesLogin(usuario.perfil, perfil)) return null;
  return usuario;
}

async function invalidateRecuperacoesPendentes(usuarioId: string) {
  const ts = now();
  await execute(
    `UPDATE "RecuperacaoSenha" SET usado_em = $1
     WHERE usuario_id = $2 AND usado_em IS NULL AND expira_em > $1`,
    [ts, usuarioId],
  );
}

type RecuperacaoRow = {
  id: string;
  usuario_id: string;
  codigo_hash: string;
  token_hash: string;
  expira_em: string;
  usado_em: string | null;
};

async function findRecuperacaoAtiva(input: {
  usuarioId?: string;
  codigo?: string;
  token?: string;
}): Promise<RecuperacaoRow | null> {
  const ts = now();

  if (input.token) {
    return queryMaybeOne<RecuperacaoRow>(
      `SELECT id, usuario_id, codigo_hash, token_hash, expira_em, usado_em
       FROM "RecuperacaoSenha"
       WHERE usado_em IS NULL AND expira_em > $1 AND token_hash = $2`,
      [ts, hashValue(input.token)],
    );
  }

  if (input.usuarioId && input.codigo) {
    return queryMaybeOne<RecuperacaoRow>(
      `SELECT id, usuario_id, codigo_hash, token_hash, expira_em, usado_em
       FROM "RecuperacaoSenha"
       WHERE usado_em IS NULL AND expira_em > $1 AND usuario_id = $2 AND codigo_hash = $3`,
      [ts, input.usuarioId, hashValue(input.codigo)],
    );
  }

  return null;
}

type VerificacaoEmailRow = {
  id: string;
  usuario_id: string;
  codigo_hash: string;
  expira_em: string;
  usado_em: string | null;
  criado_em: string;
};

async function invalidateVerificacoesPendentes(usuarioId: string) {
  const ts = now();
  await execute(
    `UPDATE "VerificacaoEmail" SET usado_em = $1
     WHERE usuario_id = $2 AND usado_em IS NULL AND expira_em > $1`,
    [ts, usuarioId],
  );
}

async function findVerificacaoEmailAtiva(
  usuarioId: string,
  codigo: string,
): Promise<VerificacaoEmailRow | null> {
  return queryMaybeOne<VerificacaoEmailRow>(
    `SELECT id, usuario_id, codigo_hash, expira_em, usado_em, criado_em
     FROM "VerificacaoEmail"
     WHERE usado_em IS NULL AND expira_em > $1 AND usuario_id = $2 AND codigo_hash = $3`,
    [now(), usuarioId, hashValue(codigo)],
  );
}

function isEmailVerificado(perfil: string, emailVerificadoEm: string | null): boolean {
  return perfil !== "ALUNO" || !!emailVerificadoEm;
}

async function enviarCodigoVerificacaoEmail(usuario: {
  id: string;
  email: string;
  nome: string;
}): Promise<{ codigoExposto?: string }> {
  const codigo = generateResetCode();
  const expiraEm = new Date(Date.now() + EMAIL_VERIFY_TTL_MS).toISOString();
  const ts = now();

  await invalidateVerificacoesPendentes(usuario.id);

  await execute(
    `INSERT INTO "VerificacaoEmail" (id, usuario_id, codigo_hash, expira_em, criado_em)
     VALUES ($1, $2, $3, $4, $5)`,
    [generateId(), usuario.id, hashValue(codigo), expiraEm, ts],
  );

  try {
    await sendEmailVerificationEmail({
      to: usuario.email,
      nome: usuario.nome,
      codigo,
    });
  } catch (err) {
    console.error("[auth] Falha ao enviar e-mail de verificação:", err);
    if (!env.recoveryShowCode) {
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Não foi possível enviar o e-mail de verificação. Tente novamente mais tarde.",
      );
    }
  }

  return env.recoveryShowCode ? { codigoExposto: codigo } : {};
}

type AuthUsuarioRow = {
  id: string;
  email: string;
  nome: string;
  perfil: string;
  professor_id: string | null;
  aluno_id: string | null;
  email_verificado_em: string | null;
  mfa_habilitado_em: string | null;
  ativo: boolean;
};

async function buildAuthResponse(usuarioId: string, refreshTokenOverride?: string) {
  const usuario = await queryOne<AuthUsuarioRow>(
    `SELECT u.id, u.email, u.nome, u.perfil, u.ativo, u.email_verificado_em, u.mfa_habilitado_em,
            p.id AS professor_id,
            a.id AS aluno_id
     FROM "Usuario" u
     LEFT JOIN "Professor" p ON p.usuario_id = u.id
     LEFT JOIN "Aluno" a ON a.usuario_id = u.id
     WHERE u.id = $1`,
    [usuarioId],
    { message: "Usuário não encontrado" },
  );

  if (!usuario.ativo) {
    throw new AppError(401, "ACCOUNT_DISABLED", "Conta desativada");
  }

  const payload: JwtPayload = {
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil as JwtPayload["perfil"],
    professorId: usuario.professor_id ?? undefined,
    alunoId: usuario.aluno_id ?? undefined,
  };

  const emailVerificado = isEmailVerificado(usuario.perfil, usuario.email_verificado_em);
  const refreshToken = refreshTokenOverride ?? (await criarSessao(usuarioId));

  return {
    accessToken: signAccessToken(payload),
    refreshToken,
    user: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      professorId: usuario.professor_id ?? undefined,
      alunoId: usuario.aluno_id ?? undefined,
      emailVerificado,
      mfaHabilitado: usuario.perfil === "ADM" ? !!usuario.mfa_habilitado_em : undefined,
    },
  };
}

const REGISTER_ALUNO_OK = {
  ok: true as const,
  message:
    "Se este e-mail puder ser usado, enviamos as próximas instruções. Confira sua caixa de entrada.",
};

async function notificarCadastroComEmailExistente(usuario: {
  email: string;
  nome: string;
  perfil: string;
}) {
  const loginPath = perfilLoginPath(usuario.perfil) === "professor" ? "professor" : "aluno";
  try {
    await sendAccountExistsEmail({
      to: usuario.email,
      nome: usuario.nome,
      loginPath,
    });
  } catch (err) {
    console.error("[auth] Falha ao avisar e-mail já cadastrado:", err);
  }
}

export async function registerAluno(input: RegisterAlunoInput) {
  const exists = await queryMaybeOne<{
    id: string;
    email: string;
    nome: string;
    perfil: string;
  }>(`SELECT id, email, nome, perfil FROM "Usuario" WHERE email = $1`, [input.email]);

  if (exists) {
    await bcrypt.hash(input.senha, BCRYPT_ROUNDS);
    await notificarCadastroComEmailExistente(exists);
    return REGISTER_ALUNO_OK;
  }

  const senha_hash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);
  const usuarioId = generateId();
  const alunoId = generateId();
  const ts = now();
  const nomeCompleto = `${input.nome.trim()} ${input.sobrenome.trim()}`;
  const cpfDigits = input.cpf ? input.cpf.replace(/\D/g, "") : null;
  const rgDigits = input.rg.replace(/\D/g, "") || input.rg.trim();

  try {
    await execute(
      `INSERT INTO "Usuario" (id, email, nome, senha_hash, perfil, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [usuarioId, input.email, nomeCompleto, senha_hash, "ALUNO", ts],
    );

    await execute(
      `INSERT INTO "Aluno" (id, usuario_id, nome, sobrenome, email, telefone, data_nascimento, rg, cpf, criado_em, atualizado_em)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        alunoId,
        usuarioId,
        input.nome.trim(),
        input.sobrenome.trim(),
        input.email,
        input.whatsapp.replace(/\D/g, ""),
        `${input.anoNascimento}-01-01`,
        rgDigits,
        cpfDigits && cpfDigits.length === 11 ? cpfDigits : null,
        ts,
      ],
    );
  } catch (err) {
    try {
      await execute(`DELETE FROM "Usuario" WHERE id = $1`, [usuarioId]);
    } catch {
      /* ignore cleanup */
    }
    if (err instanceof AppError && err.code === "CONFLICT") {
      const conflito = await queryMaybeOne<{
        email: string;
        nome: string;
        perfil: string;
      }>(`SELECT email, nome, perfil FROM "Usuario" WHERE email = $1`, [input.email]);
      if (conflito) {
        await notificarCadastroComEmailExistente(conflito);
      }
      return REGISTER_ALUNO_OK;
    }
    throw err;
  }

  const { codigoExposto } = await enviarCodigoVerificacaoEmail({
    id: usuarioId,
    email: input.email,
    nome: nomeCompleto,
  });

  return {
    ...REGISTER_ALUNO_OK,
    ...(codigoExposto ? { codigoVerificacao: codigoExposto } : {}),
  };
}

export async function login(input: LoginInput) {
  const usuario = await queryMaybeOne<
    AuthUsuarioRow & { senha_hash: string; ativo: boolean; mfa_habilitado_em: string | null }
  >(
    `SELECT u.id, u.email, u.nome, u.senha_hash, u.perfil, u.ativo, u.email_verificado_em,
            u.mfa_habilitado_em,
            p.id AS professor_id,
            a.id AS aluno_id
     FROM "Usuario" u
     LEFT JOIN "Professor" p ON p.usuario_id = u.id
     LEFT JOIN "Aluno" a ON a.usuario_id = u.id
     WHERE u.email = $1`,
    [input.email],
  );

  if (!usuario || !perfilMatchesLogin(usuario.perfil, input.perfil)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
  }

  if (!usuario.ativo) {
    throw new AppError(403, "ACCOUNT_DISABLED", "Conta desativada. Entre em contato com o suporte.");
  }

  const valid = await bcrypt.compare(input.senha, usuario.senha_hash);
  if (!valid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
  }

  if (usuario.perfil === "ADM" && usuario.mfa_habilitado_em) {
    return { requiresMfa: true as const, usuarioId: usuario.id };
  }

  return buildAuthResponse(usuario.id);
}

export async function loginMfa(usuarioId: string, codigo: string) {
  const secret = await obterMfaSecret(usuarioId);
  if (!secret) {
    throw new AppError(400, "MFA_NOT_ENABLED", "MFA não configurado");
  }

  const requer = await usuarioRequerMfa(usuarioId);
  if (!requer) {
    throw new AppError(400, "MFA_NOT_ENABLED", "MFA não está ativo");
  }

  const ok = await validarMfaCodigo(usuarioId, secret, codigo);
  if (!ok) {
    throw new AppError(
      401,
      "INVALID_MFA_CODE",
      "Código inválido ou expirado. Se houver várias contas ATHLON no autenticador, use a mais recente.",
    );
  }

  return buildAuthResponse(usuarioId);
}

export { getMfaStatus, iniciarMfaSetup, confirmarMfaSetup, regenerarBackupCodes };

export async function desabilitarMfaAdmin(
  usuarioId: string,
  _senha: string,
  _codigo: string,
) {
  throw new AppError(
    403,
    "MFA_OBRIGATORIO",
    "O MFA é obrigatório para administradores e não pode ser desativado.",
  );
}

type MeUsuarioRow = {
  id: string;
  email: string;
  nome: string;
  perfil: string;
  email_verificado_em: string | null;
  mfa_habilitado_em: string | null;
  professor_id: string | null;
  chave_pix: string | null;
  aluno_id: string | null;
  aluno_nome: string | null;
  aluno_sobrenome: string | null;
  aluno_telefone: string | null;
  aluno_rg: string | null;
  aluno_cpf: string | null;
};

export async function getMe(userId: string) {
  const usuario = await queryOne<MeUsuarioRow>(
    `SELECT u.id, u.email, u.nome, u.perfil, u.email_verificado_em, u.mfa_habilitado_em,
            p.id AS professor_id, p.chave_pix,
            a.id AS aluno_id, a.nome AS aluno_nome, a.sobrenome AS aluno_sobrenome,
            a.telefone AS aluno_telefone, a.rg AS aluno_rg, a.cpf AS aluno_cpf
     FROM "Usuario" u
     LEFT JOIN "Professor" p ON p.usuario_id = u.id
     LEFT JOIN "Aluno" a ON a.usuario_id = u.id
     WHERE u.id = $1`,
    [userId],
    { message: "Usuário não encontrado" },
  );

  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil,
    emailVerificado: isEmailVerificado(usuario.perfil, usuario.email_verificado_em),
    mfaHabilitado: usuario.perfil === "ADM" ? !!usuario.mfa_habilitado_em : undefined,
    professorId: usuario.professor_id ?? undefined,
    alunoId: usuario.aluno_id ?? undefined,
    chavePix: usuario.chave_pix ?? null,
    aluno: usuario.aluno_id
      ? {
          nome: usuario.aluno_nome!,
          sobrenome: usuario.aluno_sobrenome ?? "",
          telefone: usuario.aluno_telefone,
          rg: usuario.aluno_rg,
          cpf: usuario.aluno_cpf,
        }
      : null,
  };
}

export async function refreshToken(token: string) {
  const { usuarioId, newRefreshToken } = await rotacionarSessao(token);
  return buildAuthResponse(usuarioId, newRefreshToken);
}

export async function logout(refreshToken: string | null) {
  if (refreshToken) {
    await revogarSessaoPorToken(refreshToken);
  }
  return { ok: true };
}

export async function updateProfessorPerfil(
  userId: string,
  professorId: string,
  input: UpdateProfessorPerfilInput,
) {
  const ts = now();

  await execute(
    `UPDATE "Usuario" SET nome = $1, atualizado_em = $2 WHERE id = $3`,
    [input.nome, ts, userId],
  );

  await execute(
    `UPDATE "Professor" SET chave_pix = $1, atualizado_em = $2 WHERE id = $3`,
    [input.chavePix, ts, professorId],
  );

  return getMe(userId);
}

export async function updateAlunoPerfil(
  userId: string,
  alunoId: string,
  input: UpdateAlunoPerfilInput,
) {
  const atual = await queryOne<{ email: string; perfil: string }>(
    `SELECT email, perfil FROM "Usuario" WHERE id = $1`,
    [userId],
    { message: "Usuário não encontrado" },
  );

  const ts = now();
  const nomeCompleto = `${input.nome.trim()} ${input.sobrenome.trim()}`;
  const emailAlterado = atual.email.trim().toLowerCase() !== input.email.trim().toLowerCase();

  if (emailAlterado) {
    const exists = await queryMaybeOne<{ id: string }>(
      `SELECT id FROM "Usuario" WHERE email = $1 AND id <> $2`,
      [input.email, userId],
    );
    if (exists) {
      throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
    }
  }

  await execute(
    `UPDATE "Usuario"
     SET nome = $1, email = $2, atualizado_em = $3,
         email_verificado_em = CASE WHEN $4 THEN NULL ELSE email_verificado_em END
     WHERE id = $5`,
    [nomeCompleto, input.email, ts, emailAlterado, userId],
  );

  await execute(
    `UPDATE "Aluno"
     SET nome = $1, sobrenome = $2, email = $3, telefone = $4, rg = $5, cpf = $6, atualizado_em = $7
     WHERE id = $8`,
    [
      input.nome.trim(),
      input.sobrenome.trim(),
      input.email,
      input.whatsapp.replace(/\D/g, ""),
      input.rg.trim(),
      input.cpf?.replace(/\D/g, "") || null,
      ts,
      alunoId,
    ],
  );

  if (emailAlterado && atual.perfil === "ALUNO") {
    await enviarCodigoVerificacaoEmail({
      id: userId,
      email: input.email,
      nome: nomeCompleto,
    });
  }

  return getMe(userId);
}

export async function alterarSenha(userId: string, input: ChangePasswordInput) {
  const usuario = await queryOne<{ senha_hash: string }>(
    `SELECT senha_hash FROM "Usuario" WHERE id = $1`,
    [userId],
    { message: "Usuário não encontrado" },
  );

  const valida = await bcrypt.compare(input.senhaAtual, usuario.senha_hash);
  if (!valida) {
    throw new AppError(401, "INVALID_PASSWORD", "Senha atual incorreta");
  }

  const senha_hash = await bcrypt.hash(input.senhaNova, BCRYPT_ROUNDS);
  await execute(
    `UPDATE "Usuario" SET senha_hash = $1, atualizado_em = $2 WHERE id = $3`,
    [senha_hash, now(), userId],
  );

  await revogarTodasSessoes(userId);
  return buildAuthResponse(userId);
}

export async function solicitarRecuperacaoSenha(input: RequestPasswordResetInput) {
  const usuario = await findUsuarioPorEmailPerfil(input.email, input.perfil);

  let codigoExposto: string | undefined;
  let linkExposto: string | undefined;

  if (usuario) {
    const codigo = generateResetCode();
    const token = generateId() + generateId();
    const expiraEm = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();
    const ts = now();

    await invalidateRecuperacoesPendentes(usuario.id);

    await execute(
      `INSERT INTO "RecuperacaoSenha" (id, usuario_id, codigo_hash, token_hash, expira_em, criado_em)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        generateId(),
        usuario.id,
        hashValue(codigo),
        hashValue(token),
        expiraEm,
        ts,
      ],
    );

    const link = `${env.appUrl.replace(/\/$/, "")}/login/${perfilLoginPath(input.perfil)}/redefinir-senha/${token}`;

    try {
      await sendPasswordResetEmail({
        to: usuario.email,
        nome: usuario.nome,
        codigo,
        link,
      });
    } catch (err) {
      console.error("[auth] Falha ao enviar e-mail de recuperação:", err);
      if (!env.recoveryShowCode) {
        throw new AppError(
          503,
          "EMAIL_UNAVAILABLE",
          "Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.",
        );
      }
    }

    if (env.recoveryShowCode) {
      codigoExposto = codigo;
      linkExposto = link;
    }
  }

  return {
    ok: true,
    message: env.recoveryShowCode
      ? "Modo temporário: use o código abaixo (e-mail pode não chegar)."
      : "Se o e-mail estiver cadastrado, você receberá um código em instantes.",
    ...(codigoExposto
      ? { codigo: codigoExposto, link: linkExposto }
      : {}),
  };
}

export async function confirmarRecuperacaoSenha(input: ConfirmPasswordResetInput) {
  let usuarioId: string | null = null;
  let recuperacaoId: string | null = null;

  if (input.token) {
    const recuperacao = await findRecuperacaoAtiva({ token: input.token });
    if (!recuperacao) {
      throw new AppError(400, "INVALID_TOKEN", "Link inválido ou expirado. Solicite um novo código.");
    }
    usuarioId = recuperacao.usuario_id;
    recuperacaoId = recuperacao.id;
  } else if (input.email && input.perfil && input.codigo) {
    const usuario = await findUsuarioPorEmailPerfil(input.email, input.perfil);
    if (!usuario) {
      throw new AppError(400, "INVALID_CODE", "Código inválido ou expirado.");
    }

    const recuperacao = await findRecuperacaoAtiva({
      usuarioId: usuario.id,
      codigo: input.codigo,
    });

    if (!recuperacao) {
      throw new AppError(400, "INVALID_CODE", "Código inválido ou expirado.");
    }

    usuarioId = usuario.id;
    recuperacaoId = recuperacao.id;
  } else {
    throw new AppError(400, "INVALID_REQUEST", "Informe o código ou use o link do e-mail.");
  }

  const senha_hash = await bcrypt.hash(input.senhaNova, BCRYPT_ROUNDS);
  const ts = now();

  await execute(
    `UPDATE "Usuario" SET senha_hash = $1, atualizado_em = $2 WHERE id = $3`,
    [senha_hash, ts, usuarioId!],
  );

  await execute(
    `UPDATE "RecuperacaoSenha" SET usado_em = $1 WHERE id = $2`,
    [ts, recuperacaoId!],
  );

  await invalidateRecuperacoesPendentes(usuarioId!);
  await revogarTodasSessoes(usuarioId!);

  return { ok: true };
}

export async function confirmarVerificacaoEmail(
  userId: string,
  input: ConfirmEmailVerificationInput,
) {
  const usuario = await queryOne<{ perfil: string; email_verificado_em: string | null }>(
    `SELECT perfil, email_verificado_em FROM "Usuario" WHERE id = $1`,
    [userId],
    { message: "Usuário não encontrado" },
  );

  if (usuario.perfil !== "ALUNO") {
    throw new AppError(400, "INVALID_PERFIL", "Verificação de e-mail não se aplica a este perfil.");
  }

  if (usuario.email_verificado_em) {
    return buildAuthResponse(userId);
  }

  const verificacao = await findVerificacaoEmailAtiva(userId, input.codigo);
  if (!verificacao) {
    throw new AppError(400, "INVALID_CODE", "Código inválido ou expirado.");
  }

  const ts = now();
  await execute(
    `UPDATE "Usuario" SET email_verificado_em = $1, atualizado_em = $1 WHERE id = $2`,
    [ts, userId],
  );
  await execute(`UPDATE "VerificacaoEmail" SET usado_em = $1 WHERE id = $2`, [
    ts,
    verificacao.id,
  ]);
  await invalidateVerificacoesPendentes(userId);

  return buildAuthResponse(userId);
}

export async function reenviarVerificacaoEmail(userId: string) {
  const usuario = await queryOne<{
    perfil: string;
    email: string;
    nome: string;
    email_verificado_em: string | null;
  }>(
    `SELECT perfil, email, nome, email_verificado_em FROM "Usuario" WHERE id = $1`,
    [userId],
    { message: "Usuário não encontrado" },
  );

  if (usuario.perfil !== "ALUNO") {
    throw new AppError(400, "INVALID_PERFIL", "Verificação de e-mail não se aplica a este perfil.");
  }

  if (usuario.email_verificado_em) {
    return {
      ok: true,
      message: "Seu e-mail já está confirmado.",
    };
  }

  const ultimo = await queryMaybeOne<{ criado_em: string }>(
    `SELECT criado_em FROM "VerificacaoEmail"
     WHERE usuario_id = $1
     ORDER BY criado_em DESC
     LIMIT 1`,
    [userId],
  );

  if (
    ultimo &&
    Date.now() - new Date(ultimo.criado_em).getTime() < EMAIL_VERIFY_RESEND_COOLDOWN_MS
  ) {
    throw new AppError(
      429,
      "RATE_LIMIT",
      "Aguarde um minuto antes de solicitar um novo código.",
    );
  }

  const { codigoExposto } = await enviarCodigoVerificacaoEmail({
    id: userId,
    email: usuario.email,
    nome: usuario.nome,
  });

  return {
    ok: true,
    message: env.recoveryShowCode
      ? "Modo temporário: use o código abaixo (e-mail pode não chegar)."
      : "Enviamos um novo código para o seu e-mail.",
    ...(codigoExposto ? { codigo: codigoExposto } : {}),
  };
}
