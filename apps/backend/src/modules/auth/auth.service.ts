import bcrypt from "bcryptjs";
import { supabase } from "../../config/supabase.js";
import {
  generateId,
  matricularAlunoTurma,
  now,
  relOne,
  throwOnError,
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
  const result = await supabase
    .from("Usuario")
    .select("id, email, nome, perfil")
    .eq("email", email)
    .maybeSingle();

  const usuario = result.data;
  if (!usuario || !perfilMatchesLogin(usuario.perfil, perfil)) return null;
  return usuario;
}

async function invalidateRecuperacoesPendentes(usuarioId: string) {
  const ts = now();
  await supabase
    .from("RecuperacaoSenha")
    .update({ usado_em: ts })
    .eq("usuario_id", usuarioId)
    .is("usado_em", null)
    .gt("expira_em", ts);
}

async function findRecuperacaoAtiva(input: {
  usuarioId?: string;
  codigo?: string;
  token?: string;
}) {
  let query = supabase
    .from("RecuperacaoSenha")
    .select("id, usuario_id, codigo_hash, token_hash, expira_em, usado_em")
    .is("usado_em", null)
    .gt("expira_em", now());

  if (input.token) {
    query = query.eq("token_hash", hashValue(input.token));
  } else if (input.usuarioId && input.codigo) {
    query = query
      .eq("usuario_id", input.usuarioId)
      .eq("codigo_hash", hashValue(input.codigo));
  } else {
    return null;
  }

  const result = await query.maybeSingle();
  return result.data;
}

type UsuarioRow = {
  id: string;
  email: string;
  nome: string;
  senha_hash: string;
  perfil: string;
  Professor: { id: string; chave_pix?: string | null }[] | { id: string; chave_pix?: string | null } | null;
  Aluno: { id: string }[] | { id: string } | null;
};

async function buildAuthResponse(usuarioId: string) {
  const result = await supabase
    .from("Usuario")
    .select("id, email, nome, perfil, Professor(id), Aluno(id)")
    .eq("id", usuarioId)
    .single();

  const usuario = throwOnError(result, {
    message: "Usuário não encontrado",
  }) as UsuarioRow;

  const professor = relOne(usuario.Professor);
  const aluno = relOne(usuario.Aluno);

  const payload: JwtPayload = {
    sub: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil as JwtPayload["perfil"],
    professorId: professor?.id,
    alunoId: aluno?.id,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      professorId: professor?.id,
      alunoId: aluno?.id,
    },
  };
}

export async function registerAluno(input: RegisterAlunoInput) {
  const exists = await supabase
    .from("Usuario")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  if (exists.data) {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }

  const senha_hash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);
  const usuarioId = generateId();
  const alunoId = generateId();
  const ts = now();

  const nomeCompleto = `${input.nome.trim()} ${input.sobrenome.trim()}`;

  const usuarioResult = await supabase.from("Usuario").insert({
    id: usuarioId,
    email: input.email,
    nome: nomeCompleto,
    senha_hash,
    perfil: "ALUNO",
    criado_em: ts,
    atualizado_em: ts,
  });

  if (usuarioResult.error?.code === "23505") {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }
  throwOnError(usuarioResult);

  const alunoResult = await supabase.from("Aluno").insert({
    id: alunoId,
    usuario_id: usuarioId,
    nome: input.nome.trim(),
    sobrenome: input.sobrenome.trim(),
    email: input.email,
    telefone: input.whatsapp.replace(/\D/g, ""),
    data_nascimento: `${input.anoNascimento}-01-01`,
    rg: input.rg.trim(),
    cpf: input.cpf ?? null,
    criado_em: ts,
    atualizado_em: ts,
  });
  throwOnError(alunoResult);

  const turmaResult = await supabase
    .from("Turma")
    .select("id")
    .eq("codigo_convite", input.codigoConvite.trim())
    .maybeSingle();

  const turma = turmaResult.data;
  if (!turma) {
    throw new AppError(404, "CONVITE_INVALIDO", "Código da turma inválido");
  }

  await matricularAlunoTurma(alunoId, turma.id);

  const { gerarMensalidadesParaAluno } = await import(
    "../mensalidades/mensalidades.service.js"
  );
  await gerarMensalidadesParaAluno(alunoId, turma.id);

  return buildAuthResponse(usuarioId);
}

export async function login(input: LoginInput) {
  const result = await supabase
    .from("Usuario")
    .select("id, email, nome, senha_hash, perfil, ativo, Professor(id), Aluno(id)")
    .eq("email", input.email)
    .maybeSingle();

  const usuario = result.data as (UsuarioRow & { ativo: boolean }) | null;

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

type AlunoMeRow = {
  id: string;
  nome: string;
  sobrenome: string | null;
  telefone: string | null;
  rg: string | null;
  cpf: string | null;
};

export async function getMe(userId: string) {
  const result = await supabase
    .from("Usuario")
    .select(
      "id, email, nome, perfil, Professor(id, chave_pix), Aluno(id, nome, sobrenome, telefone, rg, cpf)",
    )
    .eq("id", userId)
    .single();

  const usuario = throwOnError(result, {
    message: "Usuário não encontrado",
  }) as UsuarioRow & { Aluno: AlunoMeRow[] | AlunoMeRow | null };

  const professor = relOne(usuario.Professor);
  const aluno = relOne(usuario.Aluno) as AlunoMeRow | undefined;

  return {
    id: usuario.id,
    email: usuario.email,
    nome: usuario.nome,
    perfil: usuario.perfil,
    professorId: professor?.id,
    alunoId: aluno?.id,
    chavePix: professor?.chave_pix ?? null,
    aluno: aluno
      ? {
          nome: aluno.nome,
          sobrenome: aluno.sobrenome ?? "",
          telefone: aluno.telefone,
          rg: aluno.rg,
          cpf: aluno.cpf,
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
  throwOnError(
    await supabase
      .from("Usuario")
      .update({ nome: input.nome, atualizado_em: ts })
      .eq("id", userId),
  );

  throwOnError(
    await supabase
      .from("Professor")
      .update({ chave_pix: input.chavePix, atualizado_em: ts })
      .eq("id", professorId),
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

  throwOnError(
    await supabase
      .from("Usuario")
      .update({ nome: nomeCompleto, email: input.email, atualizado_em: ts })
      .eq("id", userId),
  );

  throwOnError(
    await supabase
      .from("Aluno")
      .update({
        nome: input.nome.trim(),
        sobrenome: input.sobrenome.trim(),
        email: input.email,
        telefone: input.whatsapp.replace(/\D/g, ""),
        rg: input.rg.trim(),
        cpf: input.cpf?.replace(/\D/g, "") || null,
        atualizado_em: ts,
      })
      .eq("id", alunoId),
  );

  return getMe(userId);
}

export async function alterarSenha(userId: string, input: ChangePasswordInput) {
  const result = await supabase
    .from("Usuario")
    .select("senha_hash")
    .eq("id", userId)
    .single();

  const usuario = throwOnError(result, { message: "Usuário não encontrado" });

  const valida = await bcrypt.compare(input.senhaAtual, usuario.senha_hash);
  if (!valida) {
    throw new AppError(401, "INVALID_PASSWORD", "Senha atual incorreta");
  }

  const senha_hash = await bcrypt.hash(input.senhaNova, BCRYPT_ROUNDS);
  throwOnError(
    await supabase
      .from("Usuario")
      .update({ senha_hash, atualizado_em: now() })
      .eq("id", userId),
  );

  return { ok: true };
}

export async function solicitarRecuperacaoSenha(input: RequestPasswordResetInput) {
  const usuario = await findUsuarioPorEmailPerfil(input.email, input.perfil);

  if (usuario) {
    const codigo = generateResetCode();
    const token = generateId() + generateId();
    const expiraEm = new Date(Date.now() + RESET_CODE_TTL_MS).toISOString();
    const ts = now();

    await invalidateRecuperacoesPendentes(usuario.id);

    throwOnError(
      await supabase.from("RecuperacaoSenha").insert({
        id: generateId(),
        usuario_id: usuario.id,
        codigo_hash: hashValue(codigo),
        token_hash: hashValue(token),
        expira_em: expiraEm,
        criado_em: ts,
      }),
    );

    const link = `${env.appUrl.replace(/\/$/, "")}/login/${perfilLoginPath(input.perfil)}/redefinir-senha/${token}`;

    await sendPasswordResetEmail({
      to: usuario.email,
      nome: usuario.nome,
      codigo,
      link,
    });
  }

  return {
    ok: true,
    message: "Se o e-mail estiver cadastrado, você receberá um código em instantes.",
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

  throwOnError(
    await supabase
      .from("Usuario")
      .update({ senha_hash, atualizado_em: ts })
      .eq("id", usuarioId!),
  );

  throwOnError(
    await supabase
      .from("RecuperacaoSenha")
      .update({ usado_em: ts })
      .eq("id", recuperacaoId!),
  );

  await invalidateRecuperacoesPendentes(usuarioId!);

  return { ok: true };
}
