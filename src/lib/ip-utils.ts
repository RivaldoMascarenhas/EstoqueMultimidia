/**
 * Utilitário unificado para obtenção de IP do cliente.
 * Suporta tanto objetos Request nativos (fetch API / Next.js App Router)
 * quanto objetos Request HTTP do Node (NextAuth / Express).
 */
export function getClientIp(req: any): string {
  if (!req) return "unknown";

  // Se req tiver o método 'get' nos headers (ex: NextRequest / Headers nativo)
  if (req.headers && typeof req.headers.get === "function") {
    const cfIp = req.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();
    
    // IMPORTANTE: X-Forwarded-For pode ser forjado se o proxy não for confiável
    // Certifique-se que o Nginx está limpando o header antes de adicionar o IP real do cliente.
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }
    
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  
  // Tratamento para objetos Node.js nativos (ex: NextAuth)
  if (req.headers && typeof req.headers === "object" && typeof req.headers.get !== "function") {
    const cfIp = req.headers["cf-connecting-ip"] || req.headers["CF-Connecting-IP"];
    if (typeof cfIp === "string" && cfIp) return cfIp.trim();
    
    const xForwardedFor = req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"];
    if (typeof xForwardedFor === "string" && xForwardedFor) {
      return xForwardedFor.split(",")[0].trim();
    }
    
    const xRealIp = req.headers["x-real-ip"] || req.headers["X-Real-IP"];
    if (typeof xRealIp === "string" && xRealIp) return xRealIp.trim();
  }

  // Tratamento de IP direto do socket caso exista
  if (req.socket && req.socket.remoteAddress) {
    return req.socket.remoteAddress;
  }
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  return "unknown";
}
