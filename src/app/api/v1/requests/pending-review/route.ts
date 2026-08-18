import { NextResponse } from "next/server";
import { RequestService } from "@/services/request.service";
import { requireSession } from "@/lib/api-guard";

export async function GET() {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const pendingReview = await RequestService.getRequests({
      needsReview: true,
    });

    return NextResponse.json({
      success: true,
      data: pendingReview,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar eventos pendentes de revisão." },
      { status: 500 }
    );
  }
}
