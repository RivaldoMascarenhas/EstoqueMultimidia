import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";
import { AssetStatus, ItemLogisticsType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSession();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    const startTimeStr = searchParams.get("startTime");
    const endTimeStr = searchParams.get("endTime");
    const roomId = searchParams.get("roomId");
    const excludeRequestId = searchParams.get("excludeRequestId") || undefined;

    if (!dateStr || !startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { success: false, error: "Parâmetros date, startTime e endTime são obrigatórios." },
        { status: 400 }
      );
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const [sH, sM] = startTimeStr.includes("T")
      ? [new Date(startTimeStr).getHours(), new Date(startTimeStr).getMinutes()]
      : startTimeStr.split(":").map(Number);
    const [eH, eM] = endTimeStr.includes("T")
      ? [new Date(endTimeStr).getHours(), new Date(endTimeStr).getMinutes()]
      : endTimeStr.split(":").map(Number);

    const startDateTime = new Date(year, month - 1, day, sH, sM, 0);
    const endDateTime = new Date(year, month - 1, day, eH, eM, 0);

    // 1. Buscar todos os itens do catálogo
    const items = await prisma.item.findMany({
      include: {
        category: true,
        inventories: true,
        assets: true,
      },
      orderBy: { name: "asc" },
    });

    // 2. Buscar sala selecionada para verificar projetor fixo e patrimônios vinculados
    let selectedRoom: any = null;
    if (roomId) {
      selectedRoom = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          fixedEquipment: {
            include: { asset: true, item: true },
          },
          currentAssets: true,
        },
      });
    }

    // 3. Buscar reservas ativas conflitantes no mesmo intervalo de horário
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        requestId: excludeRequestId ? { not: excludeRequestId } : undefined,
        status: "ACTIVE",
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } },
        ],
      },
      select: {
        itemId: true,
        quantity: true,
        assetId: true,
      },
    });

    // Agrupar quantidades já reservadas por itemId
    const reservedCountsByItemId = new Map<string, number>();
    for (const res of overlappingReservations) {
      if (res.itemId) {
        const cur = reservedCountsByItemId.get(res.itemId) || 0;
        reservedCountsByItemId.set(res.itemId, cur + res.quantity);
      }
    }

    // 4. Calcular disponibilidade em tempo real para cada item
    const availabilityList = items.map((item) => {
      // Caso 1: Item Fixo em Sala (Projetor do Teto / Patrimônio Fixo)
      if (item.logisticsType === ItemLogisticsType.FIXED_IN_ROOM) {
        const hasFixedProjector = Boolean(selectedRoom?.fixedProjectorModel || selectedRoom?.fixedEquipment?.length);
        const lampOk = selectedRoom?.lampStatus !== "TROCAR LAMPADA";
        
        // Verifica se algum patrimônio fixo da sala está em manutenção
        const hasAssetInMaintenance = selectedRoom?.fixedEquipment?.some(
          (fe: any) => fe.asset?.status === "IN_MAINTENANCE" || fe.asset?.status === "DAMAGED"
        ) || selectedRoom?.currentAssets?.some(
          (ca: any) => ca.status === "IN_MAINTENANCE" || ca.status === "DAMAGED"
        );

        const isAvailable = hasFixedProjector && lampOk && !hasAssetInMaintenance;

        return {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          category: item.category.name,
          logisticsType: item.logisticsType,
          totalStock: hasFixedProjector ? 1 : 0,
          inMaintenance: hasFixedProjector && (!lampOk || hasAssetInMaintenance) ? 1 : 0,
          inLoans: 0,
          alreadyReserved: 0,
          availableQuantity: isAvailable ? 1 : 0,
          isAvailable,
          fixedDetails: hasFixedProjector
            ? {
                model: selectedRoom.fixedProjectorModel || "Projetor Integrado",
                lampStatus: selectedRoom.lampStatus || "Bom",
                hdmiOk: selectedRoom.hdmiCableOk,
                vgaOk: selectedRoom.vgaCableOk,
              }
            : null,
          unavailabilityReason: !selectedRoom
            ? "Selecione uma sala primeiro"
            : !hasFixedProjector
            ? `A sala ${selectedRoom.name} não possui projetor fixo instalado`
            : hasAssetInMaintenance
            ? `O equipamento da sala ${selectedRoom.name} está em manutenção técnica no TI`
            : !lampOk
            ? `Projetor da sala ${selectedRoom.name} requer troca de lâmpada`
            : null,
        };
      }

      // Caso 2: Itens Móveis de Estoque (Datashows Portáteis, Notebooks, Cabos, etc.)
      const totalInventory = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      const totalAssets = item.assets.length;
      const totalCapacity = totalAssets > 0 ? totalAssets : totalInventory;

      // Ativos em manutenção ou avaria
      const maintenanceCount = item.assets.filter(
        (a) => a.status === AssetStatus.IN_MAINTENANCE || a.status === AssetStatus.DAMAGED
      ).length;

      // Ativos em empréstimo ativo
      const loanedCount = item.assets.filter((a) => a.status === AssetStatus.LOANED).length;

      // Quantidade já reservada em outras solicitações no mesmo horário
      const reservedCount = reservedCountsByItemId.get(item.id) || 0;

      const netAvailable = Math.max(0, totalCapacity - maintenanceCount - loanedCount - reservedCount);

      return {
        itemId: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category.name,
        logisticsType: item.logisticsType,
        totalStock: totalCapacity,
        inMaintenance: maintenanceCount,
        inLoans: loanedCount,
        alreadyReserved: reservedCount,
        availableQuantity: netAvailable,
        isAvailable: netAvailable > 0,
        unavailabilityReason:
          netAvailable <= 0
            ? totalCapacity === 0
              ? "Item sem estoque cadastrado"
              : reservedCount > 0
              ? `Todas as ${totalCapacity} unidades já estão reservadas para este horário`
              : "Todas as unidades estão em empréstimo ou manutenção"
            : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        room: selectedRoom ? { id: selectedRoom.id, name: selectedRoom.name, floor: selectedRoom.floor } : null,
        items: availabilityList,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Erro ao consultar disponibilidade de estoque." },
      { status: 500 }
    );
  }
}
