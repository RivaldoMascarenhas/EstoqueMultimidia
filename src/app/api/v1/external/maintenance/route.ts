import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiRequest } from "@/lib/api-auth";
import { AssetStatus, MaintenanceStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiRequest(req);
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, error: auth.error || "Não autorizado." },
        { status: 401 }
      );
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

    // Gerar número de OS sequencial
    const year = new Date().getFullYear();
    const count = await prisma.maintenance.count();
    const orderNumber = `OS-${year}-${String(count + 1).padStart(4, "0")}`;

    const userId = auth.user?.id || (await prisma.user.findFirst({ where: { role: "ADMIN" } }))?.id || "";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar chamado de manutenção
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

      // 2. Atualizar status do ativo
      await tx.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.IN_MAINTENANCE },
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

      return maintenance;
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
      { success: false, error: error.message || "Erro ao abrir manutenção via API." },
      { status: 500 }
    );
  }
}
