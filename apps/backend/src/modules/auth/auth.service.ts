import bcrypt from "bcryptjs";
import {
  execute,
  generateId,
  matricularAlunoTurma,
  now,
  queryMaybeOne,
  queryOne,
} from "../../lib/db.js";
import { AppError } from "../../middleware/error-handler.js";
import { signAccessToken, signRefreshToken } from "../../lib/jwt.js";
import type { JwtPayload } from "../../middleware/auth.js";
import type {
  LoginInput,
  RegisterAlunoInput,
  UpdateProfessorPerfilInput,
  UpdateAlunoPerfilInput,
  ChangePasswordInput,
  RequestPasswordResetInput,
  ConfirmPasswordResetInput,
} from "@athlon/shared-types";
import { sendPasswordResetEmail } from "../../lib/email.js";
import { env } from "../../config/env.js";
import { createHash, randomInt } from "node:crypto";

const BCRYPT_ROUNDS = 12;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;

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

type AuthUsuarioRow = {
  id: string;
  email: string;
  nome: string;
  perfil: string;
  professor_id: string | null;
  aluno_id: string | null;
};

async function buildAuthResponse(usuarioId: string) {
  const usuario = await queryOne<AuthUsuarioRow>(
    `SELECT u.id, u.email, u.nome, u.perfil,
            p.id AS professor_id,
            a.id AS aluno_id
     FROM "Usuario" u
     LEFT JOIN "Professor" p ON p.usuario_id = u.id
     LEFT JOIN "Aluno" a ON a.usuario_id = u.id
     WHERE u.id = $1`,
    [usuarioId],
    { message: "Usuário não encontrado" },
  );

  const payload: JwtPayload = {
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil as JwtPayload["perfil"],
    professorId: usuario.professor_id ?? undefined,
    alunoId: usuario.aluno_id ?? undefined,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      professorId: usuario.professor_id ?? undefined,
      alunoId: usuario.aluno_id ?? undefined,
    },
  };
}

export async function registerAluno(input: RegisterAlunoInput) {
  const exists = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Usuario" WHERE email = $1`,
    [input.email],
  );

  if (exists) {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }

  const turma = await queryMaybeOne<{ id: string }>(
    `SELECT id FROM "Turma" WHERE codigo_convite = $1`,
    [input.codigoConvite.trim()],
  );

  if (!turma) {
    throw new AppError(404, "CONVITE_INVALIDO", "Código da turma inválido");
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

    await matricularAlunoTurma(alunoId, turma.id);

    const { gerarMensalidadesParaAluno } = await import(
      "../mensalidades/mensalidades.service.js"
    );
    await gerarMensalidadesParaAluno(alunoId, turma.id);
  } catch (err) {
    try {
      await execute(`DELETE FROM "Usuario" WHERE id = $1`, [usuarioId]);
    } catch {
      /* ignore cleanup */
    }
    if (err instanceof AppError && err.code === "CONFLICT") {
      throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
    }
    throw err;
  }

  return buildAuthResponse(usuarioId);
}

export async function login(input: LoginInput) {
  const usuario = await queryMaybeOne<
    AuthUsuarioRow & { senha_hash: string; ativo: boolean }
  >(
    `SELECT u.id, u.email, u.nome, u.senha_hash, u.perfil, u.ativo,
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

  return buildAuthResponse(usuario.id);
}

type MeUsuarioRow = {
  id: string;
  email: string;
  nome: string;
  perfil: string;
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
    `SELECT u.id, u.email, u.nome, u.perfil,
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
  const { verifyRefreshToken } = await import("../../lib/jwt.js");
  const payload = verifyRefreshToken(token);
  return buildAuthResponse(payload.sub);
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
  const ts = now();
  const nomeCompleto = `${input.nome.trim()} ${input.sobrenome.trim()}`;

  await execute(
    `UPDATE "Usuario" SET nome = $1, email = $2, atualizado_em = $3 WHERE id = $4`,
    [nomeCompleto, input.email, ts, userId],
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

  return { ok: true };
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

  return { ok: true };
}
