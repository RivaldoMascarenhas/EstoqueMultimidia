import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adicionando coluna affiliation na tabela Person se não existir...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "affiliation" TEXT;
    `);
    console.log("✅ Coluna 'affiliation' adicionada com sucesso!");
  } catch (err: any) {
    console.error("Erro ao alterar tabela Person:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
