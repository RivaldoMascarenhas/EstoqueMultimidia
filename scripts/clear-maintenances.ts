import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando limpeza das Ordens de Serviço (Manutenção)...");

  // 1. Encontrar todos os ativos que estão com status IN_MAINTENANCE
  const inMaintenanceAssets = await prisma.asset.findMany({
    where: { status: "IN_MAINTENANCE" },
    select: { id: true, assetTag: true },
  });

  console.log(`Encontrados ${inMaintenanceAssets.length} equipamento(s) com status EM MANUTENÇÃO.`);

  // 2. Restaurar o status desses ativos para AVAILABLE
  if (inMaintenanceAssets.length > 0) {
    const updated = await prisma.asset.updateMany({
      where: { status: "IN_MAINTENANCE" },
      data: { status: "AVAILABLE" },
    });
    console.log(`Status de ${updated.count} equipamento(s) restaurado para DISPONÍVEL.`);
  }

  // 3. Deletar todos os registros da tabela Maintenance
  const deleted = await prisma.maintenance.deleteMany({});
  console.log(`Foram removidas ${deleted.count} ordem(ns) de serviço do banco de dados.`);

  console.log("✅ Limpeza concluída com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro ao limpar ordens de serviço:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
