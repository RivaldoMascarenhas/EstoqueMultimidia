import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarService } from "@/services/google-calendar.service";
import { requireSession } from "@/lib/api-guard";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([Role.ADMIN, Role.GESTOR, Role.OPERADOR]);
    if (error) return error;

    // Buscar todas as solicitações não sincronizadas ou com erro
    const pendingRequests = await prisma.request.findMany({
      where: {
        syncStatus: { in: ["PENDING", "ERROR"] },
        status: { not: "CANCELADO" },
      },
      include: {
        room: true,
        items: {
          include: { item: true, asset: true },
        },
      },
      take: 50, // Lote seguro
    });

    if (pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma solicitação pendente de sincronização.",
        data: { processed: 0, succeeded: 0, failed: 0 },
      });
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const req of pendingRequests) {
      try {
        const payload = GoogleCalendarService.buildEventPayload(req);
        let result;

        if (req.googleEventId) {
          result = await GoogleCalendarService.updateEvent(req.googleEventId, payload);
        } else {
          result = await GoogleCalendarService.createEvent(payload);
        }

        if (result.success) {
          await prisma.request.update({
            where: { id: req.id },
            data: {
              syncStatus: "SYNCED",
              googleEventId: result.eventId || req.googleEventId,
              lastGoogleSyncAt: new Date(),
            },
          });
          succeeded++;
        } else {
          await prisma.request.update({
            where: { id: req.id },
            data: {
              syncStatus: "ERROR",
              lastGoogleSyncAt: new Date(),
            },
          });
          failed++;
          errors.push(`Sala ${req.room.name}: ${result.error}`);
        }
      } catch (err: any) {
        failed++;
        errors.push(`Sala ${req.room.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processamento concluído: ${succeeded} sincronizados com sucesso, ${failed} com falha.`,
      data: {
        processed: pendingRequests.length,
        succeeded,
        failed,
        errors,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao processar sincronização em lote." },
      { status: 500 }
    );
  }
}
