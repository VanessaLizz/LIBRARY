export type BookStatus =
  | 'Quero Ler'
  | 'Lendo'
  | 'Pausado'
  | 'Abandonado'
  | 'Relendo'
  | 'Concluído';

export type BookFormat =
  | 'Físico'
  | 'Ebook'
  | 'Kindle'
  | 'PDF'
  | 'Audiolivro'
  | 'HQ'
  | 'Mangá';

export type Ownership =
  | 'Possuo'
  | 'Não possuo'
  | 'Emprestado'
  | 'Emprestei'
  | 'Desejo comprar';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  yearly_goal: number | null;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
}

export interface Author {
  id: string;
  user_id: string;
  name: string;
  country: string | null;
  created_at: string;
}

export interface Publisher {
  id: string;
  user_id: string;
  name: string;
  country: string | null;
  created_at: string;
}

export interface Series {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Book {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  translator: string | null;
  illustrator: string | null;
  publisher_id: string | null;
  series_id: string | null;
  edition: string | null;
  language: string | null;
  country: string | null;
  isbn10: string | null;
  isbn13: string | null;
  pages: number | null;
  primary_genre: string | null;
  publication_date: string | null;
  synopsis: string | null;
  cover_url: string | null;
  tags: string[] | null;
  format: BookFormat;
  status: BookStatus;
  ownership: Ownership;
  volume: number | null;
  created_at: string;
  updated_at: string;
  publisher?: Publisher | null;
  series?: Series | null;
  authors?: Author[];
  genres?: string[];
}

export interface Reading {
  id: string;
  user_id: string;
  book_id: string;
  status: BookStatus;
  format: BookFormat;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  pages_read: number;
  pages_remaining: number;
  rating: number;
  favorite: boolean;
  reread: boolean;
  mood: string | null;
  difficulty: string | null;
  would_recommend: string | null;
  review: string | null;
  created_at: string;
  updated_at: string;
  book?: Book;
}

export interface Quote {
  id: string;
  user_id: string;
  book_id: string;
  content: string;
  page: number | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  book_id: string | null;
  title: string;
  author: string | null;
  priority: number;
  desired_price: number | null;
  store_url: string | null;
  notes: string | null;
  created_at: string;
}

export type GoalType =
  | 'books_year'
  | 'pages_year'
  | 'books_month'
  | 'pages_month'
  | 'audio_hours';

export interface Goal {
  id: string;
  user_id: string;
  type: GoalType;
  target: number;
  period: string;
  year: number;
  created_at: string;
}

export const BOOK_STATUSES: BookStatus[] = [
  'Quero Ler',
  'Lendo',
  'Pausado',
  'Abandonado',
  'Relendo',
  'Concluído',
];

export const BOOK_FORMATS: BookFormat[] = [
  'Físico',
  'Ebook',
  'Kindle',
  'PDF',
  'Audiolivro',
  'HQ',
  'Mangá',
];

export const OWNERSHIPS: Ownership[] = [
  'Possuo',
  'Não possuo',
  'Emprestado',
  'Emprestei',
  'Desejo comprar',
];

export const MOODS = [
  'Feliz',
  'Reflexivo',
  'Triste',
  'Animado',
  'Relaxado',
  'Tenso',
  'Inspirado',
  'Entediado',
];

export const DIFFICULTIES = ['Fácil', 'Médio', 'Difícil', 'Muito Difícil'];
