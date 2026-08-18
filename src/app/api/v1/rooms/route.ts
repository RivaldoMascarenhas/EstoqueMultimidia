import { NextRequest, NextResponse } from "next/server";
import { RoomService } from "@/services/room.service";
import { roomCreateSchema } from "@/schemas/room.schema";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const floor = searchParams.get("floor") || undefined;
    const activeOnly = searchParams.get("activeOnly") === "true";

    const rooms = await RoomService.getRooms({
      search,
      floor,
      activeOnly,
    });

    return NextResponse.json({
      success: true,
      data: rooms,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao listar salas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR]);
    if (error) return error;

    const body = await req.json();
    const validated = roomCreateSchema.parse(body);

    const room = await RoomService.createRoom(validated, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Sala ${room.name} cadastrada com sucesso!`,
      data: room,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao cadastrar sala." },
      { status: 400 }
    );
  }
}
