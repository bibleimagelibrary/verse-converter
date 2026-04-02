export interface Book {
  id: number;
  code: string;
  name: string;
  book_order: string;
}

let booksCache: Book[] | null = null;

const API_URL = "https://q9md038uhk.execute-api.us-east-1.amazonaws.com/books?all=true";

export async function fetchBooks(): Promise<Book[]> {
  if (booksCache) {
    return booksCache as Book[];
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    booksCache = data.books;
    return booksCache as Book[];
  } catch (error) {
    console.error("Failed to fetch books:", error);
    throw error;
  }
}

export function getBooksSync(): Book[] {
  if (!booksCache) {
    return [];
  }
  return booksCache as Book[];
}

export function getBookById(id: number): Book | undefined {
  return getBooksSync().find((b) => b.id === id);
}

export function getBookByName(name: string): Book | undefined {
  const normalized = name.trim().toLowerCase();
  return getBooksSync().find((b) => b.name.toLowerCase() === normalized);
}

export function getBookByCode(code: string): Book | undefined {
  const normalized = code.trim().toUpperCase();
  return getBooksSync().find((b) => b.code.toUpperCase() === normalized);
}

export function getBookIdByNameOrCode(nameOrCode: string): number | null {
  // Try as full name first
  const bookByName = getBookByName(nameOrCode);
  if (bookByName) {
    return bookByName.id;
  }

  // Try as code (like "GEN", "MAT", etc.)
  const bookByCode = getBookByCode(nameOrCode);
  if (bookByCode) {
    return bookByCode.id;
  }

  return null;
}
