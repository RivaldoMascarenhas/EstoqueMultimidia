import { NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const data = await RequestService.getRequestsByShift(new Date());

    return NextResponse.json({
      success: true,
      data: data.nextRequest,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao identificar próximo atendimento." },
      { status: 500 }
    );
  }
}
