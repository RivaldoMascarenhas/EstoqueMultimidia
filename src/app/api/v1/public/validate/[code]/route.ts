import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RateLimiter } from "@/lib/rate-limiter";
import { verifyReportCode } from "@/lib/report-signature";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    // 1. Rate Limiting Público (Prevenção de DoS e Fuzzing/Enumeração)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    const rateCheck = await RateLimiter.consume(`public:validate:${ip}`, 30, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Muitas consultas consecutivas. Por favor, aguarde 1 minuto.",
        },
        { status: 429 }
      );
    }

    const { code } = await context.params;
    let cleanCode = decodeURIComponent(code || "").trim();

    if (!cleanCode || cleanCode.length < 5) {
      return NextResponse.json(
        { success: false, error: "Código de autenticidade inválido ou incompleto (mínimo de 5 caracteres)." },
        { status: 400 }
      );
    }

    // Se vier como URL completa (ex: https://.../validar/cmthzzf6n0), extrai apenas a chave
    if (cleanCode.includes("/validar/")) {
      const parts = cleanCode.split("/validar/");
      cleanCode = parts[parts.length - 1]?.split("?")[0]?.split("#")[0]?.trim() || cleanCode;
    }

    const rawCode = cleanCode;
    const strippedLoanCode = cleanCode.replace(/^LOAN-/i, "").replace(/^#/, "").trim();
    const strippedOsCode = cleanCode.replace(/^OS-/i, "").replace(/^#/, "").trim();

    // 2. Procurar por Empréstimo / Termo de Cautela (Busca Segura sem Wildcard Aberto)
    const loanConditions: any[] = [
      { id: rawCode },
      { id: rawCode.toLowerCase() },
    ];

    if (strippedLoanCode.length >= 8) {
      loanConditions.push({ id: { endsWith: strippedLoanCode.toLowerCase() } });
    }

    let loan = await prisma.loan.findFirst({
      where: {
        OR: loanConditions,
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

    // 3. Procurar por Ordem de Serviço de Manutenção
    const maintenanceConditions: any[] = [
      { id: rawCode },
      { id: rawCode.toLowerCase() },
      { orderNumber: { equals: rawCode, mode: "insensitive" } },
      { orderNumber: { equals: `OS-${strippedOsCode}`, mode: "insensitive" } },
    ];

    if (strippedOsCode.length >= 8) {
      maintenanceConditions.push({ id: { endsWith: strippedOsCode.toLowerCase() } });
    }

    let maintenance = await prisma.maintenance.findFirst({
      where: {
        OR: maintenanceConditions,
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

    // 4. Procurar ou validar Relatório Oficial do Sistema (REL-*) com Assinatura Criptográfica HMAC
    if (rawCode.toUpperCase().startsWith("REL-")) {
      const verification = verifyReportCode(rawCode);
      if (verification.isValid) {
        return NextResponse.json({
          success: true,
          data: {
            documentType: "OFFICIAL_REPORT",
            documentTitle: verification.reportTitle || "Relatório Oficial de Gestão e Controle",
            protocol: rawCode.toUpperCase(),
            authenticationCode: rawCode.toUpperCase(),
            status: "AUTHENTIC",
            statusLabel: "Relatório Emitido e Autenticado",
            statusColor: "emerald",
            issuedAt: verification.issuedAt || new Date().toISOString(),
            reportType: verification.reportType,
            institution: "Centro Universitário Paraíso • UniFAP",
            sector: "Setor de Suporte de TI & Multimídia",
            notes: "Relatório gerado eletronicamente com dados consolidados e assinatura digital válida.",
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: verification.error || `Código de relatório "${rawCode}" inválido ou não autenticado.`,
          },
          { status: 404 }
        );
      }
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
