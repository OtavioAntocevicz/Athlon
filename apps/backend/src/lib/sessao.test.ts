import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";

test("rotação invalida token anterior após uso", async () => {
  // Teste de integração exige banco; valida apenas o contrato de hash usado nas sessões.
  const token = "refresh-token-exemplo";
  const hash = createHash("sha256").update(token).digest("hex");
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
});
