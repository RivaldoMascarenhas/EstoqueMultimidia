import crypto from "crypto";

const REPORT_TYPE_LABELS: Record<string, string> = {
  STOCK: "Relatório de Inventário & Posicionamento de Estoque",
  INVENTORY: "Relatório de Inventário Físico do Armário",
  LOANS: "Relatório Geral de Empréstimos e Devoluções",
  MAINTENANCE: "Relatório de Manutenções e Ordens de Serviço",
  MOVEMENTS: "Relatório Histórico de Movimentações de Materiais",
  ASSETS: "Relatório Geral de Controle Patrimonial",
  AUDIT: "Relatório de Trilha de Auditoria do Sistema",
  EVENTS: "Relatório de Presença e Sorteios em Eventos",
  GERAL: "Relatório Oficial de Gestão e Controle",
};

function getSigningSecret(): string {
  return process.env.NEXTAUTH_SECRET || "unifap_report_signing_secret_dev_only";
}

/**
 * Gera um código de autenticidade criptograficamente assinado com HMAC-SHA256 para um relatório oficial.
 * Formato: REL-{TYPE}-{TIMESTAMP}-{SIGNATURE_HEX_10}
 */
export function generateSignedReportCode(reportType: string, timestamp = Date.now()): string {
  const cleanType = (reportType || "GERAL").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const secret = getSigningSecret();
  const payload = `REL:${cleanType}:${timestamp}`;
  
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();

  return `REL-${cleanType}-${timestamp}-${hmac}`;
}

export interface ReportVerificationResult {
  isValid: boolean;
  reportType?: string;
  reportTitle?: string;
  issuedAt?: string;
  error?: string;
}

/**
 * Valida a autenticidade e a integridade de um código de relatório oficial.
 * Garante que apenas códigos legitimamente emitidos e assinados pelo sistema sejam autenticados.
 */
export function verifyReportCode(code: string): ReportVerificationResult {
  if (!code || typeof code !== "string") {
    return { isValid: false, error: "Código de relatório inválido ou vazio." };
  }

  const parts = code.trim().toUpperCase().split("-");
  if (parts.length < 4 || parts[0] !== "REL") {
    return {
      isValid: false,
      error: "Formato de autenticação do relatório incorreto ou incompatível.",
    };
  }

  const reportType = parts[1];
  const timestampStr = parts[2];
  const signature = parts[3];

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp) || timestamp <= 0) {
    return { isValid: false, error: "Timestamp de emissão do relatório inválido." };
  }

  // Prevenção de timestamps futuros (máximo de 5 minutos de tolerância para drift de relógio)
  if (timestamp > Date.now() + 5 * 60 * 1000) {
    return { isValid: false, error: "Data de emissão do relatório inconsistente." };
  }

  const secret = getSigningSecret();
  const payload = `REL:${reportType}:${timestamp}`;
  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();

  const bufSig = Buffer.from(signature, "utf8");
  const bufExpected = Buffer.from(expectedHmac, "utf8");

  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    return {
      isValid: false,
      error: "Assinatura digital do relatório inválida ou adulterada.",
    };
  }

  const reportTitle = REPORT_TYPE_LABELS[reportType] || `Relatório de ${reportType}`;

  return {
    isValid: true,
    reportType,
    reportTitle,
    issuedAt: new Date(timestamp).toISOString(),
  };
}
