/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from 'papaparse';
import { Book } from './types';

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(data: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
}

export function exportCSV(books: Book[], filename = 'leituradb-books.csv') {
  const rows = books.map((b) => ({
    title: b.title,
    subtitle: b.subtitle ?? '',
    authors: (b.authors ?? []).map((a) => a.name).join('; '),
    publisher: b.publisher?.name ?? '',
    edition: b.edition ?? '',
    language: b.language ?? '',
    country: b.country ?? '',
    isbn10: b.isbn10 ?? '',
    isbn13: b.isbn13 ?? '',
    pages: b.pages ?? '',
    primary_genre: b.primary_genre ?? '',
    series: b.series?.name ?? '',
    volume: b.volume ?? '',
    publication_date: b.publication_date ?? '',
    format: b.format,
    status: b.status,
    ownership: b.ownership,
    tags: (b.tags ?? []).join('; '),
  }));
  const csv = Papa.unparse(rows);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

export function parseCSV(text: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return result.data;
}

export function parseJSON(text: string): any {
  return JSON.parse(text);
}
