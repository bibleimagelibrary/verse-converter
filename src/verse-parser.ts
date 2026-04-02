import {
  getBooksSync,
  getBookById,
  getBookIdByNameOrCode,
} from "./book-service";

export interface ParsedVerse {
  isValid: boolean;
  bookId?: number;
  bookName?: string;
  chapter?: number;
  verse?: number;
  formatted?: string;
  error?: string;
}

export interface ParsedVerseRange {
  isValid: boolean;
  startVerse?: ParsedVerse;
  endVerse?: ParsedVerse;
  formatted?: string;
  error?: string;
}

export function parseVerseCode(code: string): ParsedVerse {
  // Remove any whitespace
  const cleaned = code.trim();

  // Check format: should be at least 9 digits (BBBCCCVVV)
  if (!/^\d+$/.test(cleaned)) {
    return {
      isValid: false,
      error: "Input must contain only digits",
    };
  }

  if (cleaned.length < 9) {
    return {
      isValid: false,
      error: `Input must be at least 9 digits (BBBCCCVVV), got ${cleaned.length}`,
    };
  }

  // Extract the components (ignoring SSMMM if present)
  const bookIdStr = cleaned.substring(0, 3);
  const chapterStr = cleaned.substring(3, 6);
  const verseStr = cleaned.substring(6, 9);

  const bookId = parseInt(bookIdStr, 10);
  const chapter = parseInt(chapterStr, 10);
  const verse = parseInt(verseStr, 10);

  // Validate book ID (1-66 for standard Bible)
  if (bookId < 1 || bookId > 66) {
    return {
      isValid: false,
      error: `Book ID must be between 1 and 66, got ${bookId}`,
    };
  }

  // Validate chapter (should be > 0)
  if (chapter < 1) {
    return {
      isValid: false,
      error: `Chapter must be greater than 0, got ${chapter}`,
    };
  }

  // Validate verse (should be > 0)
  if (verse < 1) {
    return {
      isValid: false,
      error: `Verse must be greater than 0, got ${verse}`,
    };
  }

  const book = getBookById(bookId);
  if (!book) {
    return {
      isValid: false,
      error: `Book with ID ${bookId} not found`,
    };
  }

  const formatted = `${book.name} ${chapter}:${verse}`;

  return {
    isValid: true,
    bookId,
    bookName: book.name,
    chapter,
    verse,
    formatted,
  };
}

// Helper function to compare verse positions in the Bible
function isVersePositionBefore(
  verse1: ParsedVerse,
  verse2: ParsedVerse
): boolean {
  if (!verse1.isValid || !verse2.isValid) return false;

  if (verse1.bookId! < verse2.bookId!) return true;
  if (verse1.bookId! > verse2.bookId!) return false;

  if (verse1.chapter! < verse2.chapter!) return true;
  if (verse1.chapter! > verse2.chapter!) return false;

  return verse1.verse! < verse2.verse!;
}

// Helper function to format verse range nicely
function formatVerseRange(start: ParsedVerse, end: ParsedVerse): string {
  if (!start.isValid || !end.isValid) {
    return "";
  }

  // Same book
  if (start.bookId === end.bookId) {
    // Same chapter
    if (start.chapter === end.chapter) {
      return `${start.bookName} ${start.chapter}:${start.verse}-${end.verse}`;
    }
    // Different chapters
    return `${start.bookName} ${start.chapter}:${start.verse} - ${end.chapter}:${end.verse}`;
  }

  // Different books
  return `${start.bookName} ${start.chapter}:${start.verse} - ${end.bookName} ${end.chapter}:${end.verse}`;
}

export function parseVerseRange(rangeCode: string): ParsedVerseRange {
  const cleaned = rangeCode.trim();

  // Check if it contains a dash (range indicator)
  if (!cleaned.includes("-")) {
    // Not a range, parse as single verse
    const singleVerse = parseVerseCode(cleaned);
    if (singleVerse.isValid) {
      return {
        isValid: true,
        startVerse: singleVerse,
        endVerse: singleVerse,
        formatted: singleVerse.formatted,
      };
    } else {
      return {
        isValid: false,
        error: singleVerse.error,
      };
    }
  }

  // Split by dash to get start and end
  const parts = cleaned.split("-");
  if (parts.length !== 2) {
    return {
      isValid: false,
      error: "Range must contain exactly one dash (e.g., 040001001-040002010)",
    };
  }

  const startCode = parts[0].trim();
  const endCode = parts[1].trim();

  if (!startCode || !endCode) {
    return {
      isValid: false,
      error: "Both start and end verses must be provided",
    };
  }

  // Parse both verses
  const startVerse = parseVerseCode(startCode);
  const endVerse = parseVerseCode(endCode);

  if (!startVerse.isValid) {
    return {
      isValid: false,
      error: `Invalid start verse: ${startVerse.error}`,
    };
  }

  if (!endVerse.isValid) {
    return {
      isValid: false,
      error: `Invalid end verse: ${endVerse.error}`,
    };
  }

  // Validate that start comes before end in the Bible
  if (isVersePositionBefore(endVerse, startVerse)) {
    return {
      isValid: false,
      error: "Start verse must come before end verse in the Bible",
    };
  }

  const formatted = formatVerseRange(startVerse, endVerse);

  return {
    isValid: true,
    startVerse,
    endVerse,
    formatted,
  };
}

export function getBibleBooks() {
  try {
    return getBooksSync();
  } catch {
    // Books not loaded yet
    return [];
  }
}

// Helper function to get book ID by name (case-insensitive)
// Get book ID by name or code (e.g., "Matthew" or "GEN")
function getBookIdByNameOrCodeLocal(nameOrCode: string): number | null {
  try {
    return getBookIdByNameOrCode(nameOrCode);
  } catch {
    return null;
  }
}

// Convert a ParsedVerse to code format (BBBCCCVVV with SSMMM as zeros)
export function verseToCode(verse: ParsedVerse): string {
  if (!verse.isValid) return "";
  const bookId = String(verse.bookId).padStart(3, "0");
  const chapter = String(verse.chapter).padStart(3, "0");
  const verseNum = String(verse.verse).padStart(3, "0");
  return `${bookId}${chapter}${verseNum}000000`;
}

// Convert a ParsedVerseRange to code format
export function rangeToCode(range: ParsedVerseRange): string {
  if (!range.isValid) return "";
  
  const startVerse = range.startVerse!;
  const endVerse = range.endVerse!;
  
  // Check if it's a single verse
  const isSingleVerse =
    startVerse.bookId === endVerse.bookId &&
    startVerse.chapter === endVerse.chapter &&
    startVerse.verse === endVerse.verse;
  
  if (isSingleVerse) {
    // For single verse, just return the code without range format
    return verseToCode(startVerse);
  }
  
  // For ranges, return both parts
  const startCode = verseToCode(startVerse);
  const endCode = verseToCode(endVerse);
  return `${startCode}-${endCode}`;
}

export interface ParsedReadableVerse {
  isValid: boolean;
  bookName?: string;
  chapter?: number;
  verse?: number;
  error?: string;
}

// Parse human-readable format like "Matthew 1:1" or "Mark 3:16" or "Luke 10" (defaults to verse 1)
export function parseReadableVerse(
  input: string
): ParsedReadableVerse {
  const cleaned = input.trim();

  // Match pattern: "Book Name Chapter:Verse" or "Book Name Chapter"
  // This regex captures book name (including numbers like "1 Kings"), chapter, and optional verse
  const match = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);

  if (!match) {
    return {
      isValid: false,
      error:
        'Format should be "Book Chapter" or "Book Chapter:Verse" (e.g., "Luke 10" or "Matthew 1:1")',
    };
  }

  const bookName = match[1];
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : 1; // Default to verse 1 if not provided

  const bookId = getBookIdByNameOrCodeLocal(bookName);

  if (!bookId) {
    return {
      isValid: false,
      error: `Book "${bookName}" not found. Check the Bible books reference.`,
    };
  }

  if (chapter < 1) {
    return {
      isValid: false,
      error: `Chapter must be greater than 0, got ${chapter}`,
    };
  }

  if (verse < 1) {
    return {
      isValid: false,
      error: `Verse must be greater than 0, got ${verse}`,
    };
  }

  return {
    isValid: true,
    bookName,
    chapter,
    verse,
  };
}

// Parse human-readable range format like "Matthew 1:1-10" or "1 Kings 10:1 - 2 Kings 1:5"
export function parseReadableRange(
  input: string
): ParsedVerseRange {
  const cleaned = input.trim();

  if (!cleaned.includes("-")) {
    // Single verse in readable format
    const verse = parseReadableVerse(cleaned);
    if (verse.isValid) {
      const bookId = getBookIdByNameOrCodeLocal(verse.bookName!);
      if (!bookId) {
        return {
          isValid: false,
          error: "Failed to find book ID",
        };
      }
      const parsedVerse: ParsedVerse = {
        isValid: true,
        bookId,
        bookName: verse.bookName,
        chapter: verse.chapter,
        verse: verse.verse,
        formatted: `${verse.bookName} ${verse.chapter}:${verse.verse}`,
      };
      return {
        isValid: true,
        startVerse: parsedVerse,
        endVerse: parsedVerse,
        formatted: parsedVerse.formatted,
      };
    } else {
      return {
        isValid: false,
        error: verse.error,
      };
    }
  }

  // Split by dash for range
  const parts = cleaned.split("-").map((p) => p.trim());

  if (parts.length !== 2) {
    return {
      isValid: false,
      error:
        'Range should contain one dash (e.g., "Matthew 1:1-10" or "Matthew 1:1 - Mark 3:16")',
    };
  }

  const [startPart, endPart] = parts;

  // For same book ranges like "Matthew 1:1-10", endPart might just be "10"
  // Try to parse end part as just verse, or full "Book Chapter:Verse"
  let startVerse = parseReadableVerse(startPart);

  if (!startVerse.isValid) {
    return {
      isValid: false,
      error: `Invalid start verse: ${startVerse.error}`,
    };
  }

  let endVerse: ParsedReadableVerse;

  // Check if end part is just a number (could be verse or chapter)
  if (/^\d+$/.test(endPart)) {
    const num = parseInt(endPart, 10);
    if (num < 1) {
      return {
        isValid: false,
        error: `End must be greater than 0, got ${num}`,
      };
    }

    // Determine if this is a verse or chapter number
    // If the number is significantly larger than start chapter, treat as chapter
    // Otherwise, treat as verse in the same chapter as start
    if (num > startVerse.chapter! * 10) {
      // Likely a chapter number (e.g., "Luke 10 - 12" means chapters)
      endVerse = {
        isValid: true,
        bookName: startVerse.bookName,
        chapter: num,
        verse: 1, // Default to first verse of the chapter
      };
    } else {
      // Likely a verse number in the same chapter
      endVerse = {
        isValid: true,
        bookName: startVerse.bookName,
        chapter: startVerse.chapter,
        verse: num,
      };
    }
  } else if (/^\d+:\d+$/.test(endPart)) {
    // Chapter:Verse format without book (same book assumed)
    const match = endPart.match(/^(\d+):(\d+)$/);
    const chapter = parseInt(match![1], 10);
    const verse = parseInt(match![2], 10);

    if (chapter < 1 || verse < 1) {
      return {
        isValid: false,
        error: `End chapter and verse must be greater than 0`,
      };
    }

    endVerse = {
      isValid: true,
      bookName: startVerse.bookName,
      chapter: chapter,
      verse: verse,
    };
  } else {
    // Full "Book Chapter" or "Book Chapter:Verse" format
    endVerse = parseReadableVerse(endPart);
    if (!endVerse.isValid) {
      return {
        isValid: false,
        error: `Invalid end verse: ${endVerse.error}`,
      };
    }
  }

  // Convert readable verses to parsed verses with book IDs
  const startBookId = getBookIdByNameOrCodeLocal(startVerse.bookName!);
  const endBookId = getBookIdByNameOrCodeLocal(endVerse.bookName!);

  if (!startBookId || !endBookId) {
    return {
      isValid: false,
      error: "Failed to find book ID",
    };
  }

  const startParsed: ParsedVerse = {
    isValid: true,
    bookId: startBookId,
    bookName: startVerse.bookName,
    chapter: startVerse.chapter,
    verse: startVerse.verse,
    formatted: `${startVerse.bookName} ${startVerse.chapter}:${startVerse.verse}`,
  };

  const endParsed: ParsedVerse = {
    isValid: true,
    bookId: endBookId,
    bookName: endVerse.bookName,
    chapter: endVerse.chapter,
    verse: endVerse.verse,
    formatted: `${endVerse.bookName} ${endVerse.chapter}:${endVerse.verse}`,
  };

  // Validate that start comes before end
  if (isVersePositionBefore(endParsed, startParsed)) {
    return {
      isValid: false,
      error: "Start verse must come before end verse in the Bible",
    };
  }

  const formatted = formatVerseRange(startParsed, endParsed);

  return {
    isValid: true,
    startVerse: startParsed,
    endVerse: endParsed,
    formatted,
  };
}
