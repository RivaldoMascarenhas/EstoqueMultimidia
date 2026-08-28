import { NextRequest, NextResponse } from "next/server";
import { validateSafeUrl } from "@/lib/ssrf";

export const dynamic = "force-dynamic";

// Lista de domínios permitidos para proxy seguro de imagens
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

const ALLOWED_MIME_PREFIXES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");
    const driveId = searchParams.get("id");

    let fetchUrl: string | null = null;

    if (driveId) {
      // Sanitizar ID do Google Drive (apenas caracteres alfanuméricos, traço e sublinhado)
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

    // 1. Validação Estrita Anti-SSRF
    const validation = validateSafeUrl(fetchUrl, {
      allowedProtocols: ["http:", "https:"],
      allowedHostSuffixes: ALLOWED_IMAGE_DOMAINS,
    });

    if (!validation.isSafe || !validation.parsedUrl) {
      return NextResponse.json(
        { success: false, error: validation.error || "URL de imagem não permitida por segurança." },
        { status: 400 }
      );
    }

    // 2. Requisição segura com timeout de 10s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(validation.parsedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      // Fallback para endpoint uc?export=view caso thumbnail do Google Drive falhe
      if (driveId || fetchUrl.includes("drive.google.com")) {
        const id = driveId || fetchUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
        if (id) {
          const sanitizedFallbackId = id.replace(/[^a-zA-Z0-9_-]/g, "");
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 10000);

          const fallbackRes = await fetch(
            `https://drive.google.com/uc?export=view&id=${sanitizedFallbackId}`,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              signal: fallbackController.signal,
            }
          ).finally(() => clearTimeout(fallbackTimeout));

          if (fallbackRes.ok) {
            const rawContentType = fallbackRes.headers.get("content-type") || "image/jpeg";
            const contentType = rawContentType.split(";")[0].trim().toLowerCase();

            // Bloquear se o retorno não for imagem
            if (!ALLOWED_MIME_PREFIXES.some((mime) => contentType.startsWith(mime))) {
              return new NextResponse("Tipo de arquivo não permitido (esperava-se imagem).", {
                status: 415,
              });
            }

            const buffer = await fallbackRes.arrayBuffer();
            return new NextResponse(buffer, {
              headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }
        }
      }

      return new NextResponse(`Falha ao obter imagem externa: ${response.statusText}`, {
        status: response.status,
      });
    }

    const rawContentType = response.headers.get("content-type") || "image/jpeg";
    const contentType = rawContentType.split(";")[0].trim().toLowerCase();

    // Bloquear arquivos não-imagem (evitar XSS / HTML injection através do proxy)
    if (!ALLOWED_MIME_PREFIXES.some((mime) => contentType.startsWith(mime))) {
      return new NextResponse("Tipo de arquivo não permitido (esperava-se imagem).", {
        status: 415,
      });
    }

    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    const isTimeout = err.name === "AbortError";
    return new NextResponse(
      isTimeout
        ? "Tempo limite (10s) excedido ao buscar imagem externa."
        : `Erro ao processar imagem: ${err.message}`,
      { status: isTimeout ? 504 : 500 }
    );
  }
}
