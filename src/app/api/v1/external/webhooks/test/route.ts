import { NextRequest, NextResponse } from "next/server";
import { validateApiRequest, requireApiPermission } from "@/lib/api-auth";
import { validateSafeUrl } from "@/lib/ssrf";

export async function POST(req: NextRequest) {
  try {
    const auth = await validateApiRequest(req);
    const permissionCheck = requireApiPermission(auth, "webhook:test");
    if (!permissionCheck.allowed && permissionCheck.response) {
      return permissionCheck.response;
    }

    const body = await req.json();
    const { targetWebhookUrl, eventType } = body;

    if (!targetWebhookUrl || typeof targetWebhookUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "Campo 'targetWebhookUrl' obrigatório (URL do Webhook do n8n)." },
        { status: 400 }
      );
    }

    // Validação estrita anti-SSRF (bloquear endereços locais e faixas privadas)
    const ssrfCheck = validateSafeUrl(targetWebhookUrl);
    if (!ssrfCheck.isSafe || !ssrfCheck.parsedUrl) {
      return NextResponse.json(
        { success: false, error: ssrfCheck.error || "Endereços locais, privados ou de metadados internos não são permitidos para disparos de webhook por motivos de segurança." },
        { status: 400 }
      );
    }
    const parsedUrl = ssrfCheck.parsedUrl;

    const mockPayloads: Record<string, any> = {
      LOAN_OVERDUE_ALERT: {
        event: "LOAN_OVERDUE_ALERT",
        timestamp: new Date().toISOString(),
        data: {
          protocol: "LOAN-00412801",
          assetTag: "123458",
          equipmentName: "Projetor Epson PowerLite E20",
          borrowerName: "Prof. Carlos Eduardo",
          borrowerPhone: "88999990000",
          destination: "Auditório Principal",
          expectedReturnDate: new Date(Date.now() - 3600000 * 2).toISOString(),
          delayHours: 2,
          whatsappFormattedText: "⚠️ *ALERTA DE ATRASO UNIFAP*\nOlá Prof. Carlos Eduardo, o empréstimo do Projetor Epson (#123458) venceu há 2 horas. Favor devolver no setor de TI.",
        },
      },
      CRITICAL_STOCK_ALERT: {
        event: "CRITICAL_STOCK_ALERT",
        timestamp: new Date().toISOString(),
        data: {
          itemSku: "CAB-HDMI-02M",
          itemName: "Cabo HDMI 2 metros Blindado",
          currentStock: 0,
          minStock: 5,
          idealStock: 15,
          unitsNeeded: 15,
          whatsappFormattedText: "🚨 *ALERTA DE ESTOQUE CRÍTICO UNIFAP*\nO item *Cabo HDMI 2m* atingiu saldo 0 no armário. Necessária reposição de 15 unidades.",
        },
      },
      MAINTENANCE_CREATED: {
        event: "MAINTENANCE_CREATED",
        timestamp: new Date().toISOString(),
        data: {
          orderNumber: "OS-2026-0004",
          assetTag: "123480",
          equipmentName: "Microfone Sem Fio Duplo Shure",
          issueDescription: "Cápsula com chiado excessivo",
          serviceProvider: "Laboratório UniFAP",
          whatsappFormattedText: "🔧 *NOVA OS ABERTA UNIFAP*\nEquipamento: Microfone Shure (#123480)\nDefeito: Cápsula com chiado excessivo.",
        },
      },
    };

    const payloadToSend = mockPayloads[eventType || "LOAN_OVERDUE_ALERT"] || mockPayloads.LOAN_OVERDUE_ALERT;

    // Disparar requisição HTTP POST para a URL do Webhook com timeout de 10s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "UniFAP-Inventory-Webhook-Dispatcher/1.0",
      },
      body: JSON.stringify(payloadToSend),
      redirect: "manual",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const responseStatus = response.status;

    return NextResponse.json({
      success: true,
      message: `Evento de teste disparado com sucesso para o webhook!`,
      statusReceived: responseStatus,
      sentPayload: payloadToSend,
      targetWebhookUrl: parsedUrl.toString(),
    });

  } catch (error: any) {
    const isTimeout = error.name === "AbortError";
    return NextResponse.json(
      { 
        success: false, 
        error: isTimeout
          ? "Tempo limite de conexão (10s) excedido ao tentar contatar o Webhook."
          : `Falha ao conectar com o Webhook: ${error.message}. Verifique se a URL do n8n está acessível.` 
      },
      { status: 500 }
    );
  }
}
