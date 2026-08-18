import { NextRequest, NextResponse } from "next/server";
import { RoomService } from "@/services/room.service";
import { roomUpdateSchema } from "@/schemas/room.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const room = await RoomService.getRoomById(params.id);
    return NextResponse.json({ success: true, data: room });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Sala não encontrada." },
      { status: 404 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    const body = await req.json();
    const validated = roomUpdateSchema.parse(body);

    const updated = await RoomService.updateRoom(params.id, validated, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Sala ${updated.name} atualizada com sucesso!`,
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao atualizar sala." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireSession([Role.ADMIN]);
    if (error) return error;

    const deactivated = await RoomService.deactivateRoom(params.id, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Sala ${deactivated.name} desativada com sucesso!`,
      data: deactivated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao desativar sala." },
      { status: 400 }
    );
  }
}
