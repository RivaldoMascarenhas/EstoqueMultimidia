import { PrismaClient, Role, ItemType, AssetStatus, LoanStatus, MovementType, MaintenanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed do Banco de Dados UniFAP...');

  // 1. Limpeza de dados antigos para seed idempotente
  await prisma.auditLog.deleteMany();
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

  // 2. Usuários iniciais com senhas com hash seguro
  const defaultPassword = await bcrypt.hash('UniFAP@2026', 10);

  const rivaldo = await prisma.user.create({
    data: {
      name: 'Rivaldo',
      email: 'rivaldo@unifap.br',
      passwordHash: defaultPassword,
      role: Role.ADMIN,
    },
  });

  const rodrigo = await prisma.user.create({
    data: {
      name: 'Rodrigo',
      email: 'rodrigo@unifap.br',
      passwordHash: defaultPassword,
      role: Role.GESTOR,
    },
  });

  const thomas = await prisma.user.create({
    data: {
      name: 'Thomas',
      email: 'thomas@unifap.br',
      passwordHash: defaultPassword,
      role: Role.OPERADOR,
    },
  });

  const pedro = await prisma.user.create({
    data: {
      name: 'Pedro',
      email: 'pedro@unifap.br',
      passwordHash: defaultPassword,
      role: Role.OPERADOR,
    },
  });

  console.log('✅ Usuários cadastrados: Rivaldo (Admin), Rodrigo (Gestor), Thomas (Operador), Pedro (Operador)');

  // 3. Estrutura do Armário (Portas 1, 2 e 3)
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

  // 4. Categorias
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

  // 5. Itens de Estoque Quantitativo (Material)
  const itemHdmi10m = await prisma.item.create({
    data: {
      name: 'Cabo HDMI 10 metros',
      sku: 'CAB-HDMI-10M',
      categoryId: catCabos.id,
      itemType: ItemType.MATERIAL,
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
      unit: 'UN',
      description: 'Extensão reforçada com 3 tomadas novo padrão NBR',
      minStock: 4,
      idealStock: 10,
      manufacturer: 'Force Line',
    },
  });

  // 6. Inventário Físico nas Caixas
  const c017 = boxesPorta2.find(b => b.code === 'C017')!;
  const c014 = boxesPorta2.find(b => b.code === 'C014')!;
  const c001 = boxesPorta1.find(b => b.code === 'C001')!;
  const c010 = boxesPorta2.find(b => b.code === 'C010')!;
  const c020 = boxesPorta3.find(b => b.code === 'C020')!;
  const c021 = boxesPorta3.find(b => b.code === 'C021')!;
  const c022 = boxesPorta3.find(b => b.code === 'C022')!;
  const c015 = boxesPorta2.find(b => b.code === 'C015')!;

  // HDMI 10m -> 6 unidades na C017 (Normal)
  await prisma.inventory.create({
    data: { itemId: itemHdmi10m.id, boxId: c017.id, quantity: 6 },
  });

  // HDMI 5m -> 8 unidades na C014 (Normal)
  await prisma.inventory.create({
    data: { itemId: itemHdmi5m.id, boxId: c014.id, quantity: 8 },
  });

  // HDMI 2m -> 15 unidades na C001 (Normal)
  await prisma.inventory.create({
    data: { itemId: itemHdmi2m.id, boxId: c001.id, quantity: 15 },
  });

  // Adaptador USB-C -> 2 unidades na C010 (CRÍTICO: min 5, atual 2)
  await prisma.inventory.create({
    data: { itemId: itemAdaptadorUsbC.id, boxId: c010.id, quantity: 2 },
  });

  // Pilhas AA -> 18 caixas na C020
  await prisma.inventory.create({
    data: { itemId: itemPilhasAA.id, boxId: c020.id, quantity: 18 },
  });

  // Extensões -> 6 unidades na C021
  await prisma.inventory.create({
    data: { itemId: itemExtensao5m.id, boxId: c021.id, quantity: 6 },
  });

  // Registrar movimentações iniciais no log de estoque
  await prisma.stockMovement.create({
    data: {
      type: MovementType.ENTRY,
      itemId: itemHdmi10m.id,
      destBoxId: c017.id,
      quantity: 6,
      balanceBefore: 0,
      balanceAfter: 6,
      observation: 'Carga inicial do estoque do setor',
      userId: rivaldo.id,
    },
  });

  await prisma.stockMovement.create({
    data: {
      type: MovementType.ENTRY,
      itemId: itemAdaptadorUsbC.id,
      destBoxId: c010.id,
      quantity: 2,
      balanceBefore: 0,
      balanceAfter: 2,
      observation: 'Estoque baixo - necessária reposição urgente',
      userId: rivaldo.id,
    },
  });

  console.log('✅ Estoque quantitativo e movimentações iniciais registradas');

  // 7. Equipamentos Patrimoniais (Ativos)
  const itemProjetorX49 = await prisma.item.create({
    data: {
      name: 'Projetor Epson PowerLite X49',
      sku: 'EQUIP-PROJ-X49',
      categoryId: catProjetores.id,
      itemType: ItemType.ASSET_EQUIPMENT,
      unit: 'UN',
      description: 'Projetor 3LCD 3600 Lumens XGA com entrada HDMI e VGA',
      minStock: 2,
      idealStock: 5,
      manufacturer: 'Epson',
      model: 'PowerLite X49',
    },
  });

  const itemMicSemFio = await prisma.item.create({
    data: {
      name: 'Kit Microfone Sem Fio Duplo Shure BLX288/PG58',
      sku: 'EQUIP-MIC-SHURE',
      categoryId: catAudio.id,
      itemType: ItemType.ASSET_EQUIPMENT,
      unit: 'UN',
      description: 'Sistema duplo sem fio com 2 transmissores de mão PG58',
      minStock: 1,
      idealStock: 3,
      manufacturer: 'Shure',
      model: 'BLX288/PG58',
    },
  });

  // Ativo 1: Projetor Disponível na Caixa 022
  const assetProjetor1 = await prisma.asset.create({
    data: {
      itemId: itemProjetorX49.id,
      assetTag: '123456',
      serialNumber: 'X49A987654',
      model: 'PowerLite X49',
      status: AssetStatus.AVAILABLE,
      currentBoxId: c022.id,
      acquisitionDate: new Date('2024-03-10'),
      acquisitionValue: 3850.00,
      notes: 'Equipamento em perfeito estado de conservação',
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: assetProjetor1.id,
      action: 'CADASTRADO',
      toStatus: AssetStatus.AVAILABLE,
      toLocation: 'Porta 3 / Caixa 022',
      userId: rivaldo.id,
      userName: rivaldo.name,
      observation: 'Patrimônio tombado e alocado na Caixa 022',
    },
  });

  // Ativo 2: Projetor Emprestado (com data prevista de devolução)
  const assetProjetor2 = await prisma.asset.create({
    data: {
      itemId: itemProjetorX49.id,
      assetTag: '123457',
      serialNumber: 'X49A987655',
      model: 'PowerLite X49',
      status: AssetStatus.LOANED,
      currentBoxId: null,
      acquisitionDate: new Date('2024-03-10'),
      acquisitionValue: 3850.00,
      notes: 'Emprestado para aula magna',
    },
  });

  const loanProjetor2 = await prisma.loan.create({
    data: {
      assetId: assetProjetor2.id,
      borrowerName: 'Prof. João da Silva',
      borrowerEmail: 'joao.silva@unifap.br',
      borrowerPhone: '(96) 98111-2233',
      borrowerDepartment: 'Coordenação de Medicina',
      destination: 'Auditório de Medicina - Sala 203',
      loanDate: new Date('2026-08-10T09:00:00Z'),
      expectedReturnDate: new Date('2026-08-14T18:00:00Z'), // Hoje / Vencendo
      status: LoanStatus.ACTIVE,
      notes: 'Solicitado para defesa de TCC e seminário',
      createdByUserId: rodrigo.id,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: assetProjetor2.id,
      action: 'EMPRESTADO',
      fromStatus: AssetStatus.AVAILABLE,
      toStatus: AssetStatus.LOANED,
      fromLocation: 'Porta 3 / Caixa 022',
      toLocation: 'Auditório de Medicina - Sala 203 (Prof. João)',
      userId: rodrigo.id,
      userName: rodrigo.name,
      observation: 'Empréstimo registrado com sucesso',
    },
  });

  // Ativo 3: Projetor em Manutenção
  const assetProjetor3 = await prisma.asset.create({
    data: {
      itemId: itemProjetorX49.id,
      assetTag: '123458',
      serialNumber: 'X49A987656',
      model: 'PowerLite X49',
      status: AssetStatus.IN_MAINTENANCE,
      currentBoxId: null,
      acquisitionDate: new Date('2023-08-15'),
      acquisitionValue: 3600.00,
      notes: 'Lâmpada queimada durante aula',
    },
  });

  await prisma.maintenance.create({
    data: {
      assetId: assetProjetor3.id,
      issueDescription: 'Lâmpada com vida útil esgotada - necessita troca da lâmpada original e limpeza do filtro',
      entryDate: new Date('2026-08-08T14:00:00Z'),
      status: MaintenanceStatus.IN_PROGRESS,
      serviceProvider: 'Assistência Técnica Especializada Projetores AP',
      cost: 450.00,
      technicalNotes: 'Orçamento aprovado. Aguardando chegada da peça de reposição',
      createdByUserId: rivaldo.id,
    },
  });

  await prisma.assetHistory.create({
    data: {
      assetId: assetProjetor3.id,
      action: 'ENVIADO_MANUTENCAO',
      fromStatus: AssetStatus.DAMAGED,
      toStatus: AssetStatus.IN_MAINTENANCE,
      toLocation: 'Assistência Técnica Especializada',
      userId: rivaldo.id,
      userName: rivaldo.name,
      observation: 'Lâmpada danificada enviada para conserto',
    },
  });

  // Ativo 4: Microfone Shure Disponível na Caixa 015
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

  await prisma.assetHistory.create({
    data: {
      assetId: assetMic1.id,
      action: 'CADASTRADO',
      toStatus: AssetStatus.AVAILABLE,
      toLocation: 'Porta 2 / Caixa 015',
      userId: rivaldo.id,
      userName: rivaldo.name,
      observation: 'Cadastro inicial e teste de RF aprovado',
    },
  });

  console.log('✅ Patrimônio individual (ativos), histórico, empréstimo e manutenção cadastrados');

  // 8. Trilha de Auditoria Inicial
  await prisma.auditLog.create({
    data: {
      userId: rivaldo.id,
      action: 'SYSTEM_SEED',
      entity: 'System',
      details: {
        message: 'Carga inicial do sistema concluída com sucesso',
        seedVersion: '1.0.0',
        environment: 'development',
      },
    },
  });

  console.log('🎉 SEED FINALIZADO COM SUCESSO!');
  console.log('----------------------------------------------------');
  console.log('Credenciais de Acesso Inicial:');
  console.log('  Rivaldo (ADMIN)   : rivaldo@unifap.br / UniFAP@2026');
  console.log('  Rodrigo (GESTOR)  : rodrigo@unifap.br / UniFAP@2026');
  console.log('  Thomas (OPERADOR) : thomas@unifap.br  / UniFAP@2026');
  console.log('  Pedro (OPERADOR)  : pedro@unifap.br   / UniFAP@2026');
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
