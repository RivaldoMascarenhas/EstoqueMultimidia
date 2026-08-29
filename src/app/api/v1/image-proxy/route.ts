import { NextRequest, NextResponse } from "next/server";
import { validateSafeUrlAsync } from "@/lib/ssrf";

export const dynamic = "force-dynamic";

// Lista estrita de domínios permitidos para proxy seguro de imagens
const ALLOWED_IMAGE_DOMAINS = [
  "google.com",
  "drive.google.com",
  "docs.google.com",
  "googleusercontent.com",
  "lh3.googleusercontent.com",
  "githubusercontent.com",
  "fapce.edu.br",
  "unifap.edu.br",
];

// Tipos MIME exatos permitidos (SVG removido explicitamente para mitigar XSS/XML bombs)
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2MB limite máximo
const MAX_REDIRECTS = 3;

/**
 * Executa fetch seguro com validação anti-SSRF em cada hop de redirecionamento (redirect: manual)
 */
async function fetchSafeImage(initialUrl: string): Promise<Response> {
  let currentUrl = initialUrl;
  let redirectsCount = 0;

  while (redirectsCount <= MAX_REDIRECTS) {
    const validation = await validateSafeUrlAsync(currentUrl, {
      allowedProtocols: ["http:", "https:"],
      allowedHostSuffixes: ALLOWED_IMAGE_DOMAINS,
    });

    if (!validation.isSafe || !validation.parsedUrl) {
      throw new Error(validation.error || "URL de imagem não permitida por diretrizes de segurança (Anti-SSRF).");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(validation.parsedUrl.toString(), {
      headers: {
        "User-Agent": "UniFAP-SecureImageProxy/1.0",
        Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "manual",
    }).finally(() => clearTimeout(timeoutId));

    // Lidar com redirecionamento HTTP 301, 302, 303, 307, 308
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error("Redirecionamento sem cabeçalho Location.");
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirectsCount++;
      continue;
    }

    return response;
  }

  throw new Error("Número excessivo de redirecionamentos ao buscar imagem externa.");
}

/**
 * Lê stream de resposta respeitando limite de bytes para evitar esgotamento de memória (DoS/OOM)
 */
async function readLimitedStream(response: Response, maxBytes: number): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength && contentLength > maxBytes) {
    throw new Error(`Imagem excede o limite máximo permitido de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const arrayBuf = await response.arrayBuffer();
    if (arrayBuf.byteLength > maxBytes) {
      throw new Error(`Imagem excede o limite máximo permitido de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
    }
    return Buffer.from(arrayBuf);
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.length;
      if (totalBytes > maxBytes) {
        reader.cancel();
        throw new Error(`Imagem excede o limite máximo permitido de ${Math.round(maxBytes / (1024 * 1024))} MB.`);
      }
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");
    const driveId = searchParams.get("id");

    let fetchUrl: string | null = null;

    if (driveId) {
      const sanitizedId = driveId.replace(/[^a-zA-Z0-9_-]/g, "");
      if (!sanitizedId) {
        return new NextResponse("ID do Google Drive inválido.", { status: 400 });
      }
      fetchUrl = `https://drive.google.com/thumbnail?id=${sanitizedId}&sz=w1200`;
    } else if (targetUrl) {
      const trimmed = targetUrl.trim();
      const match =
        trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

      if (
        (trimmed.includes("drive.google.com") || trimmed.includes("docs.google.com")) &&
        match &&
        match[1]
      ) {
        fetchUrl = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
      } else {
        fetchUrl = trimmed;
      }
    }

    if (!fetchUrl) {
      return new NextResponse("Parâmetro 'url' ou 'id' ausente.", { status: 400 });
    }

    let response: Response;
    try {
      response = await fetchSafeImage(fetchUrl);
    } catch (fetchErr: any) {
      return NextResponse.json(
        { success: false, error: fetchErr.message || "Erro na validação da imagem externa." },
        { status: 400 }
      );
    }

    if (!response.ok) {
      return new NextResponse(`Falha ao obter imagem externa: status ${response.status}`, {
        status: response.status,
      });
    }

    const rawContentType = response.headers.get("content-type") || "image/jpeg";
    const contentType = rawContentType.split(";")[0].trim().toLowerCase();

    // Verificação exata de tipo MIME (rejeita SVGs, executáveis, HTML, etc.)
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return new NextResponse("Tipo de arquivo não permitido (esperava-se imagem bitmap JPEG, PNG, WebP ou AVIF).", {
        status: 415,
      });
    }

    const buffer = await readLimitedStream(response, MAX_RESPONSE_BYTES);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=43200",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    const isTimeout = err.name === "AbortError";
    return new NextResponse(
      isTimeout
        ? "Tempo limite (8s) excedido ao buscar imagem externa."
        : `Erro ao processar imagem: ${err.message}`,
      { status: isTimeout ? 504 : 500 }
    );
  }
}
