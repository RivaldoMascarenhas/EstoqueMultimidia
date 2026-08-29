import dns from "dns";
import { promisify } from "util";

const dnsLookup = promisify(dns.lookup);

/**
 * Utilitário de Proteção Anti-SSRF (Server-Side Request Forgery - CWE-918)
 * Implementa validação profunda em múltiplos níveis:
 * 1. Validação de Protocolo (apenas http: e https:)
 * 2. Validação Textual de Hostname (localhost, containers Docker, domínios de metadados)
 * 3. Resolução de DNS assíncrona com inspeção de TODOS os registros A e AAAA retornados
 * 4. Validação estrita de faixas de IP (RFC1918, CGNAT, Link-Local, Loopback, IPv6 privado/mapeado)
 * 5. Redirecionamento manual seguro com revalidação de DNS a cada salto
 * 6. Mitigação contra ataques de DNS Rebinding
 */

export interface SsrfValidationResult {
  isSafe: boolean;
  error?: string;
  parsedUrl?: URL;
  resolvedIps?: string[];
}

export interface SafeUrlOptions {
  allowedProtocols?: string[];
  allowedHostSuffixes?: string[];
  requireHttps?: boolean;
}

/**
 * Converte um endereço IPv4 em um número inteiro de 32 bits para comparação precisa de máscaras CIDR
 */
function ipv4ToLong(ip: string): number {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return -1;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Verifica se um endereço IPv4 está contido em um bloco CIDR
 */
function isIpv4InCidr(ipLong: number, cidrBase: string, prefixBits: number): boolean {
  const baseLong = ipv4ToLong(cidrBase);
  if (ipLong === -1 || baseLong === -1) return false;
  const mask = prefixBits === 0 ? 0 : (~0 << (32 - prefixBits)) >>> 0;
  return (ipLong & mask) === (baseLong & mask);
}

/**
 * Valida se um IP (v4 ou v6) pertence a faixas privadas, reservadas, loopback ou metadados de nuvem
 */
export function isPrivateOrInternalIp(ipAddress: string): boolean {
  if (!ipAddress || typeof ipAddress !== "string") return true;
  const ip = ipAddress.trim().toLowerCase();

  // 1. IPv4 Validation
  if (ip.includes(".")) {
    // Tratar IPv4-mapped IPv6 (ex: ::ffff:192.168.1.1 ou ::ffff:7f00:1)
    let cleanIpv4 = ip;
    if (cleanIpv4.startsWith("::ffff:")) {
      cleanIpv4 = cleanIpv4.substring(7);
    }

    const ipLong = ipv4ToLong(cleanIpv4);
    if (ipLong === -1) return true; // IP malformado -> bloquear por segurança

    // Faixas IPv4 proibidas:
    // 0.0.0.0/8 - Rede local / Broadcast de origem
    // 10.0.0.0/8 - RFC1918 Rede Privada
    // 100.64.0.0/10 - RFC6598 CGNAT
    // 127.0.0.0/8 - RFC1122 Loopback
    // 169.254.0.0/16 - RFC3927 Link-Local / Cloud Metadata (AWS, GCP, Azure, Oracle, OpenStack)
    // 172.16.0.0/12 - RFC1918 Rede Privada
    // 192.0.0.0/24 - IETF Protocol Assignments
    // 192.0.2.0/24 - TEST-NET-1
    // 192.88.99.0/24 - 6to4 Relay Anycast
    // 192.168.0.0/16 - RFC1918 Rede Privada
    // 198.18.0.0/15 - Benchmark testing
    // 198.51.100.0/24 - TEST-NET-2
    // 203.0.113.0/24 - TEST-NET-3
    // 224.0.0.0/4 - Multicast
    // 240.0.0.0/4 - Reservado para uso futuro
    // 255.255.255.255/32 - Broadcast limitado
    if (
      isIpv4InCidr(ipLong, "0.0.0.0", 8) ||
      isIpv4InCidr(ipLong, "10.0.0.0", 8) ||
      isIpv4InCidr(ipLong, "100.64.0.0", 10) ||
      isIpv4InCidr(ipLong, "127.0.0.0", 8) ||
      isIpv4InCidr(ipLong, "169.254.0.0", 16) ||
      isIpv4InCidr(ipLong, "172.16.0.0", 12) ||
      isIpv4InCidr(ipLong, "192.0.0.0", 24) ||
      isIpv4InCidr(ipLong, "192.0.2.0", 24) ||
      isIpv4InCidr(ipLong, "192.88.99.0", 24) ||
      isIpv4InCidr(ipLong, "192.168.0.0", 16) ||
      isIpv4InCidr(ipLong, "198.18.0.0", 15) ||
      isIpv4InCidr(ipLong, "198.51.100.0", 24) ||
      isIpv4InCidr(ipLong, "203.0.113.0", 24) ||
      isIpv4InCidr(ipLong, "224.0.0.0", 4) ||
      isIpv4InCidr(ipLong, "240.0.0.0", 4) ||
      cleanIpv4 === "255.255.255.255"
    ) {
      return true;
    }

    return false;
  }

  // 2. IPv6 Validation
  const cleanIpv6 = ip.replace(/^\[|\]$/g, "");

  // Loopback e não especificado
  if (cleanIpv6 === "::1" || cleanIpv6 === "::" || cleanIpv6 === "0:0:0:0:0:0:0:1" || cleanIpv6 === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // Unique Local Address (ULA - fc00::/7)
  if (cleanIpv6.startsWith("fc") || cleanIpv6.startsWith("fd") || /^f[cd][0-9a-f]{2}:/i.test(cleanIpv6)) {
    return true;
  }

  // Link-Local unicast (fe80::/10)
  if (cleanIpv6.startsWith("fe8") || cleanIpv6.startsWith("fe9") || cleanIpv6.startsWith("fea") || cleanIpv6.startsWith("feb") || /^fe[89ab][0-9a-f]:/i.test(cleanIpv6)) {
    return true;
  }

  // Multicast (ff00::/8)
  if (cleanIpv6.startsWith("ff") || /^ff[0-9a-f]{2}:/i.test(cleanIpv6)) {
    return true;
  }

  // IPv4-mapped IPv6 (::ffff:0:0/96)
  if (cleanIpv6.startsWith("::ffff:") || cleanIpv6.startsWith("0:0:0:0:0:ffff:")) {
    const embeddedIpv4 = cleanIpv6.split(":").pop();
    if (embeddedIpv4 && embeddedIpv4.includes(".")) {
      return isPrivateOrInternalIp(embeddedIpv4);
    }
    return true;
  }

  // Discard prefix / Documentation
  if (cleanIpv6.startsWith("100::") || cleanIpv6.startsWith("2001:db8:")) {
    return true;
  }

  return false;
}

/**
 * Verifica se um hostname textual pertence a endereços locais ou nomes de serviços internos
 */
export function isPrivateOrInternalHost(hostname: string): boolean {
  if (!hostname || typeof hostname !== "string") return true;
  const host = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

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
    host === "metadata.google.internal" ||
    host === "instance-data"
  ) {
    return true;
  }

  // 2. Nomes de serviços de infraestrutura internos conhecidos no Docker / Cluster
  if (
    host === "postgres" ||
    host === "biometric-api" ||
    host === "app" ||
    host === "cloudflared" ||
    host === "unifap-postgres" ||
    host === "unifap-biometric-api" ||
    host === "unifap-web-app" ||
    host === "redis" ||
    host === "rabbitmq" ||
    host === "db"
  ) {
    return true;
  }

  // 3. Validação direta caso o hostname seja um endereço IP
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    return isPrivateOrInternalIp(host);
  }

  return false;
}

/**
 * Validação síncrona prévia de URL (protocolo e sintaxe)
 */
export function validateSafeUrl(
  urlString: string,
  options?: SafeUrlOptions
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

  const allowedProtocols = options?.allowedProtocols || (options?.requireHttps ? ["https:"] : ["http:", "https:"]);
  if (!allowedProtocols.includes(parsed.protocol)) {
    return {
      isSafe: false,
      error: `Protocolo '${parsed.protocol}' não permitido. Utilize ${allowedProtocols.join(" ou ")}.`,
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
        error: `Domínio '${hostname}' não autorizado pela allowlist de segurança.`,
      };
    }
  }

  return { isSafe: true, parsedUrl: parsed };
}

/**
 * Validação assíncrona profunda com resolução de DNS e inspeção de TODOS os IPs retornados (Anti-SSRF + Anti-Rebinding)
 */
export async function validateSafeUrlAsync(
  urlString: string,
  options?: SafeUrlOptions
): Promise<SsrfValidationResult> {
  const syncCheck = validateSafeUrl(urlString, options);
  if (!syncCheck.isSafe || !syncCheck.parsedUrl) {
    return syncCheck;
  }

  const parsedUrl = syncCheck.parsedUrl;
  const hostname = parsedUrl.hostname.replace(/^\[|\]$/g, "");

  // Se já for um IP literal válido, o check síncrono já validou
  if (/^[\d.]+$/.test(hostname) || hostname.includes(":")) {
    if (isPrivateOrInternalIp(hostname)) {
      return {
        isSafe: false,
        error: "O endereço IP informado pertence a uma rede privada ou reservada.",
      };
    }
    return { isSafe: true, parsedUrl, resolvedIps: [hostname] };
  }

  // Resolução de DNS completa (registros IPv4 e IPv6)
  try {
    const records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
    if (!records || records.length === 0) {
      return {
        isSafe: false,
        error: `Não foi possível resolver o hostname '${hostname}' no DNS.`,
      };
    }

    const resolvedIps = records.map((r) => r.address);

    // Valida CADA endereço IP retornado pelo servidor DNS
    for (const record of records) {
      if (isPrivateOrInternalIp(record.address)) {
        return {
          isSafe: false,
          error: `O hostname '${hostname}' resolveu para o IP interno/privado '${record.address}', o que viola as políticas de segurança Anti-SSRF.`,
          resolvedIps,
        };
      }
    }

    return {
      isSafe: true,
      parsedUrl,
      resolvedIps,
    };
  } catch (err: any) {
    return {
      isSafe: false,
      error: `Falha na resolução de DNS para o hostname '${hostname}': ${err.message || "Erro desconhecido"}`,
    };
  }
}

/**
 * Recupera lista de hosts autorizados para webhooks a partir da variável de ambiente WEBHOOK_ALLOWED_HOSTS
 */
export function getWebhookAllowedHosts(): string[] | undefined {
  const envHosts = process.env.WEBHOOK_ALLOWED_HOSTS;
  if (!envHosts || !envHosts.trim()) return undefined;
  return envHosts
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Executa requisição HTTP segura com proteção anti-SSRF de múltiplos estágios:
 * - Validação prévia de URL e DNS
 * - Redirecionamento manual seguro (revalida DNS e IP de cada destino)
 * - Mitigação de DNS Rebinding
 */
export async function safeFetch(
  initialUrl: string,
  fetchOptions?: RequestInit & {
    allowedHostSuffixes?: string[];
    maxRedirects?: number;
    timeoutMs?: number;
  }
): Promise<Response> {
  const maxRedirects = fetchOptions?.maxRedirects ?? 3;
  const timeoutMs = fetchOptions?.timeoutMs ?? 10000;
  const allowedHostSuffixes = fetchOptions?.allowedHostSuffixes;

  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // Validação estrita assíncrona de DNS e IP antes de cada salto
    const validation = await validateSafeUrlAsync(currentUrl, {
      allowedProtocols: ["http:", "https:"],
      allowedHostSuffixes,
    });

    if (!validation.isSafe || !validation.parsedUrl) {
      throw new Error(
        validation.error || `Requisição para '${currentUrl}' bloqueada por diretrizes de segurança (Anti-SSRF).`
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(validation.parsedUrl.toString(), {
        ...fetchOptions,
        redirect: "manual",
        signal: controller.signal,
      });

      // Se for resposta de redirecionamento (301, 302, 303, 307, 308), valida o destino
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirecionamento HTTP recebido sem cabeçalho 'Location'.");
        }

        currentUrl = new URL(location, currentUrl).toString();
        redirectCount++;

        if (redirectCount > maxRedirects) {
          throw new Error(`Limite máximo de ${maxRedirects} redirecionamentos excedido.`);
        }
        continue;
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error("Número excessivo de redirecionamentos ao executar requisição.");
}
