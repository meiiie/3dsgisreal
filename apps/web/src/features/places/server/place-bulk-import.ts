import {
  createPlacesWithScenes,
  getDatabase,
  type CreatedPlacesWithScenesBatch,
} from "@loi-vao/db";

import {
  parsePlaceIntake,
  type PlaceIntakeDraft,
} from "./place-intake";

const maxImportRows = 50;
const requiredHeaders = ["name", "summary", "address", "lng", "lat", "sceneEntryLabel"];

export type PlaceBulkImportDraft = PlaceIntakeDraft & {
  lineNumber: number;
};

export type PlaceBulkImportRowResult =
  | {
      ok: true;
      lineNumber: number;
      draft: PlaceBulkImportDraft;
    }
  | {
      ok: false;
      lineNumber: number;
      errors: string[];
      draft?: Partial<PlaceIntakeDraft>;
    };

export type PlaceBulkImportResult =
  | {
      ok: true;
      persisted: boolean;
      rows: PlaceBulkImportRowResult[];
      summary: PlaceBulkImportSummary;
      created?: CreatedPlacesWithScenesBatch;
    }
  | {
      ok: false;
      persisted: false;
      errors: string[];
      rows: PlaceBulkImportRowResult[];
      summary: PlaceBulkImportSummary;
    };

export type PlaceBulkImportSummary = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
};

export function getSamplePlaceImportCsv() {
  return [
    "name,slug,category,summary,address,city,lng,lat,sceneSlug,sceneTitle,sceneEntryLabel",
    "Phong tro gan cong phu,phong-tro-gan-cong-phu,rental,Phong mau de test bulk import,Canh cong phu,Hai Phong,106.6892,20.8451,phong-tro-gan-cong-phu-v1,Cong vao phong tro,Cong -> hem -> cua phong",
    "Quan an sinh vien,quan-an-sinh-vien,food,Quan an mau gan khu sinh vien,Mat tien duong noi bo,Hai Phong,106.6911,20.8438,quan-an-sinh-vien-v1,Mat tien quan an,Mat tien -> quay -> khu ngoi",
  ].join("\n");
}

export async function importPlacesFromCsv(raw: unknown): Promise<PlaceBulkImportResult> {
  const source = toRecord(raw);
  const csv = readString(source, "csv");
  const dryRun = readBoolean(source, "dryRun");
  const parsed = parsePlaceCsv(csv);

  if (parsed.rows.length === 0) {
    return invalidImport(["CSV cần ít nhất một dòng dữ liệu sau header."], []);
  }

  if (parsed.errors.length > 0) {
    return invalidImport(parsed.errors, parsed.rows);
  }

  const duplicateErrors = findDuplicateLineErrors(parsed.rows);
  const rows = duplicateErrors.size > 0 ? applyDuplicateErrors(parsed.rows, duplicateErrors) : parsed.rows;
  const summary = summarizeRows(rows);

  if (summary.invalidRows > 0) {
    return {
      ok: false,
      persisted: false,
      errors: ["CSV còn dòng chưa hợp lệ. Sửa toàn bộ lỗi trước khi import."],
      rows,
      summary,
    };
  }

  const database = getDatabase();

  if (dryRun || !database) {
    return {
      ok: true,
      persisted: false,
      rows,
      summary,
    };
  }

  try {
    const created = await createPlacesWithScenes(
      database,
      rows.flatMap((row) =>
        row.ok
          ? [
              {
                ...row.draft,
                status: "draft",
                sceneStatus: "draft",
              },
            ]
          : [],
      ),
    );

    return {
      ok: true,
      persisted: true,
      rows,
      summary,
      created,
    };
  } catch {
    return {
      ok: false,
      persisted: false,
      errors: ["Không import được batch. Kiểm tra slug trùng trong PostGIS hoặc kết nối DB."],
      rows,
      summary,
    };
  }
}

export function formDataToPlaceBulkImport(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function parsePlaceCsv(csv: string): { errors: string[]; rows: PlaceBulkImportRowResult[] } {
  const table = parseCsvTable(csv);
  const header = table[0]?.map((cell) => cell.trim());
  const rows: PlaceBulkImportRowResult[] = [];

  if (!header?.length) {
    return { errors: ["CSV cần header."], rows };
  }

  const missingHeaders = requiredHeaders.filter((key) => !header.includes(key));
  const errors = missingHeaders.map((key) => `Thiếu cột bắt buộc: ${key}.`);

  if (table.length - 1 > maxImportRows) {
    errors.push(`CSV tối đa ${maxImportRows} dòng cho local lab.`);
  }

  for (const [index, cells] of table.slice(1, maxImportRows + 1).entries()) {
    const lineNumber = index + 2;

    if (cells.every((cell) => !cell.trim())) {
      continue;
    }

    const rawRow = Object.fromEntries(header.map((key, cellIndex) => [key, cells[cellIndex]?.trim() ?? ""]));
    const parsed = parsePlaceIntake(rawRow);

    if (!parsed.ok) {
      rows.push({
        ok: false,
        lineNumber,
        errors: parsed.errors,
        draft: parsed.draft,
      });
      continue;
    }

    rows.push({
      ok: true,
      lineNumber,
      draft: {
        ...parsed.draft,
        lineNumber,
      },
    });
  }

  return { errors, rows };
}

function parseCsvTable(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows.filter((item) => item.some((value) => value.trim()));
}

function findDuplicateLineErrors(rows: PlaceBulkImportRowResult[]) {
  const slugLines = new Map<string, number[]>();
  const sceneSlugLines = new Map<string, number[]>();
  const lineErrors = new Map<number, string[]>();

  for (const row of rows) {
    if (!row.ok) {
      continue;
    }

    addLine(slugLines, row.draft.slug, row.lineNumber);
    addLine(sceneSlugLines, row.draft.sceneSlug, row.lineNumber);
  }

  addDuplicateLineErrors(lineErrors, slugLines, "Slug địa điểm");
  addDuplicateLineErrors(lineErrors, sceneSlugLines, "Scene slug");

  return lineErrors;
}

function applyDuplicateErrors(
  rows: PlaceBulkImportRowResult[],
  duplicateErrors: Map<number, string[]>,
): PlaceBulkImportRowResult[] {
  return rows.map((row) =>
    row.ok && duplicateErrors.has(row.lineNumber)
      ? {
          ok: false,
          lineNumber: row.lineNumber,
          errors: duplicateErrors.get(row.lineNumber) ?? [],
          draft: row.draft,
        }
      : row,
  );
}

function addLine(target: Map<string, number[]>, key: string, lineNumber: number) {
  target.set(key, [...(target.get(key) ?? []), lineNumber]);
}

function addDuplicateLineErrors(
  lineErrors: Map<number, string[]>,
  target: Map<string, number[]>,
  label: string,
) {
  for (const [key, lines] of target.entries()) {
    if (lines.length <= 1) {
      continue;
    }

    const message = `${label} "${key}" bị trùng trong các dòng ${lines.join(", ")}.`;

    for (const line of lines) {
      lineErrors.set(line, [...(lineErrors.get(line) ?? []), message]);
    }
  }
}

function summarizeRows(rows: PlaceBulkImportRowResult[]): PlaceBulkImportSummary {
  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.ok).length,
    invalidRows: rows.filter((row) => !row.ok).length,
  };
}

function invalidImport(errors: string[], rows: PlaceBulkImportRowResult[]): PlaceBulkImportResult {
  return {
    ok: false,
    persisted: false,
    errors,
    rows,
    summary: summarizeRows(rows),
  };
}

function readString(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value === true || value === "true" || value === "1" || value === "on";
}

function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}
