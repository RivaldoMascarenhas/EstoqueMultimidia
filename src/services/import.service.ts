import { prisma } from "@/lib/prisma";
import { safeAuditLog } from "@/lib/audit";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ParticipantStatus } from "@prisma/client";

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

export class ImportService {
  /**
   * Normalizes header strings (strips accents, spaces, lowercase)
   */
  private static normalizeHeader(header: string): string {
    return header
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  /**
   * Parses file buffer (CSV or XLSX) into standardized objects
   */
  public static parseFile(buffer: Buffer, filename: string): ParsedPersonRow[] {
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
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet);
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

      if (String(name).trim()) {
        rows.push({
          name: String(name).trim(),
          cpf: cpf.length === 11 ? cpf : undefined,
          registration: registration ? String(registration).trim() : undefined,
          email: email ? String(email).trim() : undefined,
          phone: phone ? String(phone).trim() : undefined,
          category: category ? String(category).trim() : undefined,
          notes: notes ? String(notes).trim() : undefined,
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

      try {
        let person: any = null;

        // 1. Try matching by CPF
        if (row.cpf) {
          person = await prisma.person.findUnique({ where: { cpf: row.cpf } });
        }

        // 2. Try matching by Registration
        if (!person && row.registration) {
          person = await prisma.person.findUnique({ where: { registration: row.registration } });
        }

        // 3. Try matching by Email
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
}
