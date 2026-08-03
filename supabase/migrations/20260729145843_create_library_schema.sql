/*
# Create library schema for personal reading tracker

## Overview
Multi-user personal library and reading tracker. Each user owns their own
library, readings, goals, wishlist, reviews and quotes.

## New Tables
- `profiles` — extended user data (avatar, display name, yearly goal) 1:1 with auth.users
- `authors` — book authors (per-user)
- `publishers` — publishers (per-user)
- `series` — book series (per-user)
- `books` — core book metadata, owned by a user
- `book_authors` — many-to-many books <-> authors
- `book_genres` — many-to-many books <-> genres (genre stored as text)
- `readings` — reading log entries (status, dates, rating, review, pages)
- `quotes` — favorite quotes from a book
- `wishlist` — books the user wants to acquire
- `goals` — reading goals (books/pages per year/month, audiobook hours)

## Security
- RLS enabled on every table.
- All tables owner-scoped: policies use auth.uid() = user_id.
- Owner columns default to auth.uid() so inserts that omit user_id succeed.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  yearly_goal int DEFAULT 12,
  preferred_language text DEFAULT 'pt-BR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- authors
CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_authors" ON authors;
CREATE POLICY "select_own_authors" ON authors FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_authors" ON authors;
CREATE POLICY "insert_own_authors" ON authors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_authors" ON authors;
CREATE POLICY "update_own_authors" ON authors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_authors" ON authors;
CREATE POLICY "delete_own_authors" ON authors FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_authors_user ON authors(user_id);

-- publishers
CREATE TABLE IF NOT EXISTS publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  country text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE publishers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_publishers" ON publishers;
CREATE POLICY "select_own_publishers" ON publishers FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_publishers" ON publishers;
CREATE POLICY "insert_own_publishers" ON publishers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_publishers" ON publishers;
CREATE POLICY "update_own_publishers" ON publishers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_publishers" ON publishers;
CREATE POLICY "delete_own_publishers" ON publishers FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_publishers_user ON publishers(user_id);

-- series
CREATE TABLE IF NOT EXISTS series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);
ALTER TABLE series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_series" ON series;
CREATE POLICY "select_own_series" ON series FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_series" ON series;
CREATE POLICY "insert_own_series" ON series FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_series" ON series;
CREATE POLICY "update_own_series" ON series FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_series" ON series;
CREATE POLICY "delete_own_series" ON series FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_series_user ON series(user_id);

-- books
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  translator text,
  illustrator text,
  publisher_id uuid REFERENCES publishers(id) ON DELETE SET NULL,
  series_id uuid REFERENCES series(id) ON DELETE SET NULL,
  edition text,
  language text,
  country text,
  isbn10 text,
  isbn13 text,
  pages int,
  primary_genre text,
  publication_date date,
  synopsis text,
  cover_url text,
  tags text[] DEFAULT '{}',
  format text DEFAULT 'Físico',
  status text DEFAULT 'Quero Ler',
  ownership text DEFAULT 'Possuo',
  volume int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_books" ON books;
CREATE POLICY "select_own_books" ON books FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_books" ON books;
CREATE POLICY "insert_own_books" ON books FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_books" ON books;
CREATE POLICY "update_own_books" ON books FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_books" ON books;
CREATE POLICY "delete_own_books" ON books FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_books_user ON books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_format ON books(format);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);

-- book_authors
CREATE TABLE IF NOT EXISTS book_authors (
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, author_id)
);
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_book_authors" ON book_authors;
CREATE POLICY "select_own_book_authors" ON book_authors FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_book_authors" ON book_authors;
CREATE POLICY "insert_own_book_authors" ON book_authors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_book_authors" ON book_authors;
CREATE POLICY "update_own_book_authors" ON book_authors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_book_authors" ON book_authors;
CREATE POLICY "delete_own_book_authors" ON book_authors FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- book_genres
CREATE TABLE IF NOT EXISTS book_genres (
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  genre text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, genre)
);
ALTER TABLE book_genres ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_book_genres" ON book_genres;
CREATE POLICY "select_own_book_genres" ON book_genres FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_book_genres" ON book_genres;
CREATE POLICY "insert_own_book_genres" ON book_genres FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_book_genres" ON book_genres;
CREATE POLICY "delete_own_book_genres" ON book_genres FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- readings
CREATE TABLE IF NOT EXISTS readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status text DEFAULT 'Lendo',
  format text DEFAULT 'Físico',
  start_date date,
  end_date date,
  progress int DEFAULT 0,
  pages_read int DEFAULT 0,
  pages_remaining int DEFAULT 0,
  rating numeric(2,1) DEFAULT 0,
  favorite boolean DEFAULT false,
  reread boolean DEFAULT false,
  mood text,
  difficulty text,
  would_recommend text,
  review text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_readings" ON readings;
CREATE POLICY "select_own_readings" ON readings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_readings" ON readings;
CREATE POLICY "insert_own_readings" ON readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_readings" ON readings;
CREATE POLICY "update_own_readings" ON readings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_readings" ON readings;
CREATE POLICY "delete_own_readings" ON readings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_readings_user ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_book ON readings(book_id);
CREATE INDEX IF NOT EXISTS idx_readings_end ON readings(end_date);

-- quotes
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  content text NOT NULL,
  page int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_quotes" ON quotes;
CREATE POLICY "select_own_quotes" ON quotes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_quotes" ON quotes;
CREATE POLICY "insert_own_quotes" ON quotes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_quotes" ON quotes;
CREATE POLICY "update_own_quotes" ON quotes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_quotes" ON quotes;
CREATE POLICY "delete_own_quotes" ON quotes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user ON quotes(user_id);

-- wishlist
CREATE TABLE IF NOT EXISTS wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  priority int DEFAULT 3,
  desired_price numeric(10,2),
  store_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_wishlist" ON wishlist;
CREATE POLICY "select_own_wishlist" ON wishlist FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_wishlist" ON wishlist;
CREATE POLICY "insert_own_wishlist" ON wishlist FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_wishlist" ON wishlist;
CREATE POLICY "update_own_wishlist" ON wishlist FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_wishlist" ON wishlist;
CREATE POLICY "delete_own_wishlist" ON wishlist FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);

-- goals
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  target int NOT NULL,
  period text NOT NULL,
  year int NOT NULL DEFAULT EXTRACT(year FROM now())::int,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_goals" ON goals;
CREATE POLICY "select_own_goals" ON goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_goals" ON goals;
CREATE POLICY "insert_own_goals" ON goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_goals" ON goals;
CREATE POLICY "update_own_goals" ON goals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_goals" ON goals;
CREATE POLICY "delete_own_goals" ON goals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated ON profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_books_updated ON books;
CREATE TRIGGER trg_books_updated BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_readings_updated ON readings;
CREATE TRIGGER trg_readings_updated BEFORE UPDATE ON readings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Storage bucket for cover uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "covers_public_read" ON storage.objects;
CREATE POLICY "covers_public_read" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'covers');
DROP POLICY IF EXISTS "covers_own_insert" ON storage.objects;
CREATE POLICY "covers_own_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'covers');
DROP POLICY IF EXISTS "covers_own_update" ON storage.objects;
CREATE POLICY "covers_own_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'covers');
DROP POLICY IF EXISTS "covers_own_delete" ON storage.objects;
CREATE POLICY "covers_own_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'covers');
