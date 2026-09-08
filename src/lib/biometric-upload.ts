/** Checks the upload boundary; decoding and face validation remain with the biometric service. */
export async function validateBiometricImage(image: Blob): Promise<string | null> {
  if (!image.size || image.size > 10 * 1024 * 1024) {
    return "Envie uma imagem não vazia de até 10 MB.";
  }
  const header = new Uint8Array(await image.slice(0, 12).arrayBuffer());
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => header[i] === byte);
  const isWebp = String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  if ((image.type === "image/jpeg" && isJpeg) ||
      (image.type === "image/png" && isPng) ||
      (image.type === "image/webp" && isWebp)) return null;
  return "Envie uma imagem JPEG, PNG ou WebP com conteúdo correspondente ao formato.";
}
