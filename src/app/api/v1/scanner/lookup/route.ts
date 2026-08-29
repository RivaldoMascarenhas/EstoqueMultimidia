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

    // 2. Tentar extrair de URL (ex: https://.../caixas/C001 ou /patrimonio/123458)
    if (parsedTag.includes("/caixas/")) {
      const parts = parsedTag.split("/caixas/");
      parsedTag = parts[1]?.split("?")[0]?.trim() || parsedTag;
    } else if (parsedTag.includes("/patrimonio/")) {
      const parts = parsedTag.split("/patrimonio/");
      parsedTag = parts[1]?.split("?")[0]?.trim() || parsedTag;
    }

    // Limpar prefixos comuns como #, #PAT-, #OS-
    const cleanTag = parsedTag.replace(/^#/, "").replace(/^PAT-/, "");

    // ----------------------------------------------------
    // RESOLVER ENTIDADES
    // ----------------------------------------------------

    // A. Buscar por PATRIMÔNIO (Asset)
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

    // B. Buscar por CAIXA DO ARMÁRIO (Box)
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

    // C. Buscar por EMPRÉSTIMO (Loan)
    if (parsedTag.startsWith("LOAN-") || parsedTag.startsWith("loan-")) {
      const loanIdShort = parsedTag.replace(/^[Ll][Oo][Aa][Nn]-/, "").toLowerCase();
      const loan = await prisma.loan.findFirst({
        where: {
          id: { endsWith: loanIdShort },
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
    }

    // D. Buscar por ORDEM DE SERVIÇO (Maintenance)
    const maintenance = await prisma.maintenance.findFirst({
      where: {
        OR: [
          { orderNumber: { equals: parsedTag, mode: "insensitive" } },
          { orderNumber: { equals: `#${cleanTag}`, mode: "insensitive" } },
          { id: parsedTag },
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

    // E. Buscar por ITEM / MATERIAL (SKU)
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
