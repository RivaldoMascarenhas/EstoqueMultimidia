import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { EventService } from "@/services/event.service";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await requireSession([
    Role.ADMIN,
    Role.GESTOR,
    Role.OPERADOR,
  ]);
  if (error) return error;

  try {
    const body = await req.json();
    const { categories = [], requireBiometricsOnly = false } = body;

    const result = await EventService.enrollByCategory({
      eventId: params.id,
      categories: Array.isArray(categories) ? categories : [],
      requireBiometricsOnly: Boolean(requireBiometricsOnly),
      operatorUserId: session?.user?.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao inscrever pessoas por categoria." },
      { status: 400 }
    );
  }
}
