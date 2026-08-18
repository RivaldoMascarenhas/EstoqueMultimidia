import { NextRequest, NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const updated = await RequestService.retrySync(params.id);

    return NextResponse.json({
      success: true,
      message: updated.syncStatus === "SYNCED"
        ? "Sincronizado com o Google Calendar com sucesso!"
        : "Tentativa realizada, porém o serviço do Google reportou pendência/erro.",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao tentar sincronizar com o Google Calendar." },
      { status: 400 }
    );
  }
}
