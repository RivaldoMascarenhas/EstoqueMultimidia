import { prisma } from "@/lib/prisma";

interface AuditLogPayload {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: any;
  ipAddress?: string | null;
}

export async function safeAuditLog(
  payload: AuditLogPayload,
  client: any = prisma
) {
  try {
    let validUserId: string | null = null;
    if (payload.userId) {
      const user = await client.user.findUnique({
        where: { id: payload.userId },
        select: { id: true },
      });
      if (user) {
        validUserId = user.id;
      }
    }

    return await client.auditLog.create({
      data: {
        userId: validUserId,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId || null,
        details: payload.details ?? {},
        ipAddress: payload.ipAddress || null,
      },
    });
  } catch (err) {
    console.warn("[safeAuditLog] Could not persist audit record (non-fatal):", err);
    return null;
  }
}

export function getClientIp(req: Request | { headers: Headers }): string | undefined {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return undefined;
}

