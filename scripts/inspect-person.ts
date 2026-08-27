import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const columns: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Person';
  `);
  console.log("Colunas da tabela Person:", columns);
  await prisma.$disconnect();
}

main().catch(console.error);
