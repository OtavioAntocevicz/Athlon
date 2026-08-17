import { env } from "../config/env.js";
import { escapeHtml } from "./security.js";

type SendPasswordResetEmailInput = {
  to: string;
  nome: string;
  codigo: string;
  link: string;
};

export async function sendPasswordResetEmail(input: SendPasswordResetEmailInput): Promise<void> {
  const subject = "Redefinição de senha - ATHLON";
  const nome = escapeHtml(input.nome);
  const codigo = escapeHtml(input.codigo);
  const link = escapeHtml(input.link);
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #5C3D2E;">ATHLON</h2>
      <p>Olá, ${nome}!</p>
      <p>Recebemos um pedido para redefinir sua senha. Use o código abaixo no aplicativo:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #5C3D2E;">${codigo}</p>
      <p>Ou clique no link para continuar:</p>
      <p><a href="${link}" style="color: #5C3D2E;">Redefinir minha senha</a></p>
      <p style="font-size: 13px; color: #666;">O código expira em 15 minutos. Se você não solicitou, ignore este e-mail.</p>
    </div>
  `.trim();

  if (!env.resendApiKey) {
    console.info(
      `[email:dev] Recuperação de senha para ${input.to}\n  Código: ${input.codigo}\n  Link: ${input.link}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: input.to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar e-mail: ${body}`);
  }
}

type SendProfessorWelcomeEmailInput = {
  to: string;
  nome: string;
  link: string;
};

export async function sendProfessorWelcomeEmail(
  input: SendProfessorWelcomeEmailInput,
): Promise<void> {
  const subject = "Bem-vindo ao ATHLON — crie sua senha";
  const nome = escapeHtml(input.nome);
  const link = escapeHtml(input.link);
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #5C3D2E;">ATHLON</h2>
      <p>Olá, ${nome}!</p>
      <p>Você foi convidado para o ATHLON como treinador. Para acessar o app, crie sua senha pelo link abaixo:</p>
      <p><a href="${link}" style="display: inline-block; margin: 8px 0; padding: 12px 20px; background: #5C3D2E; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Criar minha senha</a></p>
      <p style="font-size: 13px; color: #666;">O link expira em 72 horas. Se você não esperava este convite, ignore este e-mail.</p>
    </div>
  `.trim();

  if (!env.resendApiKey) {
    console.info(
      `[email:dev] Convite de professor para ${input.to}\n  Link: ${input.link}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: input.to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar e-mail: ${body}`);
  }
}

type SendChamadoRespondidoEmailInput = {
  to: string;
  nome: string;
  assunto: string;
  resposta: string;
  link: string;
};

export async function sendChamadoRespondidoEmail(
  input: SendChamadoRespondidoEmailInput,
): Promise<void> {
  const nome = escapeHtml(input.nome);
  const assunto = escapeHtml(input.assunto);
  const resposta = escapeHtml(input.resposta);
  const link = escapeHtml(input.link);
  const subject = `Resposta ao seu chamado - ${assunto}`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #5C3D2E;">ATHLON</h2>
      <p>Olá, ${nome}!</p>
      <p>Seu chamado de suporte recebeu uma resposta da equipe ATHLON.</p>
      <p style="font-weight: 600; color: #5C3D2E;">Assunto: ${assunto}</p>
      <div style="margin: 16px 0; padding: 12px 16px; background: #F5EDE4; border-radius: 8px; white-space: pre-wrap;">${resposta}</div>
      <p><a href="${link}" style="color: #5C3D2E;">Ver chamado no app</a></p>
      <p style="font-size: 13px; color: #666;">Se o link não abrir, acesse Chamados no menu Perfil do aplicativo.</p>
    </div>
  `.trim();

  if (!env.resendApiKey) {
    console.info(
      `[email:dev] Chamado respondido para ${input.to}\n  Assunto: ${input.assunto}\n  Link: ${input.link}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: input.to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar e-mail: ${body}`);
  }
}

type SendEmailVerificationInput = {
  to: string;
  nome: string;
  codigo: string;
};

export async function sendEmailVerificationEmail(
  input: SendEmailVerificationInput,
): Promise<void> {
  const subject = "Confirme seu e-mail - ATHLON";
  const nome = escapeHtml(input.nome);
  const codigo = escapeHtml(input.codigo);
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #5C3D2E;">ATHLON</h2>
      <p>Olá, ${nome}!</p>
      <p>Bem-vindo(a) ao ATHLON. Para continuar e entrar na sua turma, confirme seu e-mail com o código abaixo:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #5C3D2E;">${codigo}</p>
      <p style="font-size: 13px; color: #666;">O código expira em 30 minutos. Se você não criou esta conta, ignore este e-mail.</p>
    </div>
  `.trim();

  if (!env.resendApiKey) {
    console.info(
      `[email:dev] Verificação de e-mail para ${input.to}\n  Código: ${input.codigo}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: input.to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao enviar e-mail: ${body}`);
  }
}
