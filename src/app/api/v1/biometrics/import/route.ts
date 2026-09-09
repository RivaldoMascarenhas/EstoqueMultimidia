import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { ImportService } from "@/services/import.service";
import { Role } from "@prisma/client";
import { assertEventAccess } from "@/lib/event-access";
import { EVENT_PERMISSIONS } from "@/lib/event-permissions";
import { ImportLimitError } from "@/lib/zip-limits";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ], { req: req });
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const filename = formData.get("filename") || "import.csv";
    const eventId = formData.get("eventId") || null;

    const lowerFilename = typeof filename === "string" ? filename.toLowerCase() : "";
    const isValidExtension = [".csv", ".xlsx", ".xls", ".zip"].some((ext) => lowerFilename.endsWith(ext));

    if (!(file instanceof Blob) || !file.size || typeof filename !== "string" || filename.length > 255 ||
        !isValidExtension || (eventId !== null && (typeof eventId !== "string" || eventId.length > 128))) {
      return NextResponse.json(
        { success: false, error: "Envie um arquivo CSV, XLSX, XLS ou ZIP não vazio e identificadores válidos." },
        { status: 400 }
      );
    }

    if (eventId) {
      const access = await assertEventAccess(eventId, session.user, {
        isMutation: true,
        requiredPermission: EVENT_PERMISSIONS.PARTICIPANTS_CREATE,
      });
      if (!access.authorized) return access.errorResponse!;
    }

    const isZip = filename.toLowerCase().endsWith(".zip");
    const maxSizeBytes = isZip ? 250 * 1024 * 1024 : 25 * 1024 * 1024; // 250MB para ZIP com fotos, 25MB para planilhas

    // Validação de tamanho máximo
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `O arquivo excede o limite máximo permitido de ${isZip ? "250 MB" : "25 MB"}.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Processamento de Pacote ZIP (Planilha + Fotos ou apenas Fotos)
    if (isZip) {
      const result = await ImportService.processZipPackage({
        buffer,
        eventId,
        operatorUserId: session?.user?.id,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // 2. Processamento de Planilha Tradicional (CSV / XLSX)
    const rows = await ImportService.parseFile(buffer, filename);

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum participante válido encontrado na planilha." },
        { status: 400 }
      );
    }

    const result = await ImportService.processImport({
      rows,
      eventId,
      operatorUserId: session?.user?.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof ImportLimitError) {
      return NextResponse.json({ success: false, error: err.message }, { status: 413 });
    }
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
