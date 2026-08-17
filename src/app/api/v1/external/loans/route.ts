import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateApiRequest } from "@/lib/api-auth";
import { AssetStatus, LoanStatus, MovementType } from "@prisma/client";

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
    const { 
      assetTag, 
      borrowerName, 
      borrowerEmail, 
      borrowerPhone, 
      borrowerDepartment, 
      destination, 
      expectedReturnHours,
      expectedReturnDate,
      notes 
    } = body;

    if (!assetTag || !borrowerName || !destination) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios: assetTag, borrowerName, destination." },
        { status: 400 }
      );
    }

    const cleanTag = String(assetTag).replace(/^#/, "").replace(/^PAT-/, "");

    // 1. Buscar o ativo
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
        currentBox: { include: { door: true } },
      },
    });

    if (!asset) {
      return NextResponse.json(
        { success: false, error: `Equipamento patrimonial #${assetTag} não foi encontrado.` },
        { status: 404 }
      );
    }

    if (asset.status !== AssetStatus.AVAILABLE) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Equipamento #${asset.assetTag} não está disponível para empréstimo (Status atual: ${asset.status}).` 
        },
        { status: 400 }
      );
    }

    // 2. Calcular data prevista
    let returnDate: Date;
    if (expectedReturnDate) {
      returnDate = new Date(expectedReturnDate);
    } else {
      const hours = Number(expectedReturnHours) || 4;
      returnDate = new Date();
      returnDate.setHours(returnDate.getHours() + hours);
    }

    const userId = auth.user?.id || (await prisma.user.findFirst({ where: { role: "ADMIN" } }))?.id || "";

    // 3. Executar transação com lock atômico
    const result = await prisma.$transaction(async (tx) => {
      // Atualizar status do ativo apenas se ainda disponível (anti race condition)
      const assetUpdate = await tx.asset.updateMany({
        where: { id: asset.id, status: AssetStatus.AVAILABLE },
        data: { status: AssetStatus.LOANED, currentBoxId: null },
      });

      if (assetUpdate.count === 0) {
        throw new Error(`Equipamento #${asset.assetTag} foi alocado concorrentemente e não está mais disponível.`);
      }

      // Criar Empréstimo
      const loan = await tx.loan.create({
        data: {
          assetId: asset.id,
          borrowerName,
          borrowerEmail: borrowerEmail || null,
          borrowerPhone: borrowerPhone || null,
          borrowerDepartment: borrowerDepartment || "Geral",
          destination,
          expectedReturnDate: returnDate,
          status: LoanStatus.ACTIVE,
          notes: notes || "Empréstimo registrado via API/n8n",
          createdByUserId: userId,
        },
      });

      // Criar histórico do patrimônio
      await tx.assetHistory.create({
        data: {
          assetId: asset.id,
          action: "LOAN_CREATED",
          fromStatus: AssetStatus.AVAILABLE,
          toStatus: AssetStatus.LOANED,
          toLocation: destination,
          userId: userId,
          userName: auth.user?.name || "Integração Externa",
          observation: `Empréstimo externo para ${borrowerName} (${destination}) via API`,
        },
      });

      // Registrar movimentação de estoque
      await tx.stockMovement.create({
        data: {
          itemId: asset.itemId,
          sourceBoxId: asset.currentBoxId,
          type: MovementType.LOAN,
          quantity: 1,
          balanceBefore: 1,
          balanceAfter: 0,
          userId: userId,
          observation: `Empréstimo do ativo #${asset.assetTag} para ${borrowerName} (${destination})`,
        },
      });

      return loan;
    });

    const protocol = `LOAN-${result.id.slice(-8).toUpperCase()}`;

    // Mensagem pronta para o WhatsApp
    const whatsappConfirmation = [
      `✅ *EMPRÉSTIMO CONFIRMADO • UNIFAP*`,
      ``,
      `📋 *Protocolo:* \`${protocol}\``,
      `🏷️ *Equipamento:* ${asset.item.name} (#${asset.assetTag})`,
      `👤 *Responsável:* ${borrowerName}`,
      `📍 *Destino:* ${destination}`,
      `⏰ *Devolução Prevista:* ${returnDate.toLocaleString("pt-BR")}`,
      ``,
      `_Por favor, devolva o item no prazo para garantir a disponibilidade aos demais professores._`,
    ].join("\n");

    return NextResponse.json({
      success: true,
      protocol,
      loan: result,
      whatsappConfirmation,
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao registrar empréstimo via API." },
      { status: 500 }
    );
  }
}
