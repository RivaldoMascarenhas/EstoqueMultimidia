import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";

// GET /api/v1/users/[id]/avatar - Servir imagem do avatar diretamente do banco de dados (Base64 -> Buffer binário)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error: sessionError } = await requireSession();
    if (sessionError) return sessionError;

    

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

    // Se for formato Base64 (data:image/...)
    if (user.avatarUrl.startsWith("data:image/")) {
      const commaIndex = user.avatarUrl.indexOf(",");
      if (commaIndex !== -1) {
        const metadata = user.avatarUrl.substring(0, commaIndex);
        const base64Data = user.avatarUrl.substring(commaIndex + 1);

        let mimeType = "image/jpeg";
        if (metadata.includes("image/png")) mimeType = "image/png";
        else if (metadata.includes("image/webp")) mimeType = "image/webp";
        else if (metadata.includes("image/gif")) mimeType = "image/gif";

        const buffer = Buffer.from(base64Data, "base64");

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
            "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
            "X-Content-Type-Options": "nosniff",
            "ETag": etag,
          },
        });
      }
    }

    return new NextResponse("Avatar not found", { status: 404 });
  } catch (error: any) {
    return new NextResponse("Error loading avatar", { status: 500 });
  }
}
