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
  RegisterProfessorInput,
  RegisterAlunoInput,
  UpdateProfessorPerfilInput,
  UpdateAlunoPerfilInput,
  ChangePasswordInput,
} from "@athlon/shared-types";

const BCRYPT_ROUNDS = 12;

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

export async function registerProfessor(input: RegisterProfessorInput) {
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
  const professorId = generateId();
  const ts = now();

  const usuarioResult = await supabase.from("Usuario").insert({
    id: usuarioId,
    email: input.email,
    nome: input.nome,
    senha_hash,
    perfil: "PROFESSOR",
    criado_em: ts,
    atualizado_em: ts,
  });

  if (usuarioResult.error?.code === "23505") {
    throw new AppError(409, "EMAIL_EXISTS", "E-mail já cadastrado");
  }
  throwOnError(usuarioResult);

  const professorResult = await supabase.from("Professor").insert({
    id: professorId,
    usuario_id: usuarioId,
    chave_pix: input.chavePix,
    criado_em: ts,
    atualizado_em: ts,
  });
  throwOnError(professorResult);

  return buildAuthResponse(usuarioId);
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
    .select("id, email, nome, senha_hash, perfil, Professor(id), Aluno(id)")
    .eq("email", input.email)
    .maybeSingle();

  const usuario = result.data as UsuarioRow | null;

  if (!usuario || usuario.perfil !== input.perfil) {
    throw new AppError(401, "INVALID_CREDENTIALS", "E-mail ou senha incorretos");
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
