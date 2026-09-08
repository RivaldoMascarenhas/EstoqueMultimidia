import type JSZip from "jszip";

export class ImportLimitError extends Error {}

/** Counts decompressed bytes while streaming, before allocating the complete entry. */
export async function readZipEntry(file: JSZip.JSZipObject, maxBytes: number): Promise<Buffer> {
  const stream = file.nodeStream("nodebuffer");
  const chunks: Buffer[] = [];
  let size = 0;
  return new Promise<Buffer>((resolve, reject) => {
    let finished = false;
    stream.on("error", (error) => {
      if (finished) return;
      finished = true;
      chunks.length = 0;
      reject(error);
    });
    stream.on("data", (chunk) => {
      if (finished) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        finished = true;
        stream.pause();
        chunks.length = 0;
        reject(new ImportLimitError("O conteúdo descompactado excede o limite permitido para importação."));
        return;
      }
      chunks.push(buffer);
    });
    stream.on("end", () => {
      if (finished) return;
      finished = true;
      resolve(Buffer.concat(chunks, size));
    });
  });
}
