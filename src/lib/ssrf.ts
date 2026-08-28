/**
 * Utilitário de Proteção Anti-SSRF (Server-Side Request Forgery - CWE-918)
 * Bloqueia requisições a endereços internos, loopback, metadados de nuvem e redes privadas RFC1918.
 */

export interface SsrfValidationResult {
  isSafe: boolean;
  error?: string;
  parsedUrl?: URL;
}

/**
 * Verifica se um hostname ou IP pertence a faixas privadas, loopback ou metadados internos
 */
export function isPrivateOrInternalHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== "string") return true;
  const host = hostname.toLowerCase().trim();

  // 1. Loopback e Localhost
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  // 2. Nomes de serviços internos conhecidos no Docker Compose
  if (
    host === "postgres" ||
    host === "biometric-api" ||
    host === "app" ||
    host === "cloudflared" ||
    host === "unifap-postgres" ||
    host === "unifap-biometric-api" ||
    host === "unifap-web-app"
  ) {
    return true;
  }

  // 3. Faixas de IP Privadas (RFC1918), Link-Local, Loopback e CGNAT
  if (
    /^127\./.test(host) || // 127.0.0.0/8 Loopback
    /^10\./.test(host) || // 10.0.0.0/8 Privado
    /^192\.168\./.test(host) || // 192.168.0.0/16 Privado
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) || // 172.16.0.0/12 Privado
    /^169\.254\./.test(host) || // 169.254.0.0/16 Link-Local / Cloud Metadata (AWS/GCP/Azure)
    /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(host) || // 100.64.0.0/10 CGNAT
    /^0\./.test(host) // 0.0.0.0/8
  ) {
    return true;
  }

  return false;
}

/**
 * Valida se uma URL é segura para execução de requisição HTTP pelo servidor
 */
export function validateSafeUrl(
  urlString: string,
  options?: {
    allowedProtocols?: string[];
    allowedHostSuffixes?: string[];
  }
): SsrfValidationResult {
  if (!urlString || typeof urlString !== "string") {
    return { isSafe: false, error: "URL não informada." };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { isSafe: false, error: "URL inválida ou malformada." };
  }

  const allowedProtocols = options?.allowedProtocols || ["http:", "https:"];
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      isSafe: false,
      error: `Protocolo '${parsed.protocol}' não permitido. Utilize HTTPS ou HTTP.`,
    };
  }

  const hostname = parsed.hostname;
  if (isPrivateOrInternalHost(hostname)) {
    return {
      isSafe: false,
      error: "Acesso a endereços locais, redes privadas ou metadados de nuvem é estritamente proibido por segurança (Anti-SSRF).",
    };
  }

  if (options?.allowedHostSuffixes && options.allowedHostSuffixes.length > 0) {
    const isDomainAllowed = options.allowedHostSuffixes.some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
    );
    if (!isDomainAllowed) {
      return {
        isSafe: false,
        error: `Domínio '${hostname}' não autorizado para proxy de recursos.`,
      };
    }
  }

  return { isSafe: true, parsedUrl: parsed };
}
