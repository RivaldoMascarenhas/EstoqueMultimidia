import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiRequest, requireApiPermission } from "@/lib/api-auth";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiRequest(req);
    const permissionCheck = requireApiPermission(auth, "maintenance:create");
    if (!permissionCheck.allowed && permissionCheck.response) {
      return permissionCheck.response;
    }

    const body = await req.json();
    const { assetTag, issueDescription, serviceProvider } = body;

    if (!assetTag || !issueDescription) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: assetTag, issueDescription." },
        { status: 400 }
      );
    }

    const cleanTag = String(assetTag).replace(/^#/, "").replace(/^PAT-/, "");

    const asset = await prisma.asset.findFirst({
      where: {
        active: true,
        OR: [
          { assetTag: cleanTag },
          { id: assetTag },
        ],
      },
      include: {
        item: true,
      },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Equipamento patrimonial #${assetTag} não encontrado.` },
        { status: 404 }
      );
    }

    const userId = auth.user?.id || (await prisma.user.findFirst({ where: { role: "ADMIN" } }))?.id || "";

    const { maintenance: result, orderNumber } = await prisma.$transaction(async (tx) => {
      // 1. Atualizar status do ativo apenas se AVAILABLE ou DAMAGED (lock atômico)
      const assetUpdate = await tx.asset.updateMany({
        where: {
          id: asset.id,
          status: { in: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED] },
        },
        data: {
          status: AssetStatus.IN_MAINTENANCE,
          currentBoxId: null,
        },
      });

      if (assetUpdate.count === 0) {
        throw new Error(`Equipamento #${asset.assetTag} não está disponível para manutenção (já em empréstimo ou em manutenção ativa).`);
      }

      // 2. Gerar número de OS sequencial atômico (anti race condition)
      const year = new Date().getFullYear();
      const seqRecord = await tx.maintenanceSequence.upsert({
        where: { year },
        update: { current: { increment: 1 } },
        create: { year, current: 1 },
      });
      const orderNumber = `OS-${year}-${String(seqRecord.current).padStart(4, "0")}`;

      // 3. Criar chamado de manutenção
      const maintenance = await tx.maintenance.create({
        data: {
          assetId: asset.id,
          orderNumber,
          issueDescription,
          serviceProvider: serviceProvider || "Suporte Técnico Interno UniFAP",
          status: MaintenanceStatus.PENDING,
          createdByUserId: userId,
        },
      });

      // 3. Registrar histórico
      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          action: "MAINTENANCE_OPENED",
          fromStatus: asset.status,
          toStatus: AssetStatus.IN_MAINTENANCE,
          userId,
          userName: auth.user?.name || "Integração Externa",
          observation: `Chamado técnico aberto via API (${orderNumber}): ${issueDescription}`,
        },
      });

      return { maintenance, orderNumber };
    });

    const whatsappMessage = [
      `🔧 *ORDEM DE SERVIÇO ABERTA • UNIFAP*`,
      ``,
      `📋 *Nº da OS:* \`${orderNumber}\``,
      `🏷️ *Equipamento:* ${asset.item.name} (#${asset.assetTag})`,
      `⚠️ *Defeito Relatado:* ${issueDescription}`,
      `🏢 *Destino/Prestador:* ${serviceProvider || "Laboratório UniFAP"}`,
      `📅 *Data de Entrada:* ${new Date().toLocaleDateString("pt-BR")}`,
      ``,
      `_O chamado foi registrado e nossa equipe técnica fará o diagnóstico._`,
    ].join("\n");

    return NextResponse.json({
      success: true,
      orderNumber,
      maintenance: result,
      whatsappMessage,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
