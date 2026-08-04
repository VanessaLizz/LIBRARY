const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY as string | undefined;
const GOOGLE_BASE = 'https://www.googleapis.com/books/v1/volumes';

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
  authors?: string[]
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

/** Fetch com timeout via AbortController (compatível com todos os browsers modernos). */
function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function googleUrl(params: string): string {
  const key = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : '';
  return `${GOOGLE_BASE}?${params}${key}`;
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

// ------- Open Library fallback -------

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  isbn?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  language?: string[];
  cover_i?: number;
}

function mapOLDoc(doc: OLDoc): GoogleBook {
  const isbn13 = doc.isbn?.find((i) => i.length === 13);
  const isbn10 = doc.isbn?.find((i) => i.length === 10);
  return {
    id: doc.key,
    title: doc.title,
    authors: doc.author_name,
    publisher: doc.publisher?.[0],
    publishedDate: doc.first_publish_year?.toString(),
    pageCount: doc.number_of_pages_median,
    isbn10,
    isbn13,
    coverUrl: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined,
    source: 'Open Library',
  };
}

async function searchOpenLibrary(query: string, limit = 12): Promise<GoogleBook[]> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,publisher,first_publish_year,isbn,number_of_pages_median,cover_i`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.docs ?? []).map(mapOLDoc);
}

async function searchOpenLibraryByIsbn(isbn: string): Promise<GoogleBook | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  if (!clean) return null;
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = await res.json();
  const entry = data[`ISBN:${clean}`];
  if (!entry) return null;
  const isbn13 = entry.identifiers?.isbn_13?.[0];
  const isbn10 = entry.identifiers?.isbn_10?.[0];
  const coverId = entry.cover?.medium ?? entry.cover?.large ?? entry.cover?.small;
  return {
    id: `ol-${clean}`,
    title: entry.title ?? '',
    authors: entry.authors?.map((a: { name: string }) => a.name),
    publisher: entry.publishers?.[0]?.name,
    publishedDate: entry.publish_date,
    pageCount: entry.number_of_pages,
    isbn10,
    isbn13,
    coverUrl: coverId ?? undefined,
    source: 'Open Library',
  };
}

// ------- Public exports -------

export async function searchBooks(query: string, maxResults = 12): Promise<GoogleBook[]> {
  if (!query.trim()) return [];

  // 1. Tenta Google Books
  try {
    const url = googleUrl(`q=${encodeURIComponent(query)}&maxResults=${maxResults}`);
    const res = await fetchWithTimeout(url);
    if (res.status === 429) throw new Error('rate_limit');
    if (!res.ok) throw new Error('google_error');
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items.map(mapItem);
    }
  } catch {
    // fallthrough para Open Library
  }

  // 2. Fallback: Open Library
  try {
    return await searchOpenLibrary(query, maxResults);
  } catch {
    return [];
  }
}

export async function searchByIsbn(isbn: string): Promise<GoogleBook | null> {
  const clean = isbn.replace(/[^0-9Xx]/g, '');
  if (!clean) return null;

  // 1. Tenta Google Books
  try {
    const url = googleUrl(`q=isbn:${clean}&maxResults=1`);
    const res = await fetchWithTimeout(url);
    if (res.status === 429) throw new Error('rate_limit');
    if (!res.ok) throw new Error('google_error');
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const book = mapItem(data.items[0]);
      book.source = 'Google Books';
      return book;
    }
  } catch {
    // fallthrough para Open Library
  }

  // 2. Fallback: Open Library
  try {
    const book = await searchOpenLibraryByIsbn(clean);
    return book;
  } catch {
    return null;
  }
}

export async function searchByIdentifier(code: string): Promise<GoogleBook | null> {
  const normalized = code.trim().toUpperCase().replace(/[-\s]/g, '');

  // ASIN: 10 chars alfanuméricos, não puramente dígitos
  const isAsin = /^[A-Z0-9]{10}$/.test(normalized) && !/^\d{10}$/.test(normalized);

  if (isAsin) {
    // Open Library não indexa ASINs — só Google Books
    try {
      const url = googleUrl(`q=${encodeURIComponent(normalized)}&maxResults=1`);
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const book = mapItem(data.items[0]);
          book.asin = normalized;
          book.source = 'Google Books';
          return book;
        }
      }
    } catch {
      // silencioso
    }
    return null;
  }

  // ISBN-10 ou ISBN-13
  const book = await searchByIsbn(normalized);
  return book;
}
