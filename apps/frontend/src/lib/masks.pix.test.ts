import { describe, expect, it } from "vitest";
import { maskChavePix, maskCnpj, maskCpf } from "./masks";

describe("maskChavePix", () => {
  it("formata CPF enquanto digita", () => {
    expect(maskChavePix("12345678900")).toBe("123.456.789-00");
    expect(maskChavePix("123")).toBe("123");
    expect(maskChavePix("123456")).toBe("123.456");
    expect(maskChavePix("123.456.789-00")).toBe("123.456.789-00");
  });

  it("formata CNPJ após o 12º dígito", () => {
    expect(maskCnpj("12345678000199")).toBe("12.345.678/0001-99");
    expect(maskChavePix("12345678000199")).toBe("12.345.678/0001-99");
  });

  it("não mascara e-mail nem chave aleatória", () => {
    expect(maskChavePix("treino@email.com")).toBe("treino@email.com");
    expect(maskChavePix("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    );
  });

  it("maskCpf formata 11 dígitos", () => {
    expect(maskCpf("12345678900")).toBe("123.456.789-00");
  });
});
