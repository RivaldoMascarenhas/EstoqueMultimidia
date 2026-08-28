import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiRequest, requireApiPermission } from "@/lib/api-auth";
import { AssetStatus, LoanStatus, MovementType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiRequest(req);
    const permissionCheck = requireApiPermission(auth, "loan:return");
    if (!permissionCheck.allowed && permissionCheck.response) {
      return permissionCheck.response;
    }

    const body = await req.json();
    const { 
      assetTag, 
      protocol,
      condition, 
      isDamaged, 
      returnBoxCode, 
      notes 
    } = body;

    if (!assetTag && !protocol) {
      return NextResponse.json(
        { success: false, error: "Forneça o 'assetTag' ou o 'protocol' do empréstimo." },
        { status: 400 }
      );
    }

    let loan: any = null;

    if (protocol) {
      const shortId = protocol.replace(/^[Ll][Oo][Aa][Nn]-/, "").toLowerCase();
      loan = await prisma.loan.findFirst({
        where: {
          id: { endsWith: shortId },
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        include: {
          asset: { include: { item: true, currentBox: true } },
        },
      });
    } else if (assetTag) {
      const cleanTag = String(assetTag).replace(/^#/, "").replace(/^PAT-/, "");
      loan = await prisma.loan.findFirst({
        where: {
          asset: {
            OR: [
              { assetTag: cleanTag },
              { id: assetTag },
            ],
          },
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        include: {
          asset: { include: { item: true, currentBox: true } },
        },
      });
    }

    if (!loan) {
      return NextResponse.json(
        { success: false, error: "Nenhum empréstimo ativo em aberto encontrado para o item/protocolo informado." },
        { status: 404 }
      );
    }

    // Buscar caixa de devolução
    let returnBoxId = loan.asset.currentBoxId;
    if (returnBoxCode) {
      const box = await prisma.box.findFirst({
        where: { code: { equals: returnBoxCode, mode: "insensitive" } },
      });
      if (box) returnBoxId = box.id;
    }

    const userId = auth.user?.id || (await prisma.user.findFirst({ where: { role: "ADMIN" } }))?.id || "";
    const newAssetStatus = isDamaged ? AssetStatus.DAMAGED : AssetStatus.AVAILABLE;
    const newLoanStatus = isDamaged ? LoanStatus.RETURNED_DAMAGED : LoanStatus.RETURNED;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atualizar empréstimo apenas se ACTIVE ou OVERDUE
      const loanUpdate = await tx.loan.updateMany({
        where: {
          id: loan.id,
          status: { in: [LoanStatus.ACTIVE, LoanStatus.OVERDUE] },
        },
        data: {
          actualReturnDate: new Date(),
          status: newLoanStatus,
          returnedCondition: condition || (isDamaged ? "Devolvido com avarias" : "Perfeito estado"),
          returnNotes: notes || null,
          returnBoxId,
          receivedByUserId: userId,
        },
      });

      if (loanUpdate.count === 0) {
        throw new Error("Este empréstimo já foi devolvido ou não se encontra ativo.");
      }

      // 2. Atualizar Ativo
      await tx.asset.update({
        where: { id: loan.assetId },
        data: {
          status: newAssetStatus,
          currentBoxId: returnBoxId,
        },
      });

      // 3. Histórico do Patrimônio
      await tx.assetHistory.create({
        data: {
          assetId: loan.assetId,
          action: isDamaged ? "RETURN_DAMAGED" : "RETURN_COMPLETED",
          fromStatus: AssetStatus.LOANED,
          toStatus: newAssetStatus,
          userId,
          userName: auth.user?.name || "Integração Externa",
          observation: `Devolução registrada via API. Condição: ${condition || "Normal"}. Obs: ${notes || "-"}`,
        },
      });

      // 4. Movimentação de estoque
      await tx.stockMovement.create({
        data: {
          itemId: loan.asset.itemId,
          destBoxId: returnBoxId,
          type: MovementType.RETURN,
          quantity: 1,
          balanceBefore: 0,
          balanceAfter: 1,
          userId,
          observation: `Devolução do patrimônio #${loan.asset.assetTag} recebida de ${loan.borrowerName}`,
        },
      });

      const updatedLoan = await tx.loan.findUniqueOrThrow({
        where: { id: loan.id },
      });

      return updatedLoan;
    });

    const whatsappMessage = [
      `📥 *DEVOLUÇÃO REGISTRADA COM SUCESSO • UNIFAP*`,
      ``,
      `📋 *Protocolo:* \`LOAN-${result.id.slice(-8).toUpperCase()}\``,
      `🏷️ *Equipamento:* ${loan.asset.item.name} (#${loan.asset.assetTag})`,
      `👤 *Solicitante:* ${loan.borrowerName}`,
      `✨ *Condição:* ${condition || (isDamaged ? "Avariado" : "Perfeito estado")}`,
      `📦 *Guardado na Caixa:* ${returnBoxCode || "Original"}`,
      ``,
      `_Obrigado por utilizar o sistema de equipamentos multimídia da UniFAP!_`,
    ].join("\n");

    return NextResponse.json({
      success: true,
      loan: result,
      whatsappMessage,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao registrar devolução via API." },
      { status: 500 }
    );
  }
}
