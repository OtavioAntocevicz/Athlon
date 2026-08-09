import { describe, expect, it } from "vitest";
import {
  maskChavePix,
  maskCnpj,
  maskCpf,
  maskTelefone,
  maskWhatsApp,
} from "./masks";

describe("maskTelefone / maskWhatsApp", () => {
  it("formata celular 41912345678 como (41) 91234-5678", () => {
    expect(maskTelefone("41912345678")).toBe("(41) 91234-5678");
    expect(maskWhatsApp("41912345678")).toBe("(41) 91234-5678");
  });

  it("formata celular progressivamente", () => {
    expect(maskTelefone("41")).toBe("(41");
    expect(maskTelefone("419")).toBe("(41) 9");
    expect(maskTelefone("4191234")).toBe("(41) 91234");
    expect(maskTelefone("41912345678")).toBe("(41) 91234-5678");
  });

  it("formata fixo com 10 dígitos", () => {
    expect(maskTelefone("4131234567")).toBe("(41) 3123-4567");
  });

  it("aceita DDI 55", () => {
    expect(maskTelefone("5541912345678")).toBe("(41) 91234-5678");
    expect(maskTelefone("+5541912345678")).toBe("(41) 91234-5678");
  });
});

describe("maskChavePix", () => {
  it("formata CPF enquanto digita", () => {
    expect(maskChavePix("12345678900")).toBe("123.456.789-00");
    expect(maskChavePix("123")).toBe("123");
    expect(maskChavePix("123456")).toBe("123.456");
    expect(maskChavePix("123.456.789-00")).toBe("123.456.789-00");
  });

  it("formata telefone celular na chave PIX", () => {
    expect(maskChavePix("41912345678")).toBe("(41) 91234-5678");
    expect(maskChavePix("419")).toBe("(41) 9");
    expect(maskChavePix("(41) 91234-5678")).toBe("(41) 91234-5678");
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
