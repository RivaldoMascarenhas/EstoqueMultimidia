import { formatZodError } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";
import { requireSession } from "@/lib/api-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { error } = await requireSession();
    if (error) return error;

    

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
      { success: false, error: formatZodError(error, "Erro ao consultar empréstimo.") },
      { status: 404 }
    );
  }
}
