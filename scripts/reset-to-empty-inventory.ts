import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================================");
  console.log("🧹 INICIANDO LIMPEZA E PREPARAÇÃO DA BASE DO ZERO");
  console.log("==========================================================");

  // 1. Limpar todas as tabelas operacionais, itens, caixas e patrimônios
  console.log("🗑️  Limpando dados transacionais, histórico e inventário...");
  await prisma.auditLog.deleteMany();
  await prisma.requestTask.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.request.deleteMany();
  await prisma.requestSeries.deleteMany();
  await prisma.roomFixedEquipment.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.item.deleteMany();
  await prisma.box.deleteMany();
  await prisma.door.deleteMany();

  console.log("✓ Dados operacionais, itens, patrimônios e caixas zerados!");

  // 2. Garantir as 4 Portas do Armário
  console.log("🚪 Configurando as 4 Portas do Armário...");
  const doorsData = [
    {
      code: "PORTA-1",
      name: "Porta 1",
      description: "Lado esquerdo do armário",
      orderIndex: 1,
    },
    {
      code: "PORTA-2",
      name: "Porta 2",
      description: "Centro-esquerda do armário",
      orderIndex: 2,
    },
    {
      code: "PORTA-3",
      name: "Porta 3",
      description: "Centro-direita do armário",
      orderIndex: 3,
    },
    {
      code: "PORTA-4",
      name: "Porta 4",
      description: "Lado direito do armário",
      orderIndex: 4,
    },
  ];

  for (const d of doorsData) {
    await prisma.door.create({
      data: d,
    });
  }
  console.log("✓ 4 Portas cadastradas com sucesso (Porta 1, Porta 2, Porta 3, Porta 4).");

  // 3. Garantir Categorias Base para facilitar o cadastro de itens pela equipe
  console.log("📁 Verificando Categorias base...");
  const categoriesData = [
    { name: "Projetores & Telas", slug: "projetores-telas", description: "Projetores móveis, fixos, telas e suportes de projeção" },
    { name: "Informática & Periféricos", slug: "informatica-perifericos", description: "Chromebooks, notebooks, passadores e periféricos" },
    { name: "Áudio & Microfones", slug: "audio-microfones", description: "Caixas de som amplificadas, microfones sem fio e cabos de áudio" },
    { name: "Cabos & Conectividade", slug: "cabos-conectividade", description: "Cabos HDMI, VGA, extensores e conexões" },
    { name: "Adaptadores & Conversores", slug: "adaptadores-conversores", description: "Adaptadores USB-C, DisplayPort, hubs e conversores" },
    { name: "Energia & Acessórios", slug: "energia-acessorios", description: "Pilhas, extensões elétricas, réguas e fontes de alimentação" },
  ];

  for (const cat of categoriesData) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!existing) {
      await prisma.category.create({ data: cat });
    }
  }
  console.log("✓ Categorias base verificadas.");

  // 4. Garantir Configurações de Turnos
  const shiftsCount = await prisma.shiftConfig.count();
  if (shiftsCount === 0) {
    await prisma.shiftConfig.createMany({
      data: [
        { shift: "MORNING", startTime: "07:00", endTime: "12:00", label: "Manhã", emoji: "🌅", orderIndex: 1 },
        { shift: "AFTERNOON", startTime: "12:00", endTime: "18:00", label: "Tarde", emoji: "☀️", orderIndex: 2 },
        { shift: "NIGHT", startTime: "18:00", endTime: "22:30", label: "Noite", emoji: "🌙", orderIndex: 3 },
      ],
    });
    console.log("✓ Configurações de turno registradas.");
  }

  // 5. Estatísticas Finais
  const usersCount = await prisma.user.count();
  const roomsCount = await prisma.room.count();
  const doorsCount = await prisma.door.count();
  const boxesCount = await prisma.box.count();
  const itemsCount = await prisma.item.count();
  const assetsCount = await prisma.asset.count();
  const loansCount = await prisma.loan.count();
  const requestsCount = await prisma.request.count();

  console.log("\n==========================================================");
  console.log("📊 RESUMO FINAL DA BASE LIMPA:");
  console.log(`  • Usuários preservados : ${usersCount}`);
  console.log(`  • Salas preservadas    : ${roomsCount}`);
  console.log(`  • Portas do Armário    : ${doorsCount} (Porta 1 a 4)`);
  console.log(`  • Caixas               : ${boxesCount} (Zerado)`);
  console.log(`  • Itens de Estoque     : ${itemsCount} (Zerado)`);
  console.log(`  • Patrimônios / Ativos : ${assetsCount} (Zerado)`);
  console.log(`  • Empréstimos          : ${loansCount} (Zerado)`);
  console.log(`  • Solicitações / Agenda: ${requestsCount} (Zerado)`);
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante a limpeza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
