import { describe, expect, it } from "vitest";
import { codigoConviteSchema, registerAlunoSchema } from "./auth.js";

describe("codigoConviteSchema", () => {
  it("rejeita ausente, vazio e só espaços", () => {
    expect(codigoConviteSchema.safeParse("").success).toBe(false);
    expect(codigoConviteSchema.safeParse("   ").success).toBe(false);
    expect(codigoConviteSchema.safeParse("ab").success).toBe(false);
  });

  it("normaliza trim e maiúsculas", () => {
    const parsed = codigoConviteSchema.parse("  ab12cd34  ");
    expect(parsed).toBe("AB12CD34");
  });
});

describe("registerAlunoSchema", () => {
  const base = {
    nome: "João",
    sobrenome: "Silva",
    email: "joao@email.com",
    senha: "senha12",
    whatsapp: "41912345678",
    anoNascimento: 2000,
    rg: "1234567",
  };

  it("bloqueia cadastro sem código da turma", () => {
    expect(registerAlunoSchema.safeParse(base).success).toBe(false);
    expect(
      registerAlunoSchema.safeParse({ ...base, codigoConvite: "" }).success,
    ).toBe(false);
    expect(
      registerAlunoSchema.safeParse({ ...base, codigoConvite: "   " }).success,
    ).toBe(false);
  });

  it("aceita cadastro com código válido", () => {
    const parsed = registerAlunoSchema.parse({
      ...base,
      codigoConvite: "xy9z8w7v",
    });
    expect(parsed.codigoConvite).toBe("XY9Z8W7V");
  });
});
