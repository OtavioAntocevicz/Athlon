import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const dir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(dir, "../.env");
const keys = webpush.generateVAPIDKeys();

let envContent = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

function upsert(key: string, value: string) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  envContent = re.test(envContent)
    ? envContent.replace(re, line)
    : `${envContent.trimEnd()}\n${line}\n`;
}

upsert("VAPID_PUBLIC_KEY", keys.publicKey);
upsert("VAPID_PRIVATE_KEY", keys.privateKey);
upsert("VAPID_SUBJECT", "mailto:suporte@athlon.app");

writeFileSync(envPath, envContent);
console.log("VAPID keys gravadas em apps/backend/.env");
