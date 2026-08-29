import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { ImportService } from "@/services/import.service";
import { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
    Role.EVENTOS,
  ]);
  if (error) return error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob | null;
    const filename = (formData.get("filename") as string) || "import.csv";
    const eventId = (formData.get("eventId") as string) || null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Arquivo para importação é obrigatório." },
        { status: 400 }
      );
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
    return NextResponse.json(
      { success: false, error: err.message || "Erro na importação em lote." },
      { status: 500 }
    );
  }
}
