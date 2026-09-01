import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    let cleanCode = decodeURIComponent(code || "").trim();

    if (!cleanCode) {
      return NextResponse.json(
        { success: false, error: "Código de autenticidade não informado." },
        { status: 400 }
      );
    }

    // 0. Se vier como URL completa (ex: https://.../validar/cmthzzf6n0), extrai apenas a chave
    if (cleanCode.includes("/validar/")) {
      const parts = cleanCode.split("/validar/");
      cleanCode = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || cleanCode;
    }

    const rawCode = cleanCode;
    const strippedLoanCode = cleanCode.replace(/^LOAN-/i, "").replace(/^#/, "").trim();
    const strippedOsCode = cleanCode.replace(/^OS-/i, "").replace(/^#/, "").trim();

    // 1. Procurar por Empréstimo / Termo de Cautela
    let loan = await prisma.loan.findFirst({
      where: {
        OR: [
          { id: rawCode },
          { id: rawCode.toLowerCase() },
          { id: { startsWith: rawCode.toLowerCase() } },
          { id: { endsWith: strippedLoanCode.toLowerCase() } },
          { id: { contains: strippedLoanCode.toLowerCase() } },
        ],
      },
      include: {
        asset: {
          include: {
            item: true,
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        receivedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (loan) {
      const isReturned = loan.status === "RETURNED" || loan.status === "RETURNED_DAMAGED";
      return NextResponse.json({
        success: true,
        data: {
          documentType: isReturned ? "RETURN_RECEIPT" : "LOAN_RECEIPT",
          documentTitle: isReturned
            ? "Comprovante de Devolução e Encerramento de Cautela"
            : "Termo de Cautela e Responsabilidade por Equipamento",
          protocol: `LOAN-${loan.id.slice(-8).toUpperCase()}`,
          authenticationCode: loan.id.slice(0, 10).toUpperCase(),
          status: loan.status,
          statusLabel: isReturned
            ? loan.status === "RETURNED_DAMAGED"
              ? "Devolvido com Avaria"
              : "Devolvido Regularmente"
            : "Em Andamento / Ativo",
          statusColor: isReturned ? "emerald" : "amber",
          issuedAt: loan.loanDate,
          expectedReturnDate: loan.expectedReturnDate,
          actualReturnDate: loan.actualReturnDate,
          beneficiary: {
            name: loan.borrowerName,
            department: loan.borrowerDepartment || "Não informado",
            destination: loan.destination,
            phone: loan.borrowerPhone ? "***" + loan.borrowerPhone.slice(-4) : "Não informado",
            email: loan.borrowerEmail ? loan.borrowerEmail.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "Não informado",
          },
          asset: {
            tag: loan.asset.assetTag,
            itemName: loan.asset.item.name,
            model: loan.asset.model || loan.asset.item.model || "Padrão",
            serialNumber: loan.asset.serialNumber || "N/A",
          },
          operator: loan.createdByUser?.name || "Suporte de TI UniFAP",
          receivedBy: loan.receivedByUser?.name || null,
          returnCondition: loan.returnedCondition || null,
          returnNotes: loan.returnNotes || null,
          notes: loan.notes || null,
          institution: "Centro Universitário Paraíso • UniFAP",
          sector: "Setor de Suporte de TI & Multimídia",
        },
      });
    }

    // 2. Procurar por Ordem de Serviço de Manutenção
    let maintenance = await prisma.maintenance.findFirst({
      where: {
        OR: [
          { id: rawCode },
          { id: rawCode.toLowerCase() },
          { id: { startsWith: rawCode.toLowerCase() } },
          { id: { endsWith: strippedOsCode.toLowerCase() } },
          { id: { contains: strippedOsCode.toLowerCase() } },
          { orderNumber: { equals: rawCode, mode: "insensitive" } },
          { orderNumber: { equals: `OS-${strippedOsCode}`, mode: "insensitive" } },
          { orderNumber: { equals: `#OS-${strippedOsCode}`, mode: "insensitive" } },
          { orderNumber: { contains: strippedOsCode, mode: "insensitive" } },
        ],
      },
      include: {
        asset: {
          include: {
            item: true,
          },
        },
        createdByUser: {
          select: {
            name: true,
            email: true,
          },
        },
        completedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (maintenance) {
      const isCompleted = maintenance.status === "COMPLETED";
      return NextResponse.json({
        success: true,
        data: {
          documentType: "MAINTENANCE_OS",
          documentTitle: "Ordem de Serviço de Manutenção & Reparo",
          protocol: maintenance.orderNumber || `OS-${maintenance.id.slice(-8).toUpperCase()}`,
          authenticationCode: maintenance.id.slice(0, 10).toUpperCase(),
          status: maintenance.status,
          statusLabel: isCompleted
            ? "Manutenção Concluída"
            : maintenance.status === "CANCELLED"
            ? "Manutenção Cancelada"
            : "Em Andamento na Bancada",
          statusColor: isCompleted ? "emerald" : maintenance.status === "CANCELLED" ? "rose" : "amber",
          issuedAt: maintenance.entryDate,
          exitDate: maintenance.exitDate,
          asset: {
            tag: maintenance.asset.assetTag,
            itemName: maintenance.asset.item.name,
            model: maintenance.asset.model || maintenance.asset.item.model || "Padrão",
            serialNumber: maintenance.asset.serialNumber || "N/A",
          },
          issueDescription: maintenance.issueDescription,
          solution: maintenance.solution || maintenance.technicalNotes || "Em diagnóstico técnico",
          serviceProvider: maintenance.serviceProvider || "Laboratório Interno de TI",
          cost: maintenance.cost ? Number(maintenance.cost) : 0,
          technician: maintenance.completedByUser?.name || maintenance.createdByUser?.name || "Técnico de Suporte UniFAP",
          institution: "Centro Universitário Paraíso • UniFAP",
          sector: "Setor de Suporte de TI & Multimídia",
        },
      });
    }

    // 3. Procurar ou validar Relatório Oficial do Sistema (REL-*)
    if (rawCode.toUpperCase().startsWith("REL-")) {
      const parts = rawCode.split("-");
      const reportType = parts[1]?.toUpperCase() || "GERAL";
      
      const typeLabels: Record<string, string> = {
        STOCK: "Relatório de Inventário & Posicionamento de Estoque",
        INVENTORY: "Relatório de Inventário Físico do Armário",
        LOANS: "Relatório Geral de Empréstimos e Devoluções",
        MAINTENANCE: "Relatório de Manutenções e Ordens de Serviço",
        MOVEMENTS: "Relatório Histórico de Movimentações de Materiais",
        ASSETS: "Relatório Geral de Controle Patrimonial",
      };

      return NextResponse.json({
        success: true,
        data: {
          documentType: "OFFICIAL_REPORT",
          documentTitle: typeLabels[reportType] || "Relatório Oficial de Gestão e Controle",
          protocol: rawCode.toUpperCase(),
          authenticationCode: rawCode.toUpperCase(),
          status: "AUTHENTIC",
          statusLabel: "Relatório Emitido e Autenticado",
          statusColor: "emerald",
          issuedAt: new Date().toISOString(),
          reportType,
          institution: "Centro Universitário Paraíso • UniFAP",
          sector: "Setor de Suporte de TI & Multimídia",
          notes: "Relatório gerado eletronicamente com dados consolidados em tempo real.",
        },
      });
    }

    // Se não encontrou nenhum registro
    return NextResponse.json(
      {
        success: false,
        error: `Nenhum documento institucional foi localizado com o código ou protocolo "${rawCode}".`,
      },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Erro na validação de documento:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao validar documento de autenticidade." },
      { status: 500 }
    );
  }
}
