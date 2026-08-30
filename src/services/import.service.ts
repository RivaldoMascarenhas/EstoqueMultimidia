import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import path from "path";
import { ParticipantStatus } from "@prisma/client";
import { BiometricApiService } from "@/services/biometric-api.service";

export interface ParsedPersonRow {
  name: string;
  cpf?: string;
  registration?: string;
  email?: string;
  phone?: string;
  category?: string;
  notes?: string;
  ticketNumber?: number;
}

export interface ImportResult {
  totalRows: number;
  createdPersons: number;
  updatedPersons: number;
  enrolledInEvent: number;
  errors: Array<{ row: number; error: string; data?: any }>;
}

export interface ZipImportResult extends ImportResult {
  totalPhotos: number;
  photosEnrolled: number;
  photoErrors: Array<{ filename: string; error: string }>;
}

export class ImportService {
  /**
   * Normalizes header strings (strips accents, spaces, lowercase)
   */
  private static normalizeHeader(header: string): string {
    return header
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  /**
   * Sanitizes string fields to prevent CSV / Formula Injection (CWE-1236)
   */
  public static sanitizeField(value: any): string {
    if (value === null || value === undefined) return "";
    let str = String(value).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      // Remove or neutralize the dangerous prefix
      str = str.replace(/^[=+\-@\t\r]+/, "");
    }
    return str;
  }

  /**
   * Parses file buffer (CSV or XLSX) into standardized objects using ExcelJS
   */
  public static async parseFile(buffer: Buffer, filename: string): Promise<ParsedPersonRow[]> {
    const isCsv = filename.toLowerCase().endsWith(".csv");
    let rawRows: any[] = [];

    if (isCsv) {
      const content = buffer.toString("utf-8");
      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
      });
      rawRows = parsed.data;
    } else {
      const workbook = new ExcelJS.Workbook();
      await (workbook.xlsx as any).load(buffer);
      const worksheet = workbook.worksheets[0];
      if (worksheet) {
        const headers: string[] = [];
        worksheet.getRow(1).eachCell((cell: ExcelJS.Cell, colNumber: number) => {
          headers[colNumber] = String(cell.value || "").trim();
        });

        worksheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
          if (rowNumber === 1) return;
          const rowObj: Record<string, any> = {};
          row.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
            const header = headers[colNumber];
            if (header) {
              rowObj[header] = cell.value;
            }
          });
          if (Object.keys(rowObj).length > 0) {
            rawRows.push(rowObj);
          }
        });
      }
    }

    const rows: ParsedPersonRow[] = [];

    for (const raw of rawRows) {
      const normalizedRow: Record<string, any> = {};
      for (const [key, value] of Object.entries(raw)) {
        normalizedRow[this.normalizeHeader(key)] = value;
      }

      // Map variations of column names
      const name =
        normalizedRow["nome"] ||
        normalizedRow["name"] ||
        normalizedRow["nomecompleto"] ||
        normalizedRow["participante"] ||
        "";

      const cpfRaw =
        normalizedRow["cpf"] ||
        normalizedRow["documento"] ||
        normalizedRow["doc"] ||
        "";
      const cpf = String(cpfRaw).replace(/\D/g, "");

      const registration =
        normalizedRow["matricula"] ||
        normalizedRow["registration"] ||
        normalizedRow["cod"] ||
        normalizedRow["codigo"] ||
        normalizedRow["ra"] ||
        "";

      const email =
        normalizedRow["email"] ||
        normalizedRow["e-mail"] ||
        normalizedRow["correio"] ||
        "";

      const phone =
        normalizedRow["telefone"] ||
        normalizedRow["celular"] ||
        normalizedRow["whatsapp"] ||
        normalizedRow["phone"] ||
        "";

      const category =
        normalizedRow["categoria"] ||
        normalizedRow["category"] ||
        normalizedRow["tipo"] ||
        normalizedRow["curso"] ||
        "";

      const notes =
        normalizedRow["observacao"] ||
        normalizedRow["observacoes"] ||
        normalizedRow["obs"] ||
        normalizedRow["notes"] ||
        "";

      const ticketNumber =
        normalizedRow["numero"] ||
        normalizedRow["ticket"] ||
        normalizedRow["bilhete"] ||
        normalizedRow["ticketnumber"] ||
        undefined;

      const cleanName = this.sanitizeField(name);
      const cleanReg = this.sanitizeField(registration);
      const cleanEmail = this.sanitizeField(email);
      const cleanPhone = this.sanitizeField(phone);
      const cleanCat = this.sanitizeField(category);
      const cleanNotes = this.sanitizeField(notes);

      if (cleanName) {
        rows.push({
          name: cleanName,
          cpf: cpf.length === 11 ? cpf : undefined,
          registration: cleanReg || undefined,
          email: cleanEmail || undefined,
          phone: cleanPhone || undefined,
          category: cleanCat || undefined,
          notes: cleanNotes || undefined,
          ticketNumber: typeof ticketNumber === "number" ? ticketNumber : undefined,
        });
      }
    }

    return rows;
  }

  /**
   * Processes parsed rows in batches, creating/updating Persons and linking to Event
   */
  public static async processImport(params: {
    rows: ParsedPersonRow[];
    eventId?: string | null;
    operatorUserId?: string | null;
  }): Promise<ImportResult> {
    const { rows, eventId, operatorUserId } = params;
    const result: ImportResult = {
      totalRows: rows.length,
      createdPersons: 0,
      updatedPersons: 0,
      enrolledInEvent: 0,
      errors: [],
    };

    let nextTicketNumber = 1;
    if (eventId) {
      const highest = await prisma.eventParticipant.findFirst({
        where: { eventId },
        orderBy: { ticketNumber: "desc" },
        select: { ticketNumber: true },
      });
      nextTicketNumber = (highest?.ticketNumber || 0) + 1;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // 1. Validação estrita de campos obrigatórios
      if (!row.name || row.name.trim().length < 2) {
        result.errors.push({
          row: rowNum,
          error: "O campo 'Nome' é obrigatório e deve ter no mínimo 2 caracteres.",
          data: row,
        });
        continue;
      }

      if (!row.category || row.category.trim().length === 0) {
        result.errors.push({
          row: rowNum,
          error: "O campo 'Categoria' é obrigatório (ex: Aluno, Professor, Técnico, Visitante).",
          data: row,
        });
        continue;
      }

      const hasReg = Boolean(row.registration && row.registration.trim().length > 0);
      const hasCpf = Boolean(row.cpf && row.cpf.trim().length === 11);

      if (!hasReg && !hasCpf) {
        result.errors.push({
          row: rowNum,
          error: "Obrigatório informar ao menos a 'Matrícula' ou o 'CPF' para identificação única da pessoa.",
          data: row,
        });
        continue;
      }

      try {
        let person: any = null;

        // 1. Tentar encontrar por CPF
        if (row.cpf) {
          person = await prisma.person.findUnique({ where: { cpf: row.cpf } });
        }

        // 2. Tentar encontrar por Matrícula
        if (!person && row.registration) {
          person = await prisma.person.findUnique({ where: { registration: row.registration } });
        }

        // 3. Tentar encontrar por Email
        if (!person && row.email) {
          person = await prisma.person.findFirst({
            where: { email: { equals: row.email, mode: "insensitive" } },
          });
        }

        // 4. Update or Create Person
        if (person) {
          person = await prisma.person.update({
            where: { id: person.id },
            data: {
              name: row.name || person.name,
              cpf: row.cpf || person.cpf,
              registration: row.registration || person.registration,
              email: row.email || person.email,
              phone: row.phone || person.phone,
              category: row.category || person.category,
              notes: row.notes || person.notes,
            },
          });
          result.updatedPersons++;
        } else {
          person = await prisma.person.create({
            data: {
              name: row.name,
              cpf: row.cpf || null,
              registration: row.registration || null,
              email: row.email || null,
              phone: row.phone || null,
              category: row.category || null,
              notes: row.notes || null,
              active: true,
            },
          });
          result.createdPersons++;
        }

        // 5. Link to Event if eventId provided
        if (eventId && person) {
          const existingParticipant = await prisma.eventParticipant.findUnique({
            where: {
              eventId_personId: { eventId, personId: person.id },
            },
          });

          if (!existingParticipant) {
            const ticket = row.ticketNumber || nextTicketNumber++;
            await prisma.eventParticipant.create({
              data: {
                eventId,
                personId: person.id,
                ticketNumber: ticket,
                category: row.category || person.category || null,
                status: ParticipantStatus.ACTIVE,
                isEligible: true,
              },
            });
            result.enrolledInEvent++;
          }
        }
      } catch (err: any) {
        result.errors.push({
          row: rowNum,
          error: err.message || "Erro desconhecido ao processar linha",
          data: row,
        });
      }
    }

    await safeAuditLog({
      userId: operatorUserId,
      action: "BATCH_IMPORT_PERSONS",
      entity: "Person",
      details: {
        totalRows: result.totalRows,
        created: result.createdPersons,
        updated: result.updatedPersons,
        enrolledInEvent: result.enrolledInEvent,
        errorsCount: result.errors.length,
        eventId,
      },
    });

    return result;
  }

  /**
   * Processes a ZIP package containing photos (and optional embedded spreadsheet)
   */
  public static async processZipPackage(params: {
    buffer: Buffer;
    eventId?: string | null;
    operatorUserId?: string | null;
  }): Promise<ZipImportResult> {
    const { buffer, eventId, operatorUserId } = params;
    const loadedZip = await JSZip.loadAsync(buffer);

    let spreadsheetFile: { name: string; buffer: Buffer } | null = null;
    const imageFiles: Array<{ name: string; buffer: Buffer }> = [];

    for (const [relativePath, fileRaw] of Object.entries(loadedZip.files)) {
      const file = fileRaw as JSZip.JSZipObject;
      if (file.dir) continue;
      const lower = relativePath.toLowerCase();

      // Ignora arquivos de sistema
      if (lower.includes("__macosx") || lower.endsWith(".ds_store") || lower.startsWith(".")) continue;

      if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const fileBuf = await file.async("nodebuffer");
        spreadsheetFile = { name: relativePath, buffer: fileBuf };
      } else if (
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".png") ||
        lower.endsWith(".webp")
      ) {
        const fileBuf = await file.async("nodebuffer");
        imageFiles.push({ name: relativePath, buffer: fileBuf });
      }
    }

    let importResult: ImportResult = {
      totalRows: 0,
      createdPersons: 0,
      updatedPersons: 0,
      enrolledInEvent: 0,
      errors: [],
    };

    // 1. Processa planilha inclusa no ZIP (se houver)
    if (spreadsheetFile) {
      const parsedRows = await this.parseFile(spreadsheetFile.buffer, spreadsheetFile.name);
      importResult = await this.processImport({
        rows: parsedRows,
        eventId,
        operatorUserId,
      });
    }

    const zipResult: ZipImportResult = {
      ...importResult,
      totalPhotos: imageFiles.length,
      photosEnrolled: 0,
      photoErrors: [],
    };

    // 2. Processa cada foto e vincula à pessoa correspondente
    for (const img of imageFiles) {
      const baseFilename = path.basename(img.name);
      const nameWithoutExt = baseFilename.substring(0, baseFilename.lastIndexOf(".")).trim();
      const cleanNumeric = nameWithoutExt.replace(/\D/g, "");

      try {
        let person: any = null;

        // A) Tenta casar por Matrícula
        person = await prisma.person.findUnique({
          where: { registration: nameWithoutExt },
        });

        // B) Tenta casar por CPF (11 dígitos)
        if (!person && cleanNumeric.length === 11) {
          person = await prisma.person.findUnique({
            where: { cpf: cleanNumeric },
          });
        }

        // C) Tenta casar por E-mail
        if (!person && nameWithoutExt.includes("@")) {
          person = await prisma.person.findFirst({
            where: { email: { equals: nameWithoutExt, mode: "insensitive" } },
          });
        }

        // D) Tenta casar por Nome Exato
        if (!person && nameWithoutExt.length >= 3) {
          const formattedName = nameWithoutExt.replace(/[_\-]+/g, " ");
          person = await prisma.person.findFirst({
            where: { name: { equals: formattedName, mode: "insensitive" } },
          });
        }

        if (!person) {
          zipResult.photoErrors.push({
            filename: baseFilename,
            error: `Nenhuma pessoa encontrada com Matrícula ou CPF '${nameWithoutExt}'.`,
          });
          continue;
        }

        // Converte o buffer da foto para Blob e envia para o serviço biométrico
        const ext = baseFilename.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        const blob = new Blob([new Uint8Array(img.buffer)], { type: mimeType });

        await BiometricApiService.enrollFace({
          personId: person.id,
          imageBlob: blob,
          isCrop: false,
          operatorUserId,
        });

        // Salva photoUrl como base64 data URI para exibição visual imediata
        const base64Data = `data:${mimeType};base64,${img.buffer.toString("base64")}`;
        await prisma.person.update({
          where: { id: person.id },
          data: { photoUrl: base64Data },
        });

        zipResult.photosEnrolled++;
      } catch (err: any) {
        zipResult.photoErrors.push({
          filename: baseFilename,
          error: err.message || "Erro ao processar biometria facial.",
        });
      }
    }

    await safeAuditLog({
      userId: operatorUserId,
      action: "BATCH_IMPORT_ZIP_PACKAGE",
      entity: "Person",
      details: {
        totalPhotos: zipResult.totalPhotos,
        photosEnrolled: zipResult.photosEnrolled,
        photoErrorsCount: zipResult.photoErrors.length,
        createdPersons: zipResult.createdPersons,
        updatedPersons: zipResult.updatedPersons,
        eventId,
      },
    });

    return zipResult;
  }
}
