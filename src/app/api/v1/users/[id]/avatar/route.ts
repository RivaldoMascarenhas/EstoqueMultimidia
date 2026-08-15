import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/v1/users/[id]/avatar - Servir imagem do avatar diretamente do banco de dados (Base64 -> Buffer binário)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return new NextResponse("User ID required", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatarUrl: true, updatedAt: true, name: true },
    });

    if (!user || !user.avatarUrl) {
      return new NextResponse("Avatar not found", { status: 404 });
    }

    // Se for URL externa completa (ex: http:// ou https://)
    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      return NextResponse.redirect(user.avatarUrl);
    }

    // Se for formato Base64 (data:image/...)
    if (user.avatarUrl.startsWith("data:image")) {
      const matches = user.avatarUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (matches) {
        const subtype = matches[1].toLowerCase();
        const mimeType =
          subtype === "png"
            ? "image/png"
            : subtype === "webp"
            ? "image/webp"
            : subtype === "gif"
            ? "image/gif"
            : "image/jpeg";

        const buffer = Buffer.from(matches[2], "base64");

        const etag = `"${user.updatedAt.getTime()}"`;
        const ifNoneMatch = req.headers.get("if-none-match");

        if (ifNoneMatch === etag) {
          return new NextResponse(null, { status: 304 });
        }

        return new Response(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": buffer.length.toString(),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
            "ETag": etag,
          },
        });
      }
    }

    // Se já for uma rota relativa pública válida
    if (user.avatarUrl.startsWith("/") && !user.avatarUrl.startsWith("/api/v1/users/")) {
      return NextResponse.redirect(new URL(user.avatarUrl, req.url));
    }

    return new NextResponse("Avatar not found", { status: 404 });
  } catch (error: any) {
    return new NextResponse("Error loading avatar", { status: 500 });
  }
}
