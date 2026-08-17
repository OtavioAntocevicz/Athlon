import assert from "node:assert/strict";
import { test } from "node:test";
import { assertArquivoUrlDoPagamento, escapeHtml } from "./security.js";

test("escapeHtml escapa caracteres perigosos", () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
  );
});

test("assertArquivoUrlDoPagamento aceita URL válida", () => {
  const pagamentoId = "pag-123";
  assert.doesNotThrow(() =>
    assertArquivoUrlDoPagamento(pagamentoId, `comprovantes/${pagamentoId}/arquivo.jpg`),
  );
});

test("assertArquivoUrlDoPagamento rejeita URL de outro pagamento", () => {
  assert.throws(
    () => assertArquivoUrlDoPagamento("pag-123", "comprovantes/outro-pag/arquivo.jpg"),
    /Arquivo inválido para esta mensalidade/,
  );
});

test("assertArquivoUrlDoPagamento rejeita path traversal", () => {
  assert.throws(
    () => assertArquivoUrlDoPagamento("pag-123", "comprovantes/pag-123/../outro.jpg"),
    /Arquivo inválido/,
  );
});
