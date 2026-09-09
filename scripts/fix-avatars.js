const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Found users:", users.length);
  
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  for (const u of users) {
    console.log(u.email, "Avatar:", u.avatarUrl ? u.avatarUrl.substring(0, 30) + '... (total: ' + u.avatarUrl.length + ' chars)' : 'null');
    
    // Se estiver em base64, converter imediatamente para arquivo em disco!
    if (u.avatarUrl && u.avatarUrl.startsWith('data:image')) {
      const matches = u.avatarUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'png' ? 'png' : 'jpg';
        const safeId = path.basename(String(u.id).replace(/[^a-zA-Z0-9_-]/g, ''));
        const fileName = `${safeId}.${ext}`;
        const filePath = path.resolve(uploadsDir, fileName);
        if (!filePath.startsWith(uploadsDir)) {
          throw new Error(`Caminho de arquivo inválido para usuário: ${u.id}`);
        }
        fs.writeFileSync(filePath, buffer);
        
        const shortUrl = `/uploads/avatars/${fileName}?v=${Date.now()}`;
        await prisma.user.update({
          where: { id: u.id },
          data: { avatarUrl: shortUrl }
        });
        console.log(`=> Converted ${u.email} to short file URL: ${shortUrl}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
