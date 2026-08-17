import { describe, expect, it } from "vitest";
import { registerAlunoSchema } from "./auth.js";

describe("registerAlunoSchema", () => {
  const base = {
    nome: "João",
    sobrenome: "Silva",
    email: "joao@email.com",
    senha: "senha123",
    whatsapp: "41912345678",
    anoNascimento: 2000,
    rg: "1234567",
  };

  it("aceita cadastro sem código da turma", () => {
    expect(registerAlunoSchema.safeParse(base).success).toBe(true);
  });

  it("normaliza campos opcionais", () => {
    const parsed = registerAlunoSchema.parse({
      ...base,
      cpf: "123.456.789-09",
    });
    expect(parsed.cpf).toBe("123.456.789-09");
  });
});
