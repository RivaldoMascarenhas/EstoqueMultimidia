import crypto from "crypto";

const QR_SECRET = process.env.NEXTAUTH_SECRET || process.env.BIOMETRIC_INTERNAL_TOKEN || "unifap-qr-token-signing-key";

/**
 * Utilitário de Assinatura e Validação Criptográfica de Tokens QR Code para Presença
 */

/**
 * Gera token assinado criptograficamente com HMAC-SHA256 para credencial de participante em QR Code
 */
export function generateParticipantQrToken(eventId: string, personId: string): string {
  const timestamp = Date.now().toString(36);
  const payload = `${eventId}:${personId}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", QR_SECRET).update(payload).digest("hex");
  return `${payload}:${hmac}`;
}

/**
 * Valida a autenticidade e integridade do token de QR Code com comparação timing-safe
 */
export function verifyParticipantQrToken(
  eventId: string,
  token: string,
  maxAgeMs: number = 7 * 24 * 60 * 60 * 1000 // 7 dias de validade padrão
): { isValid: boolean; personId?: string; error?: string } {
  if (!token || typeof token !== "string") {
    return { isValid: false, error: "Token de QR Code ausente." };
  }

  const parts = token.trim().split(":");
  if (parts.length !== 4) {
    return { isValid: false, error: "Estrutura do Token de QR Code inválida." };
  }

  const [tokenEventId, personId, timestampStr, providedHmac] = parts;

  if (tokenEventId !== eventId) {
    return { isValid: false, error: "Este QR Code pertence a um evento diferente." };
  }

  const payload = `${tokenEventId}:${personId}:${timestampStr}`;
  const expectedHmac = crypto.createHmac("sha256", QR_SECRET).update(payload).digest("hex");

  const bufProvided = Buffer.from(providedHmac, "utf8");
  const bufExpected = Buffer.from(expectedHmac, "utf8");

  if (bufProvided.length !== bufExpected.length || !crypto.timingSafeEqual(bufProvided, bufExpected)) {
    return { isValid: false, error: "Assinatura digital do QR Code inválida." };
  }

  const timestamp = parseInt(timestampStr, 36);
  if (isNaN(timestamp) || Date.now() - timestamp > maxAgeMs) {
    return { isValid: false, error: "QR Code expirado." };
  }

  return { isValid: true, personId };
}
