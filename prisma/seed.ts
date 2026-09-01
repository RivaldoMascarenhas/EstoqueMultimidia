import { 
  PrismaClient, 
  Role, 
  ItemType, 
  AssetStatus, 
  Shift,
  ItemLogisticsType,
  RequestStatus,
  RequestOrigin
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed Idempotente e Não-Destrutivo do Banco de Dados UniFAP...');

  // 1. Contagem de usuários existentes para verificar necessidade de bootstrap
  const userCount = await prisma.user.count();

  if (userCount === 0 && process.env.NODE_ENV === "production" && !process.env.SEED_DEFAULT_PASSWORD) {
    throw new Error(
      "Erro de Segurança (SEC-07): Em ambiente de produção e banco vazio, é obrigatório definir a variável SEED_DEFAULT_PASSWORD para criar o primeiro usuário administrador."
    );
  }

  const seedPasswordRaw = process.env.SEED_DEFAULT_PASSWORD || `UniFAP@${Math.floor(100000 + Math.random() * 900000)}!`;
  const defaultPassword = await bcrypt.hash(seedPasswordRaw, 10);

  // 2. Criação / Upsert de Usuários Iniciais (sem sobrescrever senhas de usuários existentes)
  const rivaldo = await prisma.user.upsert({
    where: { email: 'rivaldo@unifap.br' },
    update: {},
    create: {
      name: 'Rivaldo Mascarenhas',
      email: 'rivaldo@unifap.br',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      mustChangePassword: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'rodrigo@unifap.br' },
    update: {},
    create: {
      name: 'Rodrigo Gestor',
      email: 'rodrigo@unifap.br',
      passwordHash: defaultPassword,
      role: Role.GESTOR,
      mustChangePassword: true,
    },
  });

  const thomas = await prisma.user.upsert({
    where: { email: 'thomas@unifap.br' },
    update: {},
    create: {
      name: 'Thomas Operador',
      email: 'thomas@unifap.br',
      passwordHash: defaultPassword,
      role: Role.OPERADOR,
      mustChangePassword: true,
    },
  });

  const pedro = await prisma.user.upsert({
    where: { email: 'pedro@unifap.br' },
    update: {},
    create: {
      name: 'Pedro Operador',
      email: 'pedro@unifap.br',
      passwordHash: defaultPassword,
      role: Role.OPERADOR,
      mustChangePassword: true,
    },
  });

  const paloma = await prisma.user.upsert({
    where: { email: 'paloma@unifap.br' },
    update: {},
    create: {
      name: 'Profa. Paloma Morais (Apoio Acadêmico)',
      email: 'paloma@unifap.br',
      passwordHash: defaultPassword,
      role: Role.ACADEMIC_SUPPORT,
      mustChangePassword: true,
    },
  });

  console.log('✅ Usuários verificados/criados com troca obrigatória de senha no primeiro acesso.');

  // 3. Configurações de Turno Padrão (Idempotente)
  const defaultShifts = [
    {
      shift: Shift.MORNING,
      startTime: '07:00',
      endTime: '12:00',
      label: 'Manhã',
      emoji: '🌅',
      orderIndex: 1,
    },
    {
      shift: Shift.AFTERNOON,
      startTime: '12:00',
      endTime: '18:00',
      label: 'Tarde',
      emoji: '☀️',
      orderIndex: 2,
    },
    {
      shift: Shift.NIGHT,
      startTime: '18:00',
      endTime: '22:30',
      label: 'Noite',
      emoji: '🌙',
      orderIndex: 3,
    },
  ];

  for (const s of defaultShifts) {
    const existing = await prisma.shiftConfig.findFirst({ where: { shift: s.shift } });
    if (!existing) {
      await prisma.shiftConfig.create({ data: s });
    }
  }

  console.log('✅ Configurações de turno verificadas/garantidas.');

  // 4. Estrutura do Armário (Portas 1, 2 e 3)
  const porta1 = await prisma.door.upsert({
    where: { code: 'PORTA-1' },
    update: {},
    create: {
      code: 'PORTA-1',
      name: 'Porta 1',
      description: 'Lado esquerdo do armário - Cabos curtos, periféricos e insumos de rede',
      orderIndex: 1,
    },
  });

  const porta2 = await prisma.door.upsert({
    where: { code: 'PORTA-2' },
    update: {},
    create: {
      code: 'PORTA-2',
      name: 'Porta 2',
      description: 'Centro do armário - Cabos longos, adaptadores de vídeo e microfones',
      orderIndex: 2,
    },
  });

  const porta3 = await prisma.door.upsert({
    where: { code: 'PORTA-3' },
    update: {},
    create: {
      code: 'PORTA-3',
      name: 'Porta 3',
      description: 'Lado direito do armário - Projetores, caixas de som, extensões e pilhas',
      orderIndex: 3,
    },
  });

  // Criar / Upsert caixas
  const boxesDefinitions = [
    // Porta 1
    { code: 'C001', name: 'Caixa 001', doorId: porta1.id, description: 'Cabos HDMI 2m e 3m' },
    { code: 'C002', name: 'Caixa 002', doorId: porta1.id, description: 'Cabos VGA e DVI' },
    { code: 'C003', name: 'Caixa 003', doorId: porta1.id, description: 'Cabos de Rede CAT6' },
    { code: 'C004', name: 'Caixa 004', doorId: porta1.id, description: 'Mouses USB e sem fio' },
    { code: 'C005', name: 'Caixa 005', doorId: porta1.id, description: 'Teclados ABNT2' },
    // Porta 2
    { code: 'C010', name: 'Caixa 010', doorId: porta2.id, description: 'Adaptadores USB-C e Thunderbolt' },
    { code: 'C011', name: 'Caixa 011', doorId: porta2.id, description: 'Adaptadores Mini DisplayPort e VGA' },
    { code: 'C012', name: 'Caixa 012', doorId: porta2.id, description: 'Cabos P2, P10 e Áudio Auxiliar' },
    { code: 'C014', name: 'Caixa 014', doorId: porta2.id, description: 'Cabos HDMI 5m' },
    { code: 'C015', name: 'Caixa 015', doorId: porta2.id, description: 'Microfones e Acessórios de Áudio' },
    { code: 'C017', name: 'Caixa 017', doorId: porta2.id, description: 'Cabos HDMI 10m e 15m' },
    { code: 'C019', name: 'Caixa 019', doorId: porta2.id, description: 'Cabos de Força e Fontes Bivolt' },
    // Porta 3
    { code: 'C020', name: 'Caixa 020', doorId: porta3.id, description: 'Pilhas AA e AAA Alcalinas' },
    { code: 'C021', name: 'Caixa 021', doorId: porta3.id, description: 'Extensões e Filtros de Linha' },
    { code: 'C022', name: 'Caixa 022', doorId: porta3.id, description: 'Projetores Epson X49 (Estojo 01)' },
    { code: 'C023', name: 'Caixa 023', doorId: porta3.id, description: 'Projetores Epson FH52 (Estojo 02)' },
    { code: 'C024', name: 'Caixa 024', doorId: porta3.id, description: 'Caixas de Som Portáteis' },
  ];

  const boxesMap = new Map<string, any>();
  for (const b of boxesDefinitions) {
    const box = await prisma.box.upsert({
      where: { code: b.code },
      update: {},
      create: b,
    });
    boxesMap.set(b.code, box);
  }

  console.log('✅ Armário e caixas verificados/garantidos.');

  // 5. Categorias
  const categoriesDef = [
    { name: 'Cabos & Conectividade', slug: 'cabos', description: 'Cabos HDMI, VGA, P2, Rede e Força' },
    { name: 'Adaptadores & Conversores', slug: 'adaptadores', description: 'Adaptadores USB-C, HDMI, DisplayPort e VGA' },
    { name: 'Projetores & Telas', slug: 'projetores', description: 'Projetores multimídia e apresentadores' },
    { name: 'Áudio & Microfones', slug: 'audio', description: 'Microfones sem fio, mesas e caixas acústicas' },
    { name: 'Informática & Periféricos', slug: 'informatica', description: 'Mouses, teclados, webcams e switches' },
    { name: 'Energia & Acessórios', slug: 'energia', description: 'Extensões elétricas, filtros e pilhas' },
  ];

  const categoriesMap = new Map<string, any>();
  for (const c of categoriesDef) {
    const existing = await prisma.category.findFirst({ where: { slug: c.slug } });
    if (existing) {
      categoriesMap.set(c.slug, existing);
    } else {
      const created = await prisma.category.create({ data: c });
      categoriesMap.set(c.slug, created);
    }
  }

  // 6. Carga de Salas de Aula (rooms-seed.json) se a tabela de salas estiver vazia
  const roomCount = await prisma.room.count();
  if (roomCount === 0) {
    const seedPath = path.join(__dirname, 'rooms-seed.json');
    if (fs.existsSync(seedPath)) {
      const rawSeedData = fs.readFileSync(seedPath, 'utf-8');
      const parsedData = JSON.parse(rawSeedData);

      const roomRecords = [];
      const seenNames = new Set<string>();

      for (const r of parsedData.rooms) {
        let uniqueName = r.name.trim();
        if (seenNames.has(uniqueName)) {
          uniqueName = `${uniqueName} (${r.fixedProjectorModel || 'Extra'})`;
        }
        seenNames.add(uniqueName);

        let lastVisit: Date | null = null;
        if (r.lastVisitDate) {
          if (r.lastVisitDate.includes('/')) {
            const parts = r.lastVisitDate.split('/');
            if (parts.length === 3) {
              const year = parseInt(parts[2], 10) < 50 ? 2000 + parseInt(parts[2], 10) : 1900 + parseInt(parts[2], 10);
              lastVisit = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          } else {
            lastVisit = new Date(r.lastVisitDate);
          }
        }

        roomRecords.push({
          name: uniqueName,
          floor: r.floor || null,
          block: 'Bloco Principal',
          active: true,
          fixedProjectorModel: r.fixedProjectorModel || null,
          vgaCableOk: typeof r.vgaCableOk === 'boolean' ? r.vgaCableOk : null,
          hdmiCableOk: typeof r.hdmiCableOk === 'boolean' ? r.hdmiCableOk : null,
          lampHours: typeof r.lampHours === 'number' ? Math.round(r.lampHours) : null,
          lampStatus: r.lampStatus || null,
          lastVisitAt: lastVisit && !isNaN(lastVisit.getTime()) ? lastVisit : null,
        });
      }

      for (const roomData of roomRecords) {
        await prisma.room.create({ data: roomData });
      }
      console.log(`✅ ${roomRecords.length} Salas de aula cadastradas a partir do inventário real.`);
    }
  }

  // 7. Carga de Dados de Demonstração (MOCK DATA)
  // SOMENTE SE EXPLICITAMENTE ATIVADO (SEED_MOCK_DATA="true") E BANCO ESTIVER SEM ITENS
  const shouldSeedMock = process.env.SEED_MOCK_DATA === 'true';
  const itemCount = await prisma.item.count();

  if (shouldSeedMock && itemCount === 0) {
    console.log('📦 Inserindo dados de demonstração de materiais e patrimônios...');

    const catProjetores = categoriesMap.get('projetores');
    const catInformatica = categoriesMap.get('informatica');
    const catCabos = categoriesMap.get('cabos');
    const catAdaptadores = categoriesMap.get('adaptadores');
    const catEnergia = categoriesMap.get('energia');
    const catAudio = categoriesMap.get('audio');

    const itemDatashowFixo = await prisma.item.create({
      data: {
        name: 'Datashow (Projetor fixo em sala)',
        sku: 'SRV-DATASHOW-FIXO',
        categoryId: catProjetores.id,
        itemType: ItemType.MATERIAL,
        logisticsType: ItemLogisticsType.FIXED_IN_ROOM,
        unit: 'UN',
        description: 'Projetor já instalado no teto da sala de aula',
        minStock: 0,
        idealStock: 0,
      },
    });

    const itemDatashowMovel = await prisma.item.create({
      data: {
        name: 'Datashow Móvel (Projetor Portátil)',
        sku: 'EQUIP-PROJ-MOVEL',
        categoryId: catProjetores.id,
        itemType: ItemType.ASSET_EQUIPMENT,
        logisticsType: ItemLogisticsType.MOBILE_STOCK,
        unit: 'UN',
        description: 'Projetor móvel para retirada no armário',
        minStock: 2,
        idealStock: 5,
      },
    });

    const itemNotebook = await prisma.item.create({
      data: {
        name: 'Notebook Dell Core i5 para Aula',
        sku: 'EQUIP-NOTEBOOK-AULA',
        categoryId: catInformatica.id,
        itemType: ItemType.ASSET_EQUIPMENT,
        logisticsType: ItemLogisticsType.MOBILE_STOCK,
        unit: 'UN',
        description: 'Notebook institucional para suporte a aulas',
        minStock: 3,
        idealStock: 8,
      },
    });

    const itemPassadorSlides = await prisma.item.create({
      data: {
        name: 'Passador de Slides Wireless Laser',
        sku: 'MAT-PASSADOR-SLIDES',
        categoryId: catInformatica.id,
        itemType: ItemType.MATERIAL,
        logisticsType: ItemLogisticsType.MOBILE_STOCK,
        unit: 'UN',
        description: 'Apresentador multimídia sem fio',
        minStock: 5,
        idealStock: 15,
      },
    });

    const itemHdmi5m = await prisma.item.create({
      data: {
        name: 'Cabo HDMI 5 metros',
        sku: 'CAB-HDMI-5M',
        categoryId: catCabos.id,
        itemType: ItemType.MATERIAL,
        logisticsType: ItemLogisticsType.MOBILE_STOCK,
        unit: 'UN',
        description: 'Cabo HDMI 5 metros com filtro',
        minStock: 8,
        idealStock: 20,
      },
    });

    const c022 = boxesMap.get('C022');
    const c005 = boxesMap.get('C005');
    const c014 = boxesMap.get('C014');
    const c004 = boxesMap.get('C004');

    if (c014) await prisma.inventory.create({ data: { itemId: itemHdmi5m.id, boxId: c014.id, quantity: 8 } });
    if (c004) await prisma.inventory.create({ data: { itemId: itemPassadorSlides.id, boxId: c004.id, quantity: 7 } });

    if (c022) {
      await prisma.asset.create({
        data: {
          itemId: itemDatashowMovel.id,
          assetTag: '123456',
          serialNumber: 'X49A987654',
          model: 'PowerLite X49 Móvel',
          status: AssetStatus.AVAILABLE,
          currentBoxId: c022.id,
          acquisitionDate: new Date('2024-03-10'),
          acquisitionValue: 3850.00,
          notes: 'Equipamento em perfeito estado',
        },
      });
    }

    if (c005) {
      await prisma.asset.create({
        data: {
          itemId: itemNotebook.id,
          assetTag: 'PAT-NOT-001',
          serialNumber: 'DELL-LAT-7420-01',
          model: 'Latitude 7420 i5 16GB',
          status: AssetStatus.AVAILABLE,
          currentBoxId: c005.id,
          acquisitionDate: new Date('2024-02-15'),
          acquisitionValue: 5200.00,
          notes: 'Notebook institucional para aulas',
        },
      });
    }

    console.log('✅ Dados de demonstração criados com sucesso.');
  }

  // 8. Trilha de Auditoria Inicial Segura
  await prisma.auditLog.create({
    data: {
      userId: rivaldo.id,
      action: 'SYSTEM_SEED',
      entity: 'System',
      details: {
        message: 'Execução de seed idempotente e seguro concluída com sucesso',
        seedVersion: '2.1.0',
        environment: process.env.NODE_ENV || 'production',
      },
    },
  });

  console.log('🎉 SEED FINALIZADO COM SUCESSO!');
  console.log('ℹ️ Usuários administrativos iniciais configurados. Troca obrigatória de senha (mustChangePassword) habilitada.');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
