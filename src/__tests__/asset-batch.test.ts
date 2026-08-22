import { describe, it, expect } from "vitest";
import { assetBatchCreateSchema, assetCreateSchema } from "@/schemas/asset.schema";

describe("Patrimônio - Schemas de Cadastro Individual e em Lote", () => {
  it("deve validar com sucesso a criação individual de patrimônio", () => {
    const validSingle = {
      assetTag: "pat-004129",
      itemId: "item-dell-pc",
      serialNumber: "SN-987123",
      purchaseValue: 3500.0,
      notes: "Computador i5 16GB",
    };

    const parsed = assetCreateSchema.parse(validSingle);
    expect(parsed.assetTag).toBe("PAT-004129");
    expect(parsed.itemId).toBe("item-dell-pc");
    expect(parsed.purchaseValue).toBe(3500.0);
  });

  it("deve validar com sucesso a criação em lote (ex: 50 computadores Dell)", () => {
    const validBatch = {
      itemId: "item-dell-pc",
      quantity: 50,
      tagPrefix: "pat-dell-",
      startNumber: 1001,
      model: "OptiPlex 3080 i5 16GB",
      purchaseValue: 3200.0,
    };

    const parsed = assetBatchCreateSchema.parse(validBatch);
    expect(parsed.quantity).toBe(50);
    expect(parsed.tagPrefix).toBe("PAT-DELL-");
    expect(parsed.startNumber).toBe(1001);
  });

  it("deve rejeitar lotes com quantidade zero ou superior a 200", () => {
    expect(() =>
      assetBatchCreateSchema.parse({
        itemId: "item-1",
        quantity: 0,
      })
    ).toThrow();

    expect(() =>
      assetBatchCreateSchema.parse({
        itemId: "item-1",
        quantity: 250,
      })
    ).toThrow();
  });
});
