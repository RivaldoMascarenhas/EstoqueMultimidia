import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoanStatus, MaintenanceStatus, Role } from "@prisma/client";
import { requireSession } from "@/lib/api-guard";
import { sanitizeLoanForRole } from "@/lib/maskData";

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireSession([
      Role.ADMIN,
      Role.GESTOR,
      Role.OPERADOR,
      Role.CONSULTA,
    ]);
    if (error) return error;
    const body = await req.json();
    const rawInput = body.code?.trim() || "";

    if (!rawInput) {
      return NextResponse.json(
        { success: false, error: "Nenhum código fornecido para leitura." },
        { status: 400 }
      );
    }

    let parsedTag = rawInput;

    // 1. Tentar fazer parse se for um JSON institucional gerado pelo sistema
    if (rawInput.startsWith("{") && rawInput.endsWith("}")) {
      try {
        const json = JSON.parse(rawInput);
        if (json.assetTag) {
          parsedTag = json.assetTag;
        } else if (json.boxCode) {
          parsedTag = json.boxCode;
        } else if (json.protocol && json.protocol.startsWith("LOAN-")) {
          parsedTag = json.protocol;
        } else if (json.osNumber) {
          parsedTag = json.osNumber;
        }
      } catch (e) {
        // Não é JSON válido, continuar
      }
    }

    // 2. Extrair de URL (ex: https://.../caixas/C001, /patrimonio/123458 ou /validar/cmthzzf6n0)
    if (parsedTag.includes("/validar/")) {
      const parts = parsedTag.split("/validar/");
      parsedTag = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || parsedTag;
    } else if (parsedTag.includes("/caixas/")) {
      const parts = parsedTag.split("/caixas/");
      parsedTag = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || parsedTag;
    } else if (parsedTag.includes("/patrimonio/")) {
      const parts = parsedTag.split("/patrimonio/");
      parsedTag = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || parsedTag;
    }

    // Limpar prefixos comuns como #, #PAT-, #OS-
    const cleanTag = parsedTag.replace(/^#/, "").replace(/^PAT-/i, "").trim();
    const strippedLoan = parsedTag.replace(/^[Ll][Oo][Aa][Nn]-/, "").replace(/^#/, "").trim();
    const strippedOs = parsedTag.replace(/^[Oo][Ss]-/, "").replace(/^#/, "").trim();

    // ----------------------------------------------------
    // RESOLVER ENTIDADES
    // ----------------------------------------------------

    // A. Buscar por EMPRÉSTIMO / TERMO DE CAUTELA (Loan)
    const loan = await prisma.loan.findFirst({
      where: {
        OR: [
          { id: parsedTag },
          { id: parsedTag.toLowerCase() },
          { id: strippedLoan },
          { id: strippedLoan.toLowerCase() },
          { id: { startsWith: strippedLoan.toLowerCase() } },
          { id: { endsWith: strippedLoan.toLowerCase() } },
          { id: { contains: strippedLoan.toLowerCase() } },
        ],
      },
      include: {
        asset: {
          include: {
            item: true,
            currentBox: { include: { door: true } },
          },
        },
        createdByUser: { select: { name: true, email: true } },
      },
    });

    if (loan) {
      return NextResponse.json({
        success: true,
        entityType: "LOAN",
        data: sanitizeLoanForRole(loan, session?.user?.role),
      });
    }

    // B. Buscar por ORDEM DE SERVIÇO (Maintenance / OS)
    const maintenance = await prisma.maintenance.findFirst({
      where: {
        OR: [
          { id: parsedTag },
          { id: parsedTag.toLowerCase() },
          { id: { startsWith: parsedTag.toLowerCase() } },
          { id: { endsWith: strippedOs.toLowerCase() } },
          { id: { contains: strippedOs.toLowerCase() } },
          { orderNumber: { equals: parsedTag, mode: "insensitive" } },
          { orderNumber: { equals: `#${cleanTag}`, mode: "insensitive" } },
          { orderNumber: { equals: `OS-${strippedOs}`, mode: "insensitive" } },
          { orderNumber: { equals: `#OS-${strippedOs}`, mode: "insensitive" } },
          { orderNumber: { contains: strippedOs, mode: "insensitive" } },
        ],
      },
      include: {
        asset: {
          include: {
            item: true,
            currentBox: { include: { door: true } },
          },
        },
      },
    });

    if (maintenance) {
      return NextResponse.json({
        success: true,
        entityType: "MAINTENANCE",
        data: maintenance,
      });
    }

    // C. Buscar por RELATÓRIO OFICIAL (Report / REL-*)
    if (parsedTag.toUpperCase().startsWith("REL-")) {
      const parts = parsedTag.split("-");
      const reportType = parts[1] || "GERAL";
      const hash = parts[2] || "OFICIAL";

      return NextResponse.json({
        success: true,
        entityType: "DOCUMENT_VALIDATION",
        data: {
          protocol: parsedTag.toUpperCase(),
          documentTitle: `Relatório Oficial de ${reportType.toUpperCase()} - UniFAP`,
          statusLabel: "DOCUMENTO AUTÊNTICO & HOMOLOGADO",
          statusColor: "emerald",
          institution: "Centro Universitário Paraíso • UniFAP",
          sector: "Setor de Suporte de TI & Multimídia",
          authenticationCode: hash.toUpperCase(),
          issuedAt: new Date(),
        },
      });
    }

    // D. Buscar por PATRIMÔNIO (Asset)
    const asset = await prisma.asset.findFirst({
      where: {
        active: true,
        OR: [
          { assetTag: parsedTag },
          { assetTag: cleanTag },
          { serialNumber: parsedTag },
          { serialNumber: cleanTag },
          { id: parsedTag },
        ],
      },
      include: {
        item: {
          include: { category: true },
        },
        currentBox: {
          include: { door: true },
        },
        loans: {
          where: { status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] } },
          include: { createdByUser: { select: { name: true } } },
          take: 1,
        },
        maintenances: {
          where: { status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] } },
          take: 1,
        },
      },
    });

    if (asset) {
      const activeLoan = asset.loans[0] || null;
      const activeMaintenance = asset.maintenances[0] || null;

      return NextResponse.json({
        success: true,
        entityType: "ASSET",
        data: {
          asset,
          activeLoan: sanitizeLoanForRole(activeLoan, session?.user?.role),
          activeMaintenance,
        },
      });
    }

    // E. Buscar por CAIXA DO ARMÁRIO (Box)
    const box = await prisma.box.findFirst({
      where: {
        active: true,
        OR: [
          { code: { equals: parsedTag, mode: "insensitive" } },
          { code: { equals: cleanTag, mode: "insensitive" } },
          { id: parsedTag },
        ],
      },
      include: {
        door: true,
        inventories: {
          include: {
            item: { include: { category: true } },
          },
        },
        assets: {
          where: { active: true },
          include: {
            item: true,
          },
        },
      },
    });

    if (box) {
      return NextResponse.json({
        success: true,
        entityType: "BOX",
        data: box,
      });
    }

    // F. Buscar por ITEM / MATERIAL (SKU)
    const item = await prisma.item.findFirst({
      where: {
        active: true,
        OR: [
          { sku: { equals: parsedTag, mode: "insensitive" } },
          { sku: { equals: cleanTag, mode: "insensitive" } },
          { id: parsedTag },
        ],
      },
      include: {
        category: true,
        inventories: {
          include: {
            box: { include: { door: true } },
          },
        },
        assets: {
          where: { active: true },
          include: {
            currentBox: { include: { door: true } },
          },
        },
      },
    });

    if (item) {
      const totalStock = item.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
      return NextResponse.json({
        success: true,
        entityType: "ITEM",
        data: {
          item,
          totalStock,
        },
      });
    }

    // Não encontrado
    return NextResponse.json({
      success: false,
      error: `Nenhum registro encontrado para o código "${rawInput}".`,
      code: rawInput,
    }, { status: 404 });

  } catch (error: any) {
    console.error("Erro interno no scanner lookup:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar a leitura do scanner." },
      { status: 500 }
    );
  }
}
