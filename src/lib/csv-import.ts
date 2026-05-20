// Parser para CSVs do Nubank (conta e cartão).

export type ParsedRow = {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // positivo
  type: 'receita' | 'despesa';
  source: 'conta' | 'cartao';
};

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === sep && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectSeparator(header: string): string {
  const semi = (header.match(/;/g) || []).length;
  const comma = (header.match(/,/g) || []).length;
  return semi > comma ? ';' : ',';
}

function parseDateBR(s: string): string | null {
  // dd/mm/yyyy → yyyy-mm-dd
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // yyyy-mm-dd → yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

function parseNumber(s: string): number | null {
  if (!s) return null;
  // remove R$, spaces; handle comma decimal
  const cleaned = s.replace(/[R$\s]/g, '').replace(/\./g, '_dot_').replace(/,/g, '.').replace(/_dot_/g, '');
  // if both . and , exist, the original used . as thousand sep — we removed it above
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function parseCsv(text: string): { rows: ParsedRow[]; errors: string[]; detected: 'conta' | 'cartao' | 'unknown' } {
  const errors: string[] = [];
  const cleanText = text.replace(/﻿/, ''); // strip BOM
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { rows: [], errors: ['CSV vazio ou sem linhas de dados'], detected: 'unknown' };

  const sep = detectSeparator(lines[0]);
  const header = splitCsvLine(lines[0], sep).map((h) => h.toLowerCase().trim());

  // Conta: Data, Valor, Identificador, Descrição
  // Cartão: date, title, amount
  let source: 'conta' | 'cartao' | 'unknown' = 'unknown';
  let dateIdx = -1, valIdx = -1, descIdx = -1;

  if (header.includes('data') && header.includes('valor')) {
    source = 'conta';
    dateIdx = header.indexOf('data');
    valIdx = header.indexOf('valor');
    descIdx = header.indexOf('descrição');
    if (descIdx === -1) descIdx = header.indexOf('descricao');
  } else if (header.includes('date') && header.includes('amount')) {
    source = 'cartao';
    dateIdx = header.indexOf('date');
    valIdx = header.indexOf('amount');
    descIdx = header.indexOf('title');
  } else {
    return { rows: [], errors: [`Formato não reconhecido. Cabeçalho: ${header.join(', ')}`], detected: 'unknown' };
  }

  if (dateIdx === -1 || valIdx === -1 || descIdx === -1) {
    return { rows: [], errors: ['Faltam colunas obrigatórias no CSV'], detected: source };
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], sep);
    if (cols.length < Math.max(dateIdx, valIdx, descIdx) + 1) continue;
    const dt = parseDateBR(cols[dateIdx]);
    const val = parseNumber(cols[valIdx]);
    const desc = cols[descIdx];
    if (!dt || val == null || !desc) {
      errors.push(`Linha ${i + 1}: ignorada (data/valor/descrição inválidos)`);
      continue;
    }
    if (source === 'conta') {
      rows.push({
        date: dt,
        description: desc,
        amount: Math.abs(val),
        type: val < 0 ? 'despesa' : 'receita',
        source: 'conta',
      });
    } else {
      rows.push({
        date: dt,
        description: desc,
        amount: Math.abs(val),
        type: 'despesa',
        source: 'cartao',
      });
    }
  }

  return { rows, errors, detected: source };
}
