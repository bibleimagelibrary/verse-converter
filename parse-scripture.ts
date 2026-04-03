import { BibleBook } from "@/types/bible-book";
import type { ParsedScriptureReference } from "@/types/scripture-reference";

export function parseScriptureRange(scriptureRange: string, booksReference: BibleBook[] | null  ): ParsedScriptureReference | null {

  const vaidateBookName = (bookName: string | null): string | null => {
    if (!bookName || !booksReference) return null;
    const found = booksReference.find(
      book => book.name.toLowerCase() === bookName.trim().toLowerCase()
    );
    return found ? found.name : null;
  };

  const getBookId = (name: string): number => {
    if (name) {
      const found = booksReference?.find(
        book => book.name.toLowerCase() === name.trim().toLowerCase()
      );
      return found ? found.id : 0;
    }
    return 0;
  };

  const getBookCode = (name: string): string => {
    if (name) {
      const found = booksReference?.find(
        book => book.name.toLowerCase() === name.trim().toLowerCase()
      );
      return found ? found.code : "";
    }
    return "";
  };

  const extractBookNameAndRange = (scriptureRange: string): { bookName: string | null; range: string } => {
    // Match: optional 1/2/3, then space, then letters (possibly multiple words), up to the first digit after a space
    // Examples: "1 Samuel 3:10" => { bookName: "1 Samuel", range: "3:10" }
    //           "Daniel 13"     => { bookName: "Daniel", range: "13" }
    //           "Ruth"          => { bookName: "Ruth", range: "" }
    const match = scriptureRange.match(/^((?:[1-3]\s)?[A-Za-z]+(?:\s[A-Za-z]+)*)(.*)$/);
    return {
      bookName: match ? match[1].trim() : null,
      range: match ? match[2].trim() : ""
    };
  };

  /**
   * Convert a scripture reference into a sortable integer.
   * @param {string} book - The full book name
   * @param {number} chapterStart - The chapter number
   * @param {number} verseStart - The verse number
   * @returns {number} - A sortable integer
   */
  const getSortOrder = (book : string, chapterStart: number, verseStart: number): number => {
    if (!book || !booksReference) {
      console.log(`Invalid parameters: ${book}, ${chapterStart}, ${verseStart}`);
      return 0;
    }
    const bookIndex = booksReference.findIndex(b => b.name === book);
    const book_order = booksReference[bookIndex]?.book_order || '';
    if (!/^[AB]\d{2}$/.test(book_order ? book_order : '')) {
      console.log(`Invalid bookOrder format: ${book_order}`);
      return 0;
    }

    const base = book_order[0] === 'B' ? 100 : 0;
    const bookNum = base + parseInt(book_order.slice(1), 10);
    // console.log('booknum', bookNum, 'chapterStart', chapterStart, 'verseStart', verseStart);

    const sortOrder = bookNum * 1_000_000 + (chapterStart | 0) * 1_000 + (verseStart | 0);
    return sortOrder;
  }

  // First validate that we have a valid book name
  //let bookName: string | null = extractBookName(scriptureRange);
  const { bookName: extractedBookName, range } = extractBookNameAndRange(scriptureRange);
  const bookName = vaidateBookName(extractedBookName);
  if (!bookName) {
    // console.log("Invalid Book Name:", bookName);
    return null;
  }
  const bookId = getBookId(bookName);
  const bookCode = getBookCode(bookName);

  // 1. Full range: ch:v-ch:v (e.g. "1:1-4:22")
  let match = range.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
  if (match) {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: parseInt(match[1], 10),
      start_verse: parseInt(match[2], 10),
      end_chapter: parseInt(match[3], 10),
      end_verse: parseInt(match[4], 10),
      sort_order: getSortOrder(bookName, parseInt(match[1], 10), parseInt(match[2], 10))
    };
  }

  // 2. Range: ch:v-v (e.g. "3:1-30" means chapter 3, verse 1 to chapter 3, verse 30)
  match = range.match(/^(\d+):(\d+)-(\d+)$/);
  if (match) {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: parseInt(match[1], 10),
      start_verse: parseInt(match[2], 10),
      end_chapter: parseInt(match[1], 10), // same chapter
      end_verse: parseInt(match[3], 10),   // correct end verse
      sort_order: getSortOrder(bookName, parseInt(match[1], 10), parseInt(match[2], 10))
    };
  }

  // 3. Range: ch-ch:v (e.g. "1-4:22" means chapter 1 to 4, verse 22)
  match = range.match(/^(\d+)-(\d+):(\d+)$/);
  if (match) {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: parseInt(match[1], 10),
      start_verse: 1,
      end_chapter: parseInt(match[2], 10),
      end_verse: parseInt(match[3], 10),
      sort_order: getSortOrder(bookName, parseInt(match[1], 10), 1)
    };
  }

  // 4. Range: ch-ch (e.g. "1-4" means chapter 1 to 4, no verses)
  match = range.match(/^(\d+)-(\d+)$/);
  if (match) {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: parseInt(match[1], 10),
      start_verse: null,
      end_chapter: parseInt(match[2], 10),
      end_verse: null,
      sort_order: getSortOrder(bookName, parseInt(match[1], 10), 1)
    };
  }

  // 5. Single verse: ch:v (e.g. "3:10")
  match = range.match(/^(\d+):(\d+)$/);
  if (match) {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: parseInt(match[1], 10),
      start_verse: parseInt(match[2], 10),
      end_chapter: parseInt(match[1], 10),
      end_verse: parseInt(match[2], 10),
      sort_order: getSortOrder(bookName, parseInt(match[1], 10), parseInt(match[2], 10))
    };
  }

  // 6. Single: Book ch (e.g. "Daniel 13" means Daniel chapter 13, no verse)
  match = range.match(/^(\d+)$/);
  if (match) {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: parseInt(match[1], 10),
      start_verse: null,
      end_chapter: parseInt(match[1], 10),
      end_verse: null,
      sort_order: getSortOrder(bookName, parseInt(match[1], 10), 0)
    };
  }

  // Fallback: just book name
  if (range.trim() === "") {
    return {
      book: bookName,
      book_id: bookId,
      book_code: bookCode,
      start_chapter: 0,
      start_verse: null,
      end_chapter: null,
      end_verse: null,
      sort_order: getSortOrder(bookName, 0, 0)
    };
  }

  return null;
}