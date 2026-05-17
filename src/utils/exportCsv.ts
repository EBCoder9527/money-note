export type CsvRow = Record<string, string | number | null | undefined>;

const utf8Bom = '\uFEFF';

export function exportCsv(filename: string, rows: CsvRow[]): void {
  if (rows.length === 0) {
    throw new Error('CSV rows cannot be empty.');
  }

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ].join('\r\n');
  const blob = new Blob([utf8Bom, csvContent], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: CsvRow[string]): string {
  const text = value === null || value === undefined ? '' : String(value);
  const escapedText = text.replace(/"/g, '""');

  return `"${escapedText}"`;
}
