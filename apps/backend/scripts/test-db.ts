import { supabase } from "../src/config/supabase.js";

async function main() {
  const { data, error } = await supabase.from("Usuario").select("id").limit(1);

  if (error) {
    console.error("FALHA:", error.message, error.code, error.details);
    process.exit(1);
  }

  console.log("OK - Supabase conectado via HTTPS. Registros:", data?.length ?? 0);
}

main();
