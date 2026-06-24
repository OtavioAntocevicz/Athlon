import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";

const BCRYPT_ROUNDS = 12;

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME ?? "Administrador";

  if (!url || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em apps/backend/.env");
    process.exit(1);
  }
  if (!email || !password) {
    console.error("Defina ADMIN_EMAIL e ADMIN_PASSWORD em apps/backend/.env");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("ADMIN_PASSWORD deve ter no mínimo 6 caracteres");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const existing = await supabase
    .from("Usuario")
    .select("id, perfil")
    .eq("email", email)
    .maybeSingle();

  if (existing.data) {
    if (existing.data.perfil !== "ADM") {
      console.error(`E-mail já cadastrado com perfil ${existing.data.perfil}`);
      process.exit(1);
    }
    console.log("ADM já existe para este e-mail:", email);
    process.exit(0);
  }

  const ts = new Date().toISOString();
  const senha_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await supabase.from("Usuario").insert({
    id: nanoid(),
    email,
    nome,
    senha_hash,
    perfil: "ADM",
    ativo: true,
    criado_em: ts,
    atualizado_em: ts,
  });

  if (result.error) {
    console.error("Erro ao criar ADM:", result.error.message);
    process.exit(1);
  }

  console.log("ADM criado com sucesso:", email);
}

main();
