import { describe, expect, it } from "vitest";
import { confirmMfaSchema } from "./auth.js";

describe("confirmMfaSchema", () => {
  it("aceita código TOTP de 6 dígitos", () => {
    expect(confirmMfaSchema.parse({ codigo: "123456" })).toEqual({ codigo: "123456" });
  });

  it("remove espaços", () => {
    expect(confirmMfaSchema.parse({ codigo: "123 456" })).toEqual({ codigo: "123456" });
  });

  it("rejeita código de backup (regeneração só aceita TOTP)", () => {
    expect(confirmMfaSchema.safeParse({ codigo: "AABBCCDD" }).success).toBe(false);
  });
});
