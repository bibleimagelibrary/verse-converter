import {
  getBooksSync,
  getBookById,
  getBookByCode,
  getBookByName,
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

// Helper function to extract book name/code from input (handles "1 Samuel", "1 Kings", "1TI", etc.)
function extractBookAndRange(input: string): { bookNameOrCode: string | null; range: string } {
  // Match: optional 1/2/3 (with or without space), then letters (possibly multiple words)
  // Examples: "Matthew 1:1" => { bookNameOrCode: "Matthew", range: "1:1" }
  //           "1 Kings 3:10" => { bookNameOrCode: "1 Kings", range: "3:10" }
  //           "1TI 1-4" => { bookNameOrCode: "1TI", range: "1-4" }
  //           "Luke 10" => { bookNameOrCode: "Luke", range: "10" }
  const match = input.match(/^([1-3]?[A-Za-z]+(?:\s[A-Za-z]+)*)(.*)$/);
  return {
    bookNameOrCode: match ? match[1].trim() : null,
    range: match ? match[2].trim() : ""
  };
}

// Validate and get book by name or code
function getValidBook(nameOrCode: string | null) {
  if (!nameOrCode) return null;
  
  // Try as code: 3 letters only, OR 1-3 followed by 2 letters (like "1TI", "2SA", "3JO")
  if (/^[A-Za-z]{3}$/.test(nameOrCode)) {
    const bookByCode = getBookByCode(nameOrCode);
    if (bookByCode) return bookByCode;
  } else if (/^[1-3][A-Za-z]{2}$/.test(nameOrCode)) {
    const bookByCode = getBookByCode(nameOrCode);
    if (bookByCode) return bookByCode;
  }
  
  // Try as full name
  const bookByName = getBookByName(nameOrCode);
  if (bookByName) return bookByName;
  
  return null;
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

  // Helper: check if verse should be displayed (not undefined and not 999)
  const hasDisplayVerse = (verse?: number): boolean => verse !== undefined && verse !== 999;

  // Helper: format a single chapter reference with optional verse
  const formatChapterRef = (book: string | undefined, chapter: number | undefined, verse?: number): string => {
    if (!chapter) return "";
    const bookPrefix = book ? book + " " : "";
    if (hasDisplayVerse(verse)) {
      return `${bookPrefix}${chapter}:${verse}`;
    }
    return `${bookPrefix}${chapter}`;
  };

  // Same book
  if (start.bookId === end.bookId) {
    // Same chapter
    if (start.chapter === end.chapter) {
      // Both have displayable verses
      if (hasDisplayVerse(start.verse) && hasDisplayVerse(end.verse)) {
        // If same verse, show as single verse (not a range)
        if (start.verse === end.verse) {
          return `${start.bookName} ${start.chapter}:${start.verse}`;
        }
        return `${start.bookName} ${start.chapter}:${start.verse}-${end.verse}`;
      }
      // Chapter only
      return `${start.bookName} ${start.chapter}`;
    }
    // Different chapters - show each with verse if available
    const startRef = formatChapterRef(start.bookName, start.chapter, start.verse);
    const endRef = formatChapterRef(undefined, end.chapter, end.verse);
    // If same reference (shouldn't normally happen), return just one
    if (startRef === endRef) {
      return startRef;
    }
    return `${startRef}-${endRef}`;
  }

  // Different books
  const startRef = formatChapterRef(start.bookName, start.chapter, start.verse);
  const endRef = formatChapterRef(end.bookName, end.chapter, end.verse);
  // If same reference (shouldn't normally happen), return just one
  if (startRef === endRef) {
    return startRef;
  }
  return `${startRef}-${endRef}`;
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

// Convert a ParsedVerse to code format (BBBCCCVVV with SSMMM as zeros)
export function verseToCode(verse: ParsedVerse): string {
  if (!verse.isValid) return "";
  const bookId = String(verse.bookId).padStart(3, "0");
  const chapter = String(verse.chapter).padStart(3, "0");
  // Normalize 999 (internal end-of-chapter marker) to 0 for display
  const verseNum = String(verse.verse ?? 0).padStart(3, "0");
  let result = `${bookId}${chapter}${verseNum}`;
  // Don't display 999 in the code output
  if (verseNum === "999") {
    result = `${bookId}${chapter}000`;
  }
  return `${result}00000`;  // SSMMM are always zeros in this format
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

// Parse human-readable format supporting:
// - Full book name: "Matthew 1:1", "1 Kings 3:10", "Luke 10"
// - Book code: "MAT 1:1", "1KI 3:10"
// - Range patterns:
//   1. Full range: "Matthew 1:1-4:22"
//   2. Same-chapter range: "Matthew 3:1-30"
//   3. Chapter range with end verse: "Matthew 1-4:22"
//   4. Chapter range: "Matthew 1-4"
//   5. Single verse: "Matthew 3:10"
//   6. Single chapter: "Matthew 13"
export function parseReadableRange(input: string): ParsedVerseRange {
  const cleaned = input.trim();

  if (!cleaned) {
    return {
      isValid: false,
      error: "Input cannot be empty",
    };
  }

  // Extract book name/code and range portion
  const { bookNameOrCode, range } = extractBookAndRange(cleaned);

  // Validate book
  const book = getValidBook(bookNameOrCode);
  if (!book) {
    return {
      isValid: false,
      error: `Book "${bookNameOrCode}" not found. Check the Bible books reference.`,
    };
  }

  const bookName = book.name;
  const bookId = book.id;

  // Helper to create a ParsedVerse
  const createVerse = (chapter: number, verse?: number): ParsedVerse => ({
    isValid: true,
    bookId,
    bookName,
    chapter,
    verse,
    formatted: verse !== undefined && verse !== 999 ? `${bookName} ${chapter}:${verse}` : `${bookName} ${chapter}`,
  });

  // Helper to return successful range
  const returnRange = (start: ParsedVerse, end: ParsedVerse): ParsedVerseRange => {
    if (isVersePositionBefore(end, start)) {
      return {
        isValid: false,
        error: "Start verse must come before end verse in the Bible",
      };
    }
    return {
      isValid: true,
      startVerse: start,
      endVerse: end,
      formatted: formatVerseRange(start, end),
    };
  };

  // If no range, it's just a book (or book with single verse/chapter)
  if (!range) {
    // Just book name -> whole first chapter by default
    const singleVerse = createVerse(1);
    return returnRange(singleVerse, singleVerse);
  }

  // Handle different range patterns
  let match: RegExpMatchArray | null;

  // 1. Full range: ch:v-ch:v (e.g. "1:1-4:22")
  match = range.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
  if (match) {
    const startVerse = createVerse(parseInt(match[1], 10), parseInt(match[2], 10));
    const endVerse = createVerse(parseInt(match[3], 10), parseInt(match[4], 10));
    return returnRange(startVerse, endVerse);
  }

  // 1b. Cross-chapter range: ch:v-ch (e.g. "1:24-2" means chapter 1 verse 24 to chapter 2, end)
  // Only treat as cross-chapter if the end chapter number is greater than the start chapter
  match = range.match(/^(\d+):(\d+)-(\d+)$/);
  if (match) {
    const startChapter = parseInt(match[1], 10);
    const endChapter = parseInt(match[3], 10);
    
    // If end chapter > start chapter, this is a cross-chapter range
    if (endChapter > startChapter) {
      const startVerse = createVerse(startChapter, parseInt(match[2], 10));
      const endVerse = createVerse(endChapter, 999); // End of chapter
      return returnRange(startVerse, endVerse);
    }
  }

  // 2. Same-chapter range: ch:v-v (e.g. "3:1-30" means chapter 3, verse 1 to 30)
  match = range.match(/^(\d+):(\d+)-(\d+)$/);
  if (match) {
    const chapter = parseInt(match[1], 10);
    const startVerse = createVerse(chapter, parseInt(match[2], 10));
    const endVerse = createVerse(chapter, parseInt(match[3], 10));
    return returnRange(startVerse, endVerse);
  }

  // 3. Chapter range with end verse: ch-ch:v (e.g. "1-4:22" means chapter 1 to 4, verse 22)
  match = range.match(/^(\d+)-(\d+):(\d+)$/);
  if (match) {
    const startVerse = createVerse(parseInt(match[1], 10), 1);
    const endVerse = createVerse(parseInt(match[2], 10), parseInt(match[3], 10));
    return returnRange(startVerse, endVerse);
  }

  // 4. Chapter range: ch-ch (e.g. "1-4" means chapter 1 to 4)
  match = range.match(/^(\d+)-(\d+)$/);
  if (match) {
    const startVerse = createVerse(parseInt(match[1], 10));
    // End chapter without explicit verse should map to verse 999.
    const endVerse = createVerse(parseInt(match[2], 10), 999);
    return returnRange(startVerse, endVerse);
  }

  // 5. Single verse: ch:v (e.g. "3:10")
  match = range.match(/^(\d+):(\d+)$/);
  if (match) {
    const singleVerse = createVerse(parseInt(match[1], 10), parseInt(match[2], 10));
    return returnRange(singleVerse, singleVerse);
  }

  // 6. Single chapter: ch (e.g. "13")
  match = range.match(/^(\d+)$/);
  if (match) {
    const singleVerse = createVerse(parseInt(match[1], 10));
    return returnRange(singleVerse, singleVerse);
  }

  return {
    isValid: false,
    error: `Unable to parse range: "${cleaned}". Examples: "Matthew 1:1", "Luke 10", "John 1:1-3:16", "Romans 1-4"`,
  };
}
