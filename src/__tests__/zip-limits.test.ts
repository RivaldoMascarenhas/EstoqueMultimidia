import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { ImportLimitError, readZipEntry } from "@/lib/zip-limits";

describe("Limite de bytes descompactados", () => {
  it("lê conteúdo legítimo até o limite exato", async () => {
    const zip = new JSZip().file("data.csv", "abcd");
    const loaded = await JSZip.loadAsync(await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
    expect((await readZipEntry(loaded.file("data.csv")!, 4)).toString()).toBe("abcd");
  });
  it("interrompe expansão maior que o limite, mesmo com pacote comprimido pequeno", async () => {
    const zip = new JSZip().file("data.csv", "a".repeat(1024 * 1024));
    const compressed = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    expect(compressed.length).toBeLessThan(4096);
    const loaded = await JSZip.loadAsync(compressed);
    await expect(readZipEntry(loaded.file("data.csv")!, 4096)).rejects.toBeInstanceOf(ImportLimitError);
  });
});
