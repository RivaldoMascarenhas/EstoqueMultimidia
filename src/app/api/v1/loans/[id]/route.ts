import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";
import { requireSession } from "@/lib/api-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do empréstimo obrigatório." },
        { status: 400 }
      );
    }

    const loan = await LoanService.getLoanById(id);
    return NextResponse.json({
      success: true,
      data: loan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar empréstimo." },
      { status: 404 }
    );
  }
}
