import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tables = ["Person", "FaceEmbedding", "Event", "EventParticipant", "Presence", "Prize", "Draw", "Winner", "Device"];
  
  for (const t of tables) {
    const cols: any = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = '${t}';
    `);
    console.log(`\n=== Tabela: ${t} ===`);
    console.log(cols.map((c: any) => `${c.column_name} (${c.data_type})`).join(", "));
  }

  await prisma.$disconnect();
}

main().catch(console.error);
