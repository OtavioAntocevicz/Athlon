import { describe, expect, it } from "vitest";
import {
  formatCentavosInput,
  maskCurrencyBRL,
  parseReaisToCentavos,
} from "./masks";

describe("máscara de moeda BRL", () => {
  it("formata centavos como 150,00", () => {
    expect(formatCentavosInput(15000)).toBe("150,00");
    expect(formatCentavosInput(150)).toBe("1,50");
  });

  it("máscara digita como dinheiro brasileiro", () => {
    expect(maskCurrencyBRL("1")).toBe("0,01");
    expect(maskCurrencyBRL("150")).toBe("1,50");
    expect(maskCurrencyBRL("15000")).toBe("150,00");
    expect(maskCurrencyBRL("150,00")).toBe("150,00");
  });

  it("parseia reais mascarados para centavos", () => {
    expect(parseReaisToCentavos("150,00")).toBe(15000);
    expect(parseReaisToCentavos("1.150,00")).toBe(115000);
    expect(parseReaisToCentavos("")).toBeNull();
  });
});
