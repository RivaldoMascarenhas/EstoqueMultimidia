import { PrismaClient, ItemType, ItemLogisticsType, AssetStatus } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================================");
  console.log("INICIANDO RESET E CARGA DO ACERVO REAL DE MULTIMÍDIA");
  console.log("==========================================================");

  // 1. Preservar Usuários
  const existingUsers = await prisma.user.findMany();
  console.log(`✓ Usuários preservados no sistema: ${existingUsers.length} usuários.`);

  // 2. Limpar dados operacionais e inventário anterior
  console.log("🧹 Limpando dados transacionais e acervo antigo...");
  await prisma.requestTask.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.request.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.assetHistory.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.item.deleteMany();
  await prisma.auditLog.deleteMany();
  console.log("✓ Banco de dados limpo com sucesso!");

  // 3. Garantir Categorias Estruturadas
  console.log("📁 Verificando categorias...");
  const categoriesMap: Record<string, any> = {};

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
    if (existing) {
      categoriesMap[cat.name] = existing;
    } else {
      categoriesMap[cat.name] = await prisma.category.create({ data: cat });
    }
  }

  // 4. Mapear Caixas Organizadoras das 3 Portas
  const boxes = await prisma.box.findMany({ include: { door: true } });
  const getBoxByCode = (code: string) => boxes.find((b) => b.code === code) || boxes[0];

  const c001 = getBoxByCode("C001");
  const c004 = getBoxByCode("C004");
  const c005 = getBoxByCode("C005");
  const c010 = getBoxByCode("C010");
  const c014 = getBoxByCode("C014");
  const c015 = getBoxByCode("C015");
  const c017 = getBoxByCode("C017");
  const c020 = getBoxByCode("C020");
  const c021 = getBoxByCode("C021");
  const c022 = getBoxByCode("C022");
  const c023 = getBoxByCode("C023");
  const c024 = getBoxByCode("C024");

  // 5. Garantir as 53 Salas com seus Equipamentos Fixos
  console.log("🏛️ Sincronizando as 53 salas de aula reais e infraestrutura fixa...");
  const roomsFilePath = path.join(process.cwd(), "prisma", "rooms-seed.json");
  if (fs.existsSync(roomsFilePath)) {
    const roomsFileContent = JSON.parse(fs.readFileSync(roomsFilePath, "utf8"));
    const rooms = roomsFileContent.rooms || [];

    for (const roomData of rooms) {
      const existingRoom = await prisma.room.findUnique({ where: { name: roomData.name } });
      const lastVisit = roomData.lastVisitDate ? new Date(roomData.lastVisitDate) : null;

      if (existingRoom) {
        await prisma.room.update({
          where: { id: existingRoom.id },
          data: {
            floor: roomData.floor,
            fixedProjectorModel: roomData.fixedProjectorModel,
            vgaCableOk: roomData.vgaCableOk,
            hdmiCableOk: roomData.hdmiCableOk,
            lampHours: roomData.lampHours,
            lampStatus: roomData.lampStatus,
            lastVisitAt: lastVisit,
          },
        });
      } else {
        await prisma.room.create({
          data: {
            name: roomData.name,
            floor: roomData.floor,
            fixedProjectorModel: roomData.fixedProjectorModel,
            vgaCableOk: roomData.vgaCableOk,
            hdmiCableOk: roomData.hdmiCableOk,
            lampHours: roomData.lampHours,
            lampStatus: roomData.lampStatus,
            lastVisitAt: lastVisit,
          },
        });
      }
    }
    console.log(`✓ ${rooms.length} salas de aula sincronizadas com dados de infraestrutura fixa.`);
  }

  // =========================================================================
  // 6. CADASTRO DO ACERVO REAL DE MULTIMÍDIA
  // =========================================================================
  console.log("📦 Cadastrando equipamentos patrimoniais e catálogo real...");

  // -------------------------------------------------------------------------
  // A. 2x Datashow Epson PowerLite S41+ (Empréstimo e Móvel)
  // -------------------------------------------------------------------------
  const itemDatashowS41 = await prisma.item.create({
    data: {
      name: "Datashow Móvel Epson PowerLite S41+",
      sku: "EQUIP-DATA-EPSON-S41P",
      categoryId: categoriesMap["Projetores & Telas"].id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Projetor multimídia móvel Epson PowerLite S41+ 3300 lumens SVGA HDMI/VGA para empréstimo e suporte em salas",
      minStock: 1,
      idealStock: 2,
      manufacturer: "Epson",
    },
  });

  const datashowsData = [
    { tag: "001001", serial: "X49A987654", model: "PowerLite S41+", notes: "Datashow móvel em perfeito estado de conservação" },
    { tag: "001002", serial: "X49A987655", model: "PowerLite S41+", notes: "Datashow móvel com cabos HDMI e força na bolsa" },
  ];

  for (const ds of datashowsData) {
    await prisma.asset.create({
      data: {
        itemId: itemDatashowS41.id,
        assetTag: ds.tag,
        serialNumber: ds.serial,
        model: ds.model,
        status: AssetStatus.AVAILABLE,
        currentBoxId: c022.id,
        acquisitionDate: new Date("2024-02-15"),
        acquisitionValue: 3890.0,
        notes: ds.notes,
      },
    });
  }
  console.log("✓ 2 Datashows Epson S41+ cadastrados como patrimônio (#001001, #001002).");

  // -------------------------------------------------------------------------
  // B. 50x Chromebooks Educacionais
  // -------------------------------------------------------------------------
  const itemChromebook = await prisma.item.create({
    data: {
      name: "Chromebook Institucional Educacional",
      sku: "EQUIP-CHROMEBOOK-EDU",
      categoryId: categoriesMap["Informática & Periféricos"].id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Chromebook institucional educacional para uso em salas de aula, pesquisas e atividades pedagógicas",
      minStock: 10,
      idealStock: 50,
      manufacturer: "Samsung / Lenovo",
    },
  });

  for (let i = 1; i <= 50; i++) {
    const numStr = String(i).padStart(3, "0");
    await prisma.asset.create({
      data: {
        itemId: itemChromebook.id,
        assetTag: `CHB-${numStr}`,
        serialNumber: `CHB-EDU-SN${numStr}`,
        model: "Chromebook 11.6 HD",
        status: AssetStatus.AVAILABLE,
        currentBoxId: c005.id, // Armário Móvel / Caixa C005
        acquisitionDate: new Date("2024-04-10"),
        acquisitionValue: 1850.0,
        notes: `Chromebook educacional #${numStr} configurado com conta institucional`,
      },
    });
  }
  console.log("✓ 50 Chromebooks cadastrados como patrimônio (#CHB-001 a #CHB-050).");

  // -------------------------------------------------------------------------
  // C. 3x Notebooks Dell Vostro 3401
  // -------------------------------------------------------------------------
  const itemNotebookDell = await prisma.item.create({
    data: {
      name: "Notebook Dell Vostro 3401",
      sku: "EQUIP-NOT-DELL-3401",
      categoryId: categoriesMap["Informática & Periféricos"].id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Notebook institucional Dell Vostro 3401 Intel Core i5 8GB RAM SSD 256GB para suporte a apresentações e aulas",
      minStock: 1,
      idealStock: 3,
      manufacturer: "Dell",
    },
  });

  const notebooksDell = [
    { tag: "NOT-001", serial: "DELL-VOS-001", model: "Vostro 3401 Core i5" },
    { tag: "NOT-002", serial: "DELL-VOS-002", model: "Vostro 3401 Core i5" },
    { tag: "NOT-003", serial: "DELL-VOS-003", model: "Vostro 3401 Core i5" },
  ];

  for (const not of notebooksDell) {
    await prisma.asset.create({
      data: {
        itemId: itemNotebookDell.id,
        assetTag: not.tag,
        serialNumber: not.serial,
        model: not.model,
        status: AssetStatus.AVAILABLE,
        currentBoxId: c005.id,
        acquisitionDate: new Date("2024-01-20"),
        acquisitionValue: 3450.0,
        notes: "Notebook Dell Vostro 3401 com Windows 11, Office e carregador original",
      },
    });
  }
  console.log("✓ 3 Notebooks Dell Vostro 3401 cadastrados como patrimônio (#NOT-001 a #NOT-003).");

  // -------------------------------------------------------------------------
  // D. 4x Caixas de Som JBL MAX 15
  // -------------------------------------------------------------------------
  const itemJblMax15 = await prisma.item.create({
    data: {
      name: "Caixa de Som Ativa JBL MAX 15",
      sku: "EQUIP-SOM-JBL-MAX15",
      categoryId: categoriesMap["Áudio & Microfones"].id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Caixa acústica amplificada profissional JBL MAX 15 350W RMS Woofer 15 polegadas Bluetooth para auditórios e eventos",
      minStock: 1,
      idealStock: 4,
      manufacturer: "JBL",
    },
  });

  for (let i = 1; i <= 4; i++) {
    const numStr = String(i).padStart(3, "0");
    await prisma.asset.create({
      data: {
        itemId: itemJblMax15.id,
        assetTag: `JBL-${numStr}`,
        serialNumber: `JBL-MAX15-SN${numStr}`,
        model: "MAX 15 (350W RMS 15\")",
        status: AssetStatus.AVAILABLE,
        currentBoxId: c024.id,
        acquisitionDate: new Date("2024-03-01"),
        acquisitionValue: 2890.0,
        notes: "Caixa JBL MAX 15 com cabo de força e suporte para tripé",
      },
    });
  }
  console.log("✓ 4 Caixas de Som JBL MAX 15 cadastradas como patrimônio (#JBL-001 a #JBL-004).");

  // -------------------------------------------------------------------------
  // E. 4x Caixas de Som Mondial CM-250 / CM-250B (Preto, 127/220V)
  // -------------------------------------------------------------------------
  const itemMondialCm250 = await prisma.item.create({
    data: {
      name: "Caixa Amplificada Mondial CM-250B",
      sku: "EQUIP-SOM-MONDIAL-CM250B",
      categoryId: categoriesMap["Áudio & Microfones"].id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Marca: Mondial | Modelo: CM-250 | Modelo Detalhado: CM-250B | Cor: Preto | Voltagem: 127/220V Bivolt | Potência: 250W RMS com Bluetooth, USB e entrada para microfone",
      minStock: 1,
      idealStock: 4,
      manufacturer: "Mondial",
    },
  });

  for (let i = 1; i <= 4; i++) {
    const numStr = String(i).padStart(3, "0");
    await prisma.asset.create({
      data: {
        itemId: itemMondialCm250.id,
        assetTag: `MON-${numStr}`,
        serialNumber: `MON-CM250B-SN${numStr}`,
        model: "CM-250B Preto Bivolt (250W)",
        status: AssetStatus.AVAILABLE,
        currentBoxId: c023.id,
        acquisitionDate: new Date("2024-03-15"),
        acquisitionValue: 499.0,
        notes: "Marca: Mondial • Modelo: CM-250 (Detalhado: CM-250B) • Cor: Preto • Voltagem: 127/220V • Cabo de energia incluso",
      },
    });
  }
  console.log("✓ 4 Caixas Mondial CM-250B Bivolt Preto cadastradas como patrimônio (#MON-001 a #MON-004).");

  // -------------------------------------------------------------------------
  // F. 7x Microfones Sem Fio
  // -------------------------------------------------------------------------
  const itemMicSemFio = await prisma.item.create({
    data: {
      name: "Kit Microfone Sem Fio",
      sku: "EQUIP-MIC-SEM-FIO",
      categoryId: categoriesMap["Áudio & Microfones"].id,
      itemType: ItemType.ASSET_EQUIPMENT,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Kit microfone de mão sem fio UHF com transmissor, receptor de bancada e fonte de energia",
      minStock: 2,
      idealStock: 7,
      manufacturer: "Shure / Kadosh",
    },
  });

  for (let i = 1; i <= 7; i++) {
    const numStr = String(i).padStart(3, "0");
    await prisma.asset.create({
      data: {
        itemId: itemMicSemFio.id,
        assetTag: `MIC-${numStr}`,
        serialNumber: `MIC-UHF-SN${numStr}`,
        model: "Sem Fio UHF c/ Base",
        status: AssetStatus.AVAILABLE,
        currentBoxId: c015.id,
        acquisitionDate: new Date("2024-02-10"),
        acquisitionValue: 850.0,
        notes: "Kit microfone sem fio com bastão, receptor, cabo P10 e fonte de alimentação",
      },
    });
  }
  console.log("✓ 7 Microfones Sem Fio cadastrados como patrimônio (#MIC-001 a #MIC-007).");

  // -------------------------------------------------------------------------
  // G. 14 Pares de Pilha (Material Quantitativo)
  // -------------------------------------------------------------------------
  const itemPilhas = await prisma.item.create({
    data: {
      name: "Pares de Pilhas AA / AAA Alcalinas",
      sku: "MAT-PILHAS-PARES",
      categoryId: categoriesMap["Energia & Acessórios"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "PAR",
      description: "Pares de pilhas AA e AAA para microfones sem fio e passadores de slides",
      minStock: 4,
      idealStock: 20,
      manufacturer: "Duracell / Elgin",
    },
  });

  await prisma.inventory.create({
    data: {
      itemId: itemPilhas.id,
      boxId: c020.id,
      quantity: 14, // 14 pares
    },
  });
  console.log("✓ 14 pares de pilhas cadastrados no armário (Caixa C020).");

  // -------------------------------------------------------------------------
  // H. Cabos & Acessórios Complementares de Suporte
  // -------------------------------------------------------------------------
  const itemHdmi2m = await prisma.item.create({
    data: {
      name: "Cabo HDMI 2 metros",
      sku: "CAB-HDMI-2M",
      categoryId: categoriesMap["Cabos & Conectividade"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Cabo HDMI padrão 2m para conexão direta de notebooks em salas",
      minStock: 5,
      idealStock: 20,
    },
  });
  await prisma.inventory.create({ data: { itemId: itemHdmi2m.id, boxId: c001.id, quantity: 15 } });

  const itemHdmi5m = await prisma.item.create({
    data: {
      name: "Cabo HDMI 5 metros",
      sku: "CAB-HDMI-5M",
      categoryId: categoriesMap["Cabos & Conectividade"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Cabo HDMI 5m para mesas e bancadas afastadas",
      minStock: 4,
      idealStock: 10,
    },
  });
  await prisma.inventory.create({ data: { itemId: itemHdmi5m.id, boxId: c014.id, quantity: 8 } });

  const itemHdmi10m = await prisma.item.create({
    data: {
      name: "Cabo HDMI 10 metros",
      sku: "CAB-HDMI-10M",
      categoryId: categoriesMap["Cabos & Conectividade"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Cabo HDMI 10m para auditórios e eventos",
      minStock: 2,
      idealStock: 8,
    },
  });
  await prisma.inventory.create({ data: { itemId: itemHdmi10m.id, boxId: c017.id, quantity: 6 } });

  const itemAdaptadorUsbC = await prisma.item.create({
    data: {
      name: "Adaptador USB-C para HDMI",
      sku: "ADP-USBC-HDMI",
      categoryId: categoriesMap["Adaptadores & Conversores"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Adaptador USB Type-C para HDMI 4K para MacBooks e notebooks modernos",
      minStock: 2,
      idealStock: 6,
    },
  });
  await prisma.inventory.create({ data: { itemId: itemAdaptadorUsbC.id, boxId: c010.id, quantity: 4 } });

  const itemPassadorSlides = await prisma.item.create({
    data: {
      name: "Passador de Slides Wireless Laser",
      sku: "MAT-PASSADOR-SLIDES",
      categoryId: categoriesMap["Informática & Periféricos"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Apresentador multimídia sem fio com ponteiro laser",
      minStock: 2,
      idealStock: 8,
    },
  });
  await prisma.inventory.create({ data: { itemId: itemPassadorSlides.id, boxId: c004.id, quantity: 6 } });

  const itemExtensao = await prisma.item.create({
    data: {
      name: "Extensão Elétrica 5m / 10m Reforçada",
      sku: "MAT-EXTENSAO-ELETRICA",
      categoryId: categoriesMap["Energia & Acessórios"].id,
      itemType: ItemType.MATERIAL,
      logisticsType: ItemLogisticsType.MOBILE_STOCK,
      unit: "UN",
      description: "Extensão elétrica tripilar padrão NBR para ligação de caixas de som e projetores",
      minStock: 2,
      idealStock: 8,
    },
  });
  await prisma.inventory.create({ data: { itemId: itemExtensao.id, boxId: c021.id, quantity: 6 } });

  console.log("✓ Cabos e insumos de apoio cadastrados no estoque físico.");

  console.log("==========================================================");
  console.log("RESET E CARGA CONCLUÍDOS COM SUCESSO!");
  console.log("Total de Patrimônios (Ativos Físicos): 70 equipamentos:");
  console.log("  • 2 Datashows Epson S41+ móveis");
  console.log("  • 50 Chromebooks educacionais");
  console.log("  • 3 Notebooks Dell Vostro 3401");
  console.log("  • 4 Caixas de Som JBL MAX 15");
  console.log("  • 4 Caixas Mondial CM-250B Bivolt Preto");
  console.log("  • 7 Microfones Sem Fio");
  console.log("  • 14 Pares de Pilha + Cabos HDMI e Adaptadores");
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("Erro durante a execução do reset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
