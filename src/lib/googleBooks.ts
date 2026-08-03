export interface GoogleBook {
  id: string;
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  isbn10?: string;
  isbn13?: string;
  coverUrl?: string;
  asin?: string;
  source?: string;
}

interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  language?: string;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  industryIdentifiers?: { type: string; identifier: string }[];
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

function mapItem(item: GoogleBooksItem): GoogleBook {
  const v = item.volumeInfo;
  const isbn10 = v.industryIdentifiers?.find((i) => i.type === 'ISBN_10')?.identifier;
  const isbn13 = v.industryIdentifiers?.find((i) => i.type === 'ISBN_13')?.identifier;
  return {
    id: item.id,
    title: v.title ?? '',
    subtitle: v.subtitle,
    authors: v.authors,
    publisher: v.publisher,
    publishedDate: v.publishedDate,
    description: v.description,
    pageCount: v.pageCount,
    categories: v.categories,
    language: v.language,
    isbn10,
    isbn13,
    coverUrl: v.imageLinks?.thumbnail?.replace('http://', 'https://'),
  };
}

export async function searchBooks(query: string, maxResults = 12): Promise<GoogleBook[]> {
  if (!query.trim()) return [];
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao buscar livros');
  const data = await res.json();
  if (!data.items) return [];
  return data.items.map(mapItem);
}

export async function searchByIsbn(isbn: string): Promise<GoogleBook | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  if (!clean) return null;
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao buscar por ISBN');
  const data = await res.json();
  if (!data.items || data.items.length === 0) return null;
  return mapItem(data.items[0]);
}

export async function searchByIdentifier(code: string): Promise<GoogleBook | null> {
  // Simple check: ASINs usually start with B0 and are 10 chars, or just try general search for alphanumeric
  const isAsin = /^[A-Z0-9]{10}$/.test(code) && !/^\d{10}$/.test(code);
  
  if (isAsin) {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(code)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao buscar identificador');
    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;
    const book = mapItem(data.items[0]);
    book.asin = code;
    book.source = 'Google Books';
    return book;
  }

  const book = await searchByIsbn(code);
  if (book) {
    book.source = 'Google Books';
  }
  return book;
}
