import { readSheet } from 'read-excel-file/node';

export interface ParsedSihRow {
  problem_id: string;
  title: string;
  organization: string;
  category: string;
  description: string;
}

const HEADER_ALIASES: Record<keyof ParsedSihRow, string[]> = {
  problem_id: [
    'problem_id',
    'problem id',
    'ps_number',
    'ps number',
    'ps_id',
    'ps id',
    'id',
    'code',
    'statement_id',
  ],
  title: [
    'title',
    'problem_title',
    'problem title',
    'problem_statement_title',
    'problem statement title',
    'topic',
  ],
  organization: ['organization', 'organisation', 'ministry', 'department', 'org', 'agency'],
  category: ['category', 'theme', 'bucket', 'domain', 'type'],
  description: [
    'description',
    'problem_statement',
    'problem statement',
    'details',
    'full_description',
    'full description',
    'statement',
  ],
};

function normalizeHeader(cellValue: unknown): string {
  return String(cellValue ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveField(headerText: string): keyof ParsedSihRow | null {
  const norm = normalizeHeader(headerText);
  if (!norm) return null;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<
    [keyof ParsedSihRow, string[]]
  >) {
    if (aliases.includes(norm)) {
      return field;
    }
  }
  return null;
}

function parseCsvMatrix(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  const clean = csvText.replace(/^\uFEFF/, '');
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const next = clean[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentField += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (ch === '\r' && next === '\n') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      currentRow.push(currentField.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += ch;
    }
  }

  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }
  return rows;
}

function mapMatrixToSihRows(matrix: string[][]): { rows: ParsedSihRow[]; skipped: number } {
  if (matrix.length < 2) {
    throw new Error('Spreadsheet must include a header row and at least one data row.');
  }

  const headerRow = matrix[0];
  const columnMap = new Map<number, keyof ParsedSihRow>();
  headerRow.forEach((cell, idx) => {
    const matched = resolveField(cell);
    if (matched) {
      columnMap.set(idx, matched);
    }
  });

  if (
    !Array.from(columnMap.values()).includes('problem_id') ||
    !Array.from(columnMap.values()).includes('title')
  ) {
    throw new Error(
      'Spreadsheet headers must include at least "problem_id" and "title" (plus optional organization, category, description).'
    );
  }

  const rows: ParsedSihRow[] = [];
  let skipped = 0;

  for (let r = 1; r < matrix.length && rows.length < 1000; r++) {
    const rowCells = matrix[r];
    const entry: Partial<ParsedSihRow> = {};

    for (const [colIdx, field] of columnMap.entries()) {
      entry[field] = (rowCells[colIdx] ?? '').trim();
    }

    const problemId = (entry.problem_id ?? '').slice(0, 40);
    const title = (entry.title ?? '').slice(0, 200);
    if (!problemId || !title) {
      skipped++;
      continue;
    }

    rows.push({
      problem_id: problemId,
      title,
      organization: (entry.organization || 'Government / Industry Partner').slice(0, 160),
      category: (entry.category || 'Software').slice(0, 80),
      description: (entry.description || title).slice(0, 5000),
    });
  }

  if (rows.length === 0) {
    throw new Error('No valid problem rows were found in the uploaded spreadsheet.');
  }

  return { rows, skipped };
}

export async function parseSihSpreadsheet(
  filename: string,
  buffer: Buffer
): Promise<{ rows: ParsedSihRow[]; skipped: number }> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) {
    const matrix = parseCsvMatrix(buffer.toString('utf8'));
    return mapMatrixToSihRows(matrix);
  }

  if (lower.endsWith('.xlsx')) {
    const sheetRows = await readSheet(buffer);
    const matrix = sheetRows
      .map((row) => row.map((cell) => (cell === null || cell === undefined ? '' : String(cell).trim())))
      .filter((row) => row.some((cell) => cell.length > 0));
    return mapMatrixToSihRows(matrix);
  }

  throw new Error('Unsupported file format. Please upload an .xlsx or .csv spreadsheet.');
}
