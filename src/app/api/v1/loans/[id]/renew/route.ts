import { NextRequest, NextResponse } from "next/server";
import { LoanService } from "@/services/loan.service";
import { loanRenewSchema } from "@/schemas/loan.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID do empréstimo obrigatório." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = loanRenewSchema.parse(body);

    const updatedLoan = await LoanService.renewLoan(
      id,
      validatedData,
      session.user.id,
      session.user.name || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Prazo de devolução prorrogado com sucesso!",
      data: updatedLoan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao renovar empréstimo." },
      { status: 400 }
    );
  }
}
