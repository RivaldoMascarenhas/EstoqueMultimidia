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
  console.log('🌱 Iniciando Seed do Banco de Dados UniFAP...');

  // 1. Limpeza de dados antigos para seed idempotente
  await prisma.auditLog.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.request.deleteMany();
  await prisma.requestSeries.deleteMany();
  await prisma.roomFixedEquipment.deleteMany();
  await prisma.room.deleteMany();
  await prisma.shiftConfig.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.box.deleteMany();
  await prisma.door.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.user.deleteMany();

  // 2. Usuários iniciais com senhas com hash seguro e troca obrigatória no primeiro login
  const seedPasswordRaw = process.env.SEED_DEFAULT_PASSWORD || 'UniFAP@2026';
  const defaultPassword = await bcrypt.hash(seedPasswordRaw, 10);

  const rivaldo = await prisma.user.create({
    data: {
      name: 'Rivaldo Mascarenhas',
      email: 'rivaldo@unifap.br',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
      mustChangePassword: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Rodrigo Gestor',
      email: 'rodrigo@unifap.br',
      passwordHash: defaultPassword,
      role: Role.GESTOR,
      mustChangePassword: true,
    },
  });

  const thomas = await prisma.user.create({
    data: {
      name: 'Thomas Operador',
      email: 'thomas@unifap.br',
      passwordHash: defaultPassword,
      role: Role.OPERADOR,
      mustChangePassword: true,
    },
  });

  const pedro = await prisma.user.create({
    data: {
      name: 'Pedro Operador',
      email: 'pedro@unifap.br',
      passwordHash: defaultPassword,
      role: Role.OPERADOR,
      mustChangePassword: true,
    },
  });

  const paloma = await prisma.user.create({
    data: {
      name: 'Profa. Paloma Morais (Apoio Acadêmico)',
      email: 'paloma@unifap.br',
      passwordHash: defaultPassword,
      role: Role.ACADEMIC_SUPPORT,
      mustChangePassword: true,
    },
  });

  console.log('✅ Usuários cadastrados: Rivaldo (Admin), Rodrigo (Gestor), Thomas (Operador), Pedro (Operador), Paloma (Apoio Acadêmico)');

  // 3. Configurações de Turno Padrão
  await prisma.shiftConfig.createMany({
    data: [
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
    ],
  });

  console.log('✅ Configurações de Turno registradas (Manhã 07:00-12:00, Tarde 12:00-18:00, Noite 18:00-22:30)');

  // 4. Estrutura do Armário (Portas 1, 2 e 3)
  const porta1 = await prisma.door.create({
    data: {
      code: 'PORTA-1',
      name: 'Porta 1',
      description: 'Lado esquerdo do armário - Cabos curtos, periféricos e insumos de rede',
      orderIndex: 1,
    },
  });

  const porta2 = await prisma.door.create({
    data: {
      code: 'PORTA-2',
      name: 'Porta 2',
      description: 'Centro do armário - Cabos longos, adaptadores de vídeo e microfones',
      orderIndex: 2,
    },
  });

  const porta3 = await prisma.door.create({
    data: {
      code: 'PORTA-3',
      name: 'Porta 3',
      description: 'Lado direito do armário - Projetores, caixas de som, extensões e pilhas',
      orderIndex: 3,
    },
  });

  // Criar caixas para Porta 1
  const boxesPorta1 = await Promise.all([
    prisma.box.create({ data: { code: 'C001', name: 'Caixa 001', doorId: porta1.id, description: 'Cabos HDMI 2m e 3m' } }),
    prisma.box.create({ data: { code: 'C002', name: 'Caixa 002', doorId: porta1.id, description: 'Cabos VGA e DVI' } }),
    prisma.box.create({ data: { code: 'C003', name: 'Caixa 003', doorId: porta1.id, description: 'Cabos de Rede CAT6' } }),
    prisma.box.create({ data: { code: 'C004', name: 'Caixa 004', doorId: porta1.id, description: 'Mouses USB e sem fio' } }),
    prisma.box.create({ data: { code: 'C005', name: 'Caixa 005', doorId: porta1.id, description: 'Teclados ABNT2' } }),
  ]);

  // Criar caixas para Porta 2
  const boxesPorta2 = await Promise.all([
    prisma.box.create({ data: { code: 'C010', name: 'Caixa 010', doorId: porta2.id, description: 'Adaptadores USB-C e Thunderbolt' } }),
    prisma.box.create({ data: { code: 'C011', name: 'Caixa 011', doorId: porta2.id, description: 'Adaptadores Mini DisplayPort e VGA' } }),
    prisma.box.create({ data: { code: 'C012', name: 'Caixa 012', doorId: porta2.id, description: 'Cabos P2, P10 e Áudio Auxiliar' } }),
    prisma.box.create({ data: { code: 'C014', name: 'Caixa 014', doorId: porta2.id, description: 'Cabos HDMI 5m' } }),
    prisma.box.create({ data: { code: 'C015', name: 'Caixa 015', doorId: porta2.id, description: 'Microfones e Acessórios de Áudio' } }),
    prisma.box.create({ data: { code: 'C017', name: 'Caixa 017', doorId: porta2.id, description: 'Cabos HDMI 10m e 15m' } }),
    prisma.box.create({ data: { code: 'C019', name: 'Caixa 019', doorId: porta2.id, description: 'Cabos de Força e Fontes Bivolt' } }),
  ]);

  // Criar caixas para Porta 3
  const boxesPorta3 = await Promise.all([
    prisma.box.create({ data: { code: 'C020', name: 'Caixa 020', doorId: porta3.id, description: 'Pilhas AA e AAA Alcalinas' } }),
    prisma.box.create({ data: { code: 'C021', name: 'Caixa 021', doorId: porta3.id, description: 'Extensões e Filtros de Linha' } }),
    prisma.box.create({ data: { code: 'C022', name: 'Caixa 022', doorId: porta3.id, description: 'Projetores Epson X49 (Estojo 01)' } }),
    prisma.box.create({ data: { code: 'C023', name: 'Caixa 023', doorId: porta3.id, description: 'Projetores Epson FH52 (Estojo 02)' } }),
    prisma.box.create({ data: { code: 'C024', name: 'Caixa 024', doorId: porta3.id, description: 'Caixas de Som Portáteis' } }),
  ]);

  console.log('✅ Armário configurado com 3 Portas e 17 Caixas com códigos únicos');

  // 5. Categorias
  const catCabos = await prisma.category.create({
    data: { name: 'Cabos & Conectividade', slug: 'cabos', description: 'Cabos HDMI, VGA, P2, Rede e Força' },
  });
  const catAdaptadores = await prisma.category.create({
    data: { name: 'Adaptadores & Conversores', slug: 'adaptadores', description: 'Adaptadores USB-C, HDMI, DisplayPort e VGA' },
  });
  const catProjetores = await prisma.category.create({
    data: { name: 'Projetores & Telas', slug: 'projetores', description: 'Projetores multimídia e apresentadores' },
  });
  const catAudio = await prisma.category.create({
    data: { name: 'Áudio & Microfones', slug: 'audio', description: 'Microfones sem fio, mesas e caixas acústicas' },
  });
  const catInformatica = await prisma.category.create({
    data: { name: 'Informática & Periféricos', slug: 'informatica', description: 'Mouses, teclados, webcams e switches' },
  });
  const catEnergia = await prisma.category.create({
    data: { name: 'Energia & Acessórios', slug: 'energia', description: 'Extensões elétricas, filtros e pilhas' },
  });

  // 6. Itens de Estoque Quantitativo e Logística de Sala
  const itemDatashowFixo = await prisma.item.create({
    data: {
      name: 'Datashow (Projetor fixo em sala)',
      sku: 'SRV-DATASHOW-FIXO',
      categoryId: catProjetores.id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.FIXED_IN_ROOM,
      unit: 'UN',
      description: 'Projetor já instalado no teto da sala de aula (requer apenas acionamento/teste)',
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
      description: 'Projetor móvel que deve ser retirado do estoque e levado até a sala',
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
      description: 'Notebook institucional para suporte a professores e apresentações',
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
      description: 'Apresentador multimídia sem fio com ponteiro laser',
      minStock: 5,
      idealStock: 15,
    },
  });

  const itemHdmi10m = await prisma.item.create({
    data: {
      name: 'Cabo HDMI 10 metros',
      sku: 'CAB-HDMI-10M',
      categoryId: catCabos.id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: 'UN',
      description: 'Cabo HDMI 2.0 4K 10 metros blindado para auditórios e salas grandes',
      minStock: 5,
      idealStock: 15,
      manufacturer: 'PlusCable',
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
      description: 'Cabo HDMI 1.4 High Speed 5 metros com filtro',
      minStock: 8,
      idealStock: 20,
      manufacturer: 'Vinik',
    },
  });

  const itemHdmi2m = await prisma.item.create({
    data: {
      name: 'Cabo HDMI 2 metros',
      sku: 'CAB-HDMI-2M',
      categoryId: catCabos.id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: 'UN',
      description: 'Cabo HDMI padrão 2m para conexão direta em bancada',
      minStock: 10,
      idealStock: 30,
      manufacturer: 'PlusCable',
    },
  });

  const itemAdaptadorUsbC = await prisma.item.create({
    data: {
      name: 'Adaptador USB-C para HDMI',
      sku: 'ADP-USBC-HDMI',
      categoryId: catAdaptadores.id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: 'UN',
      description: 'Conversor USB Tipo C para saída HDMI fêmea 4K',
      minStock: 5,
      idealStock: 12,
      manufacturer: 'Baseus',
    },
  });

  const itemPilhasAA = await prisma.item.create({
    data: {
      name: 'Pilhas Alcalinas AA (Pack c/ 4)',
      sku: 'ENE-PILHA-AA',
      categoryId: catEnergia.id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: 'CX',
      description: 'Cartela com 4 pilhas alcalinas AA para microfones e passadores',
      minStock: 8,
      idealStock: 25,
      manufacturer: 'Duracell',
    },
  });

  const itemExtensao5m = await prisma.item.create({
    data: {
      name: 'Extensão Elétrica Bivolt 5 metros',
      sku: 'ENE-EXT-5M',
      categoryId: catEnergia.id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: 'UN',
      description: 'Extensão reforçada com 3 tomadas novo padrão NBR',
      minStock: 4,
      idealStock: 10,
      manufacturer: 'Force Line',
    },
  });

  // 7. Inventário Físico nas Caixas
  const c017 = boxesPorta2.find(b => b.code === 'C017')!;
  const c014 = boxesPorta2.find(b => b.code === 'C014')!;
  const c001 = boxesPorta1.find(b => b.code === 'C001')!;
  const c004 = boxesPorta1.find(b => b.code === 'C004')!;
  const c005 = boxesPorta1.find(b => b.code === 'C005')!;
  const c010 = boxesPorta2.find(b => b.code === 'C010')!;
  const c020 = boxesPorta3.find(b => b.code === 'C020')!;
  const c021 = boxesPorta3.find(b => b.code === 'C021')!;
  const c022 = boxesPorta3.find(b => b.code === 'C022')!;
  const c015 = boxesPorta2.find(b => b.code === 'C015')!;

  await prisma.inventory.create({ data: { itemId: itemHdmi10m.id, boxId: c017.id, quantity: 6 } });
  await prisma.inventory.create({ data: { itemId: itemHdmi5m.id, boxId: c014.id, quantity: 8 } });
  await prisma.inventory.create({ data: { itemId: itemHdmi2m.id, boxId: c001.id, quantity: 15 } });
  await prisma.inventory.create({ data: { itemId: itemAdaptadorUsbC.id, boxId: c010.id, quantity: 2 } });
  await prisma.inventory.create({ data: { itemId: itemPilhasAA.id, boxId: c020.id, quantity: 18 } });
  await prisma.inventory.create({ data: { itemId: itemExtensao5m.id, boxId: c021.id, quantity: 6 } });
  await prisma.inventory.create({ data: { itemId: itemPassadorSlides.id, boxId: c004.id, quantity: 7 } });

  // 8. Equipamentos Patrimoniais (Ativos)
  const itemMicSemFio = await prisma.item.create({
    data: {
      name: 'Kit Microfone Sem Fio Duplo Shure BLX288/PG58',
      sku: 'EQUIP-MIC-SHURE',
      categoryId: catAudio.id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: 'UN',
      description: 'Sistema duplo sem fio com 2 transmissores de mão PG58',
      minStock: 1,
      idealStock: 3,
      manufacturer: 'Shure',
      model: 'BLX288/PG58',
    },
  });

  // Ativo 1: Projetor Móvel Disponível
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
      notes: 'Equipamento em perfeito estado de conservação',
    },
  });

  // Ativo 2: Projetor Móvel Emprestado
  await prisma.asset.create({
    data: {
      itemId: itemDatashowMovel.id,
      assetTag: '123457',
      serialNumber: 'X49A987655',
      model: 'PowerLite X49 Móvel',
      status: AssetStatus.LOANED,
      currentBoxId: null,
      acquisitionDate: new Date('2024-03-10'),
      acquisitionValue: 3850.00,
      notes: 'Emprestado para aula magna',
    },
  });

  // Ativo 3: Notebook para Aulas
  const assetNotebook1 = await prisma.asset.create({
    data: {
      itemId: itemNotebook.id,
      assetTag: 'PAT-NOT-001',
      serialNumber: 'DELL-LAT-7420-01',
      model: 'Latitude 7420 i5 16GB',
      status: AssetStatus.AVAILABLE,
      currentBoxId: c005.id,
      acquisitionDate: new Date('2024-02-15'),
      acquisitionValue: 5200.00,
      notes: 'Notebook institucional com Windows 11 e Pacote Office',
    },
  });

  await prisma.asset.create({
    data: {
      itemId: itemNotebook.id,
      assetTag: 'PAT-NOT-002',
      serialNumber: 'DELL-LAT-7420-02',
      model: 'Latitude 7420 i5 16GB',
      status: AssetStatus.AVAILABLE,
      currentBoxId: c005.id,
      acquisitionDate: new Date('2024-02-15'),
      acquisitionValue: 5200.00,
      notes: 'Notebook de reserva para eventos',
    },
  });

  // Ativo 4: Microfone Shure
  const assetMic1 = await prisma.asset.create({
    data: {
      itemId: itemMicSemFio.id,
      assetTag: '123480',
      serialNumber: 'SHU889900',
      model: 'BLX288/PG58',
      status: AssetStatus.AVAILABLE,
      currentBoxId: c015.id,
      acquisitionDate: new Date('2024-05-20'),
      acquisitionValue: 2400.00,
      notes: 'Par de microfones em perfeito estado de funcionamento',
    },
  });

  // 9. Carga do Seed Real de Salas (rooms-seed.json)
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

    console.log(`✅ ${roomRecords.length} Salas de aula cadastradas com sucesso a partir do inventário real!`);
  }

  // 10. Agendamentos de Demonstração para o Dia de Hoje
  const sala1A = await prisma.room.findFirst({ where: { name: '1A' } });
  const sala2N = await prisma.room.findFirst({ where: { name: '2N' } });
  const salaSIMU1B = await prisma.room.findFirst({ where: { name: 'SIMU 1B' } });
  const salaLAB2A = await prisma.room.findFirst({ where: { name: 'LAB 2A' } });

  const today = new Date();
  const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);

  // Solicitação 1: Manhã (08:00 - 10:00) na Sala 1A
  if (sala1A) {
    const startMorning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0);
    const endMorning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);

    await prisma.request.create({
      data: {
        date: dateOnly,
        startTime: startMorning,
        endTime: endMorning,
        shift: Shift.MORNING,
        roomId: sala1A.id,
        professorName: 'Prof. Carlos Eduardo',
        discipline: 'Cálculo Diferencial e Integral I',
        attendanceType: 'Aula Teórica',
        notes: 'Professor solicitou ligar e testar o projetor da sala com antecedência de 15 minutos.',
        status: RequestStatus.PREPARADO,
        origin: RequestOrigin.MANUAL,
        needsReview: false,
        assignedUserId: thomas.id,
        createdById: paloma.id,
        items: {
          create: [
            {
              itemId: itemDatashowFixo.id,
              label: 'Datashow (Projetor fixo em sala 1A)',
              quantity: 1,
              separated: true,
            },
            {
              itemId: itemPassadorSlides.id,
              label: 'Passador de Slides Wireless Laser',
              quantity: 1,
              separated: true,
            },
          ],
        },
      },
    });
  }

  // Solicitação 2: Tarde (14:00 - 16:30) na Sala 2N
  if (sala2N) {
    const startAfternoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0, 0);
    const endAfternoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 30, 0);

    await prisma.request.create({
      data: {
        date: dateOnly,
        startTime: startAfternoon,
        endTime: endAfternoon,
        shift: Shift.AFTERNOON,
        roomId: sala2N.id,
        professorName: 'Profa. Paloma Morais',
        discipline: 'Engenharia de Software Avançada',
        attendanceType: 'Seminário de Apresentação',
        notes: 'Notebook institucional com HDMI + Datashow já instalado na sala 2N.',
        status: RequestStatus.AGENDADO,
        origin: RequestOrigin.MANUAL,
        needsReview: false,
        assignedUserId: pedro.id,
        createdById: paloma.id,
        items: {
          create: [
            {
              itemId: itemNotebook.id,
              assetId: assetNotebook1.id,
              label: 'Notebook Dell Core i5 para Aula',
              quantity: 1,
              separated: false,
            },
            {
              itemId: itemHdmi5m.id,
              label: 'Cabo HDMI 5 metros',
              quantity: 1,
              separated: false,
            },
            {
              itemId: itemDatashowFixo.id,
              label: 'Datashow fixo (Sala 2N)',
              quantity: 1,
              separated: true, // fixo não bloqueia
            },
          ],
        },
      },
    });
  }

  // Solicitação 3: Noite (18:30 - 22:00) na Sala LAB 2A
  if (salaLAB2A) {
    const startNight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 30, 0);
    const endNight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 22, 0, 0);

    await prisma.request.create({
      data: {
        date: dateOnly,
        startTime: startNight,
        endTime: endNight,
        shift: Shift.NIGHT,
        roomId: salaLAB2A.id,
        professorName: 'Prof. Marcos Andrade',
        discipline: 'Laboratório de Redes e Sistemas Distribuídos',
        attendanceType: 'Aula Prática em Laboratório',
        notes: 'Necessário kit de áudio sem fio para gravação da aula.',
        status: RequestStatus.AGENDADO,
        origin: RequestOrigin.MANUAL,
        needsReview: false,
        assignedUserId: null,
        createdById: paloma.id,
        items: {
          create: [
            {
              itemId: itemMicSemFio.id,
              assetId: assetMic1.id,
              label: 'Kit Microfone Sem Fio Shure',
              quantity: 1,
              separated: false,
            },
          ],
        },
      },
    });
  }

  // Solicitação 4: Importação Legada Aguardando Revisão
  if (salaSIMU1B) {
    const startLegado = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0, 0);
    const endLegado = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0, 0);

    await prisma.request.create({
      data: {
        date: dateOnly,
        startTime: startLegado,
        endTime: endLegado,
        shift: Shift.NIGHT,
        roomId: salaSIMU1B.id,
        professorName: 'Prof. Desconhecido (Detectado do Google Calendar)',
        discipline: 'Reserva Google Calendar',
        attendanceType: 'Reserva Legada',
        notes: 'Texto original do evento: "Notebook e Datashow móvel para SIMU 1B". Necessário confirmar com o professor.',
        status: RequestStatus.AGENDADO,
        origin: RequestOrigin.IMPORTADO_LEGADO,
        needsReview: true,
        createdById: rivaldo.id,
        items: {
          create: [
            {
              label: 'Notebook e Datashow (Texto livre importado)',
              quantity: 1,
              separated: false,
            },
          ],
        },
      },
    });
  }

  console.log('✅ Solicitações de atendimento de exemplo para o dia atual criadas!');

  // 11. Trilha de Auditoria Inicial
  await prisma.auditLog.create({
    data: {
      userId: rivaldo.id,
      action: 'SYSTEM_SEED',
      entity: 'System',
      details: {
        message: 'Carga inicial do sistema com módulo de Agenda por Turnos e Salas concluída',
        seedVersion: '2.0.0',
        environment: 'development',
      },
    },
  });

  console.log('🎉 SEED FINALIZADO COM SUCESSO!');
  console.log('----------------------------------------------------');
  console.log('Credenciais de Acesso:');
  console.log('  Rivaldo (ADMIN)            : rivaldo@unifap.br / UniFAP@2026');
  console.log('  Rodrigo (GESTOR)           : rodrigo@unifap.br / UniFAP@2026');
  console.log('  Thomas (OPERADOR)          : thomas@unifap.br  / UniFAP@2026');
  console.log('  Pedro (OPERADOR)           : pedro@unifap.br   / UniFAP@2026');
  console.log('  Paloma (APOIO ACADÊMICO)   : paloma@unifap.br  / UniFAP@2026');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
