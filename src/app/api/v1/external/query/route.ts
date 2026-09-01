import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiRequest, requireApiPermission } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    // 1. Validar autenticação e escopo de permissão
    const auth = await validateApiRequest(req);
    const permissionCheck = requireApiPermission(auth, "inventory:read");
    if (!permissionCheck.allowed && permissionCheck.response) {
      return permissionCheck.response;
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Parâmetro de busca 'q' obrigatório. Ex: ?q=hdmi ou ?q=123458" },
        { status: 400 }
      );
    }

    const cleanTag = query.replace(/^#/, "").replace(/^PAT-/, "");

    // 2. Buscar em Materiais de Estoque
    const items = await prisma.item.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { sku: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        category: true,
        inventories: {
          include: {
            box: { include: { door: true } },
          },
        },
      },
      take: 5,
    });

    // 3. Buscar em Patrimônios Individuais
    const assets = await prisma.asset.findMany({
      where: {
        active: true,
        OR: [
          { assetTag: { contains: cleanTag, mode: "insensitive" } },
          { serialNumber: { contains: query, mode: "insensitive" } },
          { model: { contains: query, mode: "insensitive" } },
          { item: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: {
        item: true,
        currentBox: { include: { door: true } },
        loans: {
          where: { status: "ACTIVE" },
          take: 1,
        },
      },
      take: 5,
    });

    // 4. Buscar em Caixas do Armário
    const boxes = await prisma.box.findMany({
      where: {
        active: true,
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        door: true,
        assets: { include: { item: true } },
        inventories: { include: { item: true } },
      },
      take: 3,
    });

    // 5. Construir resposta amigável e formatada para o WhatsApp
    let whatsappLines: string[] = [];
    whatsappLines.push(`🔎 *Resultado da Consulta UniFAP:* _"${query}"_\n`);

    let totalFound = 0;

    if (items.length > 0) {
      totalFound += items.length;
      whatsappLines.push(`📦 *MATERIAIS EM ESTOQUE:*`);
      items.forEach((item) => {
        const totalStock = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
        const locations = item.inventories
          .map((inv) => `${inv.box.name} (${inv.box.code}): *${inv.quantity} ${item.unit}*`)
          .join(", ");

        whatsappLines.push(`• *${item.name}* (SKU: \`${item.sku}\`)`);
        whatsappLines.push(`  ↳ Saldo Total: *${totalStock} ${item.unit}*`);
        if (locations) {
          whatsappLines.push(`  ↳ Localização: ${locations}`);
        } else {
          whatsappLines.push(`  ↳ Localização: _Sem saldo no armário_`);
        }
      });
      whatsappLines.push("");
    }

    if (assets.length > 0) {
      totalFound += assets.length;
      whatsappLines.push(`🏷️ *EQUIPAMENTOS PATRIMONIAIS:*`);
      assets.forEach((asset) => {
        const statusMap: Record<string, string> = {
          AVAILABLE: "🟢 DISPONÍVEL",
          LOANED: "🟣 EMPRESTADO",
          IN_MAINTENANCE: "🟡 EM MANUTENÇÃO",
          DAMAGED: "🔴 AVARIADO",
        };
        const statusLabel = statusMap[asset.status] || asset.status;
        whatsappLines.push(`• *${asset.item.name}* (#${asset.assetTag})`);
        whatsappLines.push(`  ↳ Status: *${statusLabel}*`);
        const canViewLoanDetails = auth.permissions?.includes("inventory:read:loans") ||
          auth.permissions?.includes("admin") ||
          auth.role === "ADMIN" ||
          auth.role === "GESTOR";

        if (asset.status === "AVAILABLE" && asset.currentBox) {
          whatsappLines.push(`  ↳ Local: ${asset.currentBox.door?.name || "Porta"} ➔ *${asset.currentBox.name} (${asset.currentBox.code})*`);
        } else if (asset.status === "LOANED") {
          if (canViewLoanDetails && asset.loans[0]) {
            whatsappLines.push(`  ↳ Com: *${asset.loans[0].borrowerName}* (${asset.loans[0].destination})`);
          } else {
            whatsappLines.push(`  ↳ Empréstimo ativo (detalhes sob permissão específica)`);
          }
        }
      });
      whatsappLines.push("");
    }

    if (boxes.length > 0 && items.length === 0 && assets.length === 0) {
      totalFound += boxes.length;
      whatsappLines.push(`🗄️ *CAIXAS DO ARMÁRIO:*`);
      boxes.forEach((box) => {
        whatsappLines.push(`• *${box.name} (${box.code})* - ${box.door?.name || "Porta"}`);
        const assetNames = box.assets.map((a) => `#${a.assetTag} ${a.item.name}`).join(", ");
        const invNames = box.inventories.map((i) => `${i.item.name} (${i.quantity})`).join(", ");
        if (assetNames) whatsappLines.push(`  ↳ Patrimônios: ${assetNames}`);
        if (invNames) whatsappLines.push(`  ↳ Materiais: ${invNames}`);
      });
      whatsappLines.push("");
    }

    if (totalFound === 0) {
      whatsappLines.push(`❌ _Nenhum item, patrimônio ou caixa localizado para o termo informado._`);
    } else {
      whatsappLines.push(`_Sistema de Gestão de Estoque • Suporte TI UniFAP_`);
    }

    return NextResponse.json({
      success: true,
      query,
      totalFound,
      whatsappMessage: whatsappLines.join("\n"),
      data: {
        items,
        assets,
        boxes,
      },
    });

  } catch (error: any) {
    console.error("Erro na consulta externa da API:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao processar consulta." },
      { status: 500 }
    );
  }
}
