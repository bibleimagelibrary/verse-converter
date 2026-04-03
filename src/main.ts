import {
  parseVerseRange,
  parseReadableRange,
  rangeToCode,
  ParsedVerse,
  ParsedVerseRange,
} from "./verse-parser";
import { fetchBooks, Book, getBookById, getBookByCode } from "./book-service";
import "./style.css";

// You version linke format is https://www.bible.com/bible/${versionId}/${bookCode}.${chapter}.${verse};
const YOU_VERSION_URL = 'https://www.bible.com/bible/';
const YOU_VERSION_NASB2020 = '2692'; // Book ID for NASB2020 in YouVersion URL
const bible_link = YOU_VERSION_URL + YOU_VERSION_NASB2020 + '/';


const app = document.querySelector<HTMLDivElement>("#app")!;
const PARALLEL_PASSAGES_API =
  "https://q9md038uhk.execute-api.us-east-1.amazonaws.com/parallel-passages";
const logoSrc = `${import.meta.env.BASE_URL}verse-converter.png`;

app.innerHTML = `
  <div class="mx-auto max-w-[1040px] px-3 py-2 md:px-4">
    <div class="mb-2 flex items-center justify-center gap-3">
      <img src="${logoSrc}" alt="Verse Converter logo" class="h-12 w-12 rounded" />
      <h1 class="m-0 text-center text-2xl font-bold leading-tight text-slate-800 md:text-2xl">Bible Verse Converter & Parallel Passages</h1>
    </div>
    
    <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[1.5fr_auto_1.2fr]">
      <div class="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <label for="readableInput" class="text-[0.95rem] font-semibold text-slate-800">Human-Readable Format</label>
            <input 
              type="text" 
              id="readableInput" 
              maxlength="100"
              class="app-input"
            />
            <p class="m-0 text-[0.85rem] text-slate-500">e.g., Luke 10  or  LUK 1-2  or  MAT 1:1-2  or  MAR 1:1-2:5 </p>
          </div>

          <div class="flex flex-col gap-2">
            <label for="codeInput" class="text-[0.95rem] font-semibold text-slate-800">Verse Code Format</label>
            <input 
              type="text" 
              id="codeInput" 
              maxlength="50"
              class="app-input"
            />
            <p class="m-0 text-[0.8rem] text-slate-500">BBBCCCVVV[SSSMMM] (Book-Chapter-Verse-Segment-Morpheme)</p>
            <p class="m-0 text-[0.85rem] text-slate-500">e.g., 042012053 or 040001002-040003004</p>
          </div>

          <div id="rawParallelData" class="hidden"></div>
        </div>
      </div>

      <div class="sticky top-0 flex items-start justify-stretch md:justify-center md:pt-6">
        <div class="flex w-full flex-row gap-2 md:w-auto md:flex-col md:items-stretch md:gap-3">
          <button id="convertBtn" class="app-btn-primary">⇄ Convert</button>
          <button id="clearBtn" class="app-btn-secondary">⊗ Clear</button>
        </div>
      </div>

      <div id="result" class="hidden rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <div id="resultContent" class="mb-4 pb-4 border-b border-slate-200"></div>
        <div id="parallelSection" class="hidden">
          <h2 class="mb-4 mt-0 text-2xl font-semibold text-slate-800">Parallel Passages</h2>
          <div id="parallelContent"></div>
        </div>
      </div>
    </div>

    <div class="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h2 class="mb-4 mt-0 text-2xl font-semibold text-slate-800">Bible Books Reference</h2>
      <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]" id="booksGrid"></div>
    </div>

    <button id="returnToTopBtn" class="fixed bottom-6 right-6 hidden !h-12 !w-12 items-center justify-center rounded-full text-white shadow-lg transition" style="background-color: var(--color-primary);" title="Return to top">
      ↑
    </button>
  </div>
`;

const codeInput = document.querySelector<HTMLInputElement>("#codeInput")!;
const readableInput = document.querySelector<HTMLInputElement>(
  "#readableInput"
)!;
const convertBtn = document.querySelector<HTMLButtonElement>("#convertBtn")!;
const clearBtn = document.querySelector<HTMLButtonElement>("#clearBtn")!;
const resultDiv = document.querySelector<HTMLDivElement>("#result")!;
const resultContent = document.querySelector<HTMLDivElement>(
  "#resultContent"
)!;
const parallelSection = document.querySelector<HTMLDivElement>(
  "#parallelSection"
)!;
const parallelContent = document.querySelector<HTMLDivElement>(
  "#parallelContent"
)!;
const booksGrid = document.querySelector<HTMLDivElement>("#booksGrid")!;
const returnToTopBtn = document.querySelector<HTMLButtonElement>(
  "#returnToTopBtn"
)!;

// Return to top button functionality
window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    returnToTopBtn.classList.remove("hidden");
    returnToTopBtn.classList.add("flex");
  } else {
    returnToTopBtn.classList.add("hidden");
    returnToTopBtn.classList.remove("flex");
  }
});

returnToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "auto" });
});

returnToTopBtn.addEventListener("mouseenter", () => {
  returnToTopBtn.style.backgroundColor = "var(--color-primary-dark)";
});

returnToTopBtn.addEventListener("mouseleave", () => {
  returnToTopBtn.style.backgroundColor = "var(--color-primary)";
});

// Initialize app
async function initializeApp() {
  try {
    const books = await fetchBooks();
    populateBooksGrid(books);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showError("Failed to load books from API");
  }
}

function populateBooksGrid(books: Book[]) {
  books.forEach((book) => {
    const bookItem = document.createElement("div");
    bookItem.className =
      "flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 p-2 text-[0.8rem] transition app-hover-primary-border hover:bg-slate-200 cursor-pointer";
    bookItem.innerHTML = `
      <div class="flex flex-col font-mono font-bold app-text-primary min-w-[35px] text-[0.75rem] leading-tight">
        <span>${String(book.id).padStart(3, "0")}</span>
        <span>${book.code}</span>
      </div>
      <span class="flex-1">${book.name}</span>
    `;
    
    bookItem.addEventListener("click", () => {
      readableInput.value = book.code + " ";
      readableInput.focus();
    });
    
    booksGrid.appendChild(bookItem);
  });
}

function showError(message: string) {
  const booksGrid = document.querySelector<HTMLDivElement>("#booksGrid")!;
  booksGrid.innerHTML = `<div style="grid-column: 1/-1; color: var(--color-secondary);">${message}</div>`;
}

function parseScriptureIndexes(scripture: string): { start: number; end: number } | null {
  const match = scripture
    .trim()
    .toUpperCase()
    .match(/^([A-Z0-9]{3})\s+(\d+):(\d+)(?:-(\d+))?$/);

  if (!match) {
    return null;
  }

  const [, bookCode, chapterStr, verseStartStr, verseEndStr] = match;
  const book = getBookByCode(bookCode);
  if (!book) {
    return null;
  }

  const chapter = Number(chapterStr);
  const verseStart = Number(verseStartStr);
  const verseEnd = verseEndStr ? Number(verseEndStr) : verseStart;

  const start = Number(
    `${book.id}${String(chapter).padStart(3, "0")}${String(verseStart).padStart(3, "0")}`
  );
  const end = Number(
    `${book.id}${String(chapter).padStart(3, "0")}${String(verseEnd).padStart(3, "0")}`
  );

  return { start, end };
}

function overlapsRequestedRange(
  scripture: string,
  requestedStartIdx: number,
  requestedEndIdx: number
): boolean {
  const indexes = parseScriptureIndexes(scripture);
  if (!indexes) {
    return false;
  }

  return indexes.start <= requestedEndIdx && requestedStartIdx <= indexes.end;
}

function renderScriptureReference(scripture: string): string {
  const match = scripture
    .trim()
    .toUpperCase()
    .match(/^([A-Z0-9]{3})\s+(\d+):(\d+)(?:-(\d+)|-(\d+):(\d+))?$/);
  if (!match) {
    return scripture;
  }

  const [, bookCode, chapter, verseStart, sameChapterEndVerse] = match;
  const versePart = sameChapterEndVerse
    ? `${verseStart}-${sameChapterEndVerse}`
    : verseStart;
  const href = `${bible_link}${bookCode}.${chapter}.${versePart}`;
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="underline decoration-slate-400 underline-offset-2 hover:decoration-current">${scripture}</a>`;
}

async function lookupParallelPassages(parsed: ParsedVerseRange) {
  const startVerse = parsed.startVerse!;
  const endVerse = parsed.endVerse!;

  // Normalize chapter-only parsed verses to 0 for API request construction.
  const startVerseNum = startVerse.verse ?? 0;
  const endVerseNum = endVerse.verse ?? 0;
  
  // Helper function to format verse index with chapter-only support
  const getVerseIndex = (verse: ParsedVerse): number => {
    const bookId = String(verse.bookId!).padStart(3, "0");
    const chapter = String(verse.chapter!).padStart(3, "0");
    const normalizedVerseNum = verse === startVerse ? startVerseNum : endVerseNum;
    const verseNum = String(normalizedVerseNum).padStart(3, "0");
    return Number(bookId + chapter + verseNum);
  };
  
  const requestedStartIdx = getVerseIndex(startVerse);
  const requestedEndIdx = getVerseIndex(endVerse);

  const startBookId = String(startVerse.bookId!).padStart(3, "0");
  const startChapter = String(startVerse.chapter!).padStart(3, "0");
  const chapterMaxEndIdx = Number(startBookId + startChapter + "999");

  // Determine end_idx based on input type
  let endIdx = requestedEndIdx;
  if (requestedStartIdx === requestedEndIdx) {
    // No range specified (start and end are the same)
    if (startVerse.verse !== undefined && startVerse.verse !== 999) {
      // Single explicit verse (e.g., "MAT 1:24") - lookup that verse only
      endIdx = requestedStartIdx;
    } else if (startVerse.verse === undefined && endVerse.verse === undefined) {
      // Chapter-only (e.g., "MAT 1") - span the whole chapter with 999
      endIdx = chapterMaxEndIdx;
    }
  }

  const scripture: Record<string, number> = {
    start_idx: requestedStartIdx,
    end_idx: endIdx,
  };

  // Use the same effective range for client-side filtering as the API request payload.
  const filterStartIdx = scripture.start_idx;
  const filterEndIdx = scripture.end_idx;

  const endpoint = `${PARALLEL_PASSAGES_API}?scripture=${encodeURIComponent(
    JSON.stringify(scripture)
  )}`;

  parallelContent.innerHTML = `<p class="m-0 text-slate-500">Looking up parallel passages...</p>`;
  parallelSection.classList.remove("hidden");

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: unknown = await response.json();

    // Display raw parallel data for validation
    const rawDataDisplay = document.querySelector<HTMLDivElement>("#rawParallelData");
    if (rawDataDisplay) {
      rawDataDisplay.innerHTML = `<details style="margin-top: 12px; padding: 8px; background: #f3f4f6; border-radius: 4px; border: 1px solid #d1d5db;"><summary style="cursor: pointer; font-weight: bold; color: #666;">Raw API Data (Validation)</summary><pre style="margin: 8px 0 0 0; font-size: 0.75rem; overflow-x: auto;">${JSON.stringify({ normalizedParsed: { startVerse: { ...startVerse, verse: startVerseNum }, endVerse: { ...endVerse, verse: endVerseNum } }, request: scripture, response: data }, null, 2)}</pre></details>`;
      rawDataDisplay.classList.remove("hidden");
    }

    // Parse the data to display results. API may return either:
    // 1) [{ passage_id, scriptures: [...] }, ...]
    // 2) { scriptures: [...] }
    let readableHtml = "";

    type PassageGroup = { passage_id: string | number; scriptures: string[] };
    const normalizedGroups: PassageGroup[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        if (
          typeof item === "object" &&
          item !== null &&
          "scriptures" in item &&
          Array.isArray((item as { scriptures?: unknown }).scriptures)
        ) {
          const passageId =
            "passage_id" in item
              ? (item as { passage_id?: string | number }).passage_id ?? "unknown"
              : "unknown";
          const scriptures = (item as { scriptures: unknown[] }).scriptures.filter(
            (s): s is string => typeof s === "string"
          );

          if (scriptures.length > 0) {
            normalizedGroups.push({ passage_id: passageId, scriptures });
          }
        }
      }
    } else if (typeof data === "object" && data !== null) {
      const apiData = data as { scriptures?: unknown[] };
      if (Array.isArray(apiData.scriptures)) {
        const scriptures = apiData.scriptures.filter(
          (item): item is string => typeof item === "string"
        );
        if (scriptures.length > 0) {
          normalizedGroups.push({ passage_id: "result", scriptures });
        }
      }
    }

    // Build a mapping of requested book passages to groups, then sort by chapter:verse
    const requestedBook = getBookById(startVerse.bookId!);
    const requestedBookCode = requestedBook?.code.toUpperCase();

    type GroupMapping = {
      groupIndex: number;
      passage: string;
      indexes: { start: number; end: number };
    };

    const groupOrderMapping: GroupMapping[] = [];

    for (let groupIndex = 0; groupIndex < normalizedGroups.length; groupIndex++) {
      const group = normalizedGroups[groupIndex];
      const requestedScriptures = group.scriptures.filter((scripture) =>
        overlapsRequestedRange(scripture, filterStartIdx, filterEndIdx)
      );

      // Take the first requested passage from this group
      if (requestedScriptures.length > 0) {
        const indexes = parseScriptureIndexes(requestedScriptures[0]);
        if (indexes) {
          groupOrderMapping.push({
            groupIndex,
            passage: requestedScriptures[0],
            indexes,
          });
        }
      }
    }

    // Sort the mapping by chapter:verse ranges
    groupOrderMapping.sort((a, b) => a.indexes.start - b.indexes.start);

    // Now render groups in the sorted order (keeping groups intact)
    readableHtml = `<div class="space-y-3">`;

    for (const mapping of groupOrderMapping) {
      const group = normalizedGroups[mapping.groupIndex];
      const requestedScriptures = group.scriptures.filter((scripture) =>
        overlapsRequestedRange(scripture, filterStartIdx, filterEndIdx)
      );
      const parallelScriptures = group.scriptures.filter(
        (scripture) =>
          !overlapsRequestedRange(scripture, filterStartIdx, filterEndIdx)
      );

      // Separate parallel passages by requested book and others
      const requestedBookParallels = parallelScriptures.filter((scripture) => {
        const bookCode = scripture.split(/\s+/)[0];
        return bookCode.toUpperCase() === requestedBookCode;
      });
      const otherBookParallels = parallelScriptures.filter((scripture) => {
        const bookCode = scripture.split(/\s+/)[0];
        return bookCode.toUpperCase() !== requestedBookCode;
      });

      // Build scriptures for this group in order
      const groupScriptures = [...requestedScriptures, ...requestedBookParallels, ...otherBookParallels];

      if (groupScriptures.length > 0) {
        readableHtml += `<div class="rounded-md border border-slate-300 bg-slate-50 p-3">`;
        readableHtml += `<div class="mb-2 rounded app-bg-primary-soft p-2 font-mono text-[0.95rem] font-semibold app-text-primary" style="border-left:4px solid var(--color-primary); box-shadow: inset 0 0 0 1px rgba(var(--color-primary),0.25);">${renderScriptureReference(groupScriptures[0])}</div>`;

        if (groupScriptures.length > 1) {
          readableHtml += `<div class="grid gap-1.5">`;
          for (let i = 1; i < groupScriptures.length; i++) {
            readableHtml += `<div class="rounded bg-white p-2 font-mono text-[0.9rem] app-text-secondary" style="border-left:3px solid var(--color-secondary);">${renderScriptureReference(groupScriptures[i])}</div>`;
          }
          readableHtml += `</div>`;
        }
        readableHtml += `</div>`;
      }
    }

    readableHtml += `</div>`;

    parallelContent.innerHTML = readableHtml || `<p class="m-0 text-slate-500">No parallel passages found in response.</p>`;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch parallel passages.";

    parallelContent.innerHTML = `<p class="m-0 app-text-secondary">${message}</p>`;
  }
}

async function handleConvert() {
  // Normalize verse ranges to remove spaces around dashes
  codeInput.value = normalizeRangeDashSpacing(codeInput.value);
  readableInput.value = normalizeRangeDashSpacing(readableInput.value);

  const codeValue = codeInput.value.trim();
  const readableValue = readableInput.value.trim();

  // Determine which input to parse
  let parsed;

  if (codeValue && !readableValue) {
    // Parse code format
    parsed = parseVerseRange(codeValue);
  } else if (readableValue && !codeValue) {
    // Parse readable format
    parsed = parseReadableRange(readableValue);
  } else if (!codeValue && !readableValue) {
    resultDiv.classList.add("hidden");
    parallelSection.classList.add("hidden");
    return;
  } else {
    // Both filled - unclear which to use
    resultContent.innerHTML = `
      <div>
        <h3 class="mb-4 text-xl app-text-secondary">❌ Ambiguous Input</h3>
        <p class="my-2 app-text-secondary">Please fill in either the Code Format OR the Readable Format, not both.</p>
      </div>
    `;
    resultDiv.classList.remove("hidden");
    parallelSection.classList.add("hidden");
    return;
  }

  if (!parsed.isValid) {
    resultContent.innerHTML = `
      <div>
        <h3 class="mb-4 text-xl app-text-secondary">❌ Invalid Input</h3>
        <p class="my-2 app-text-secondary">${parsed.error}</p>
      </div>
    `;
    resultDiv.classList.remove("hidden");
    parallelSection.classList.add("hidden");
    return;
  }

  // Generate output from parser
  const generatedCode = rangeToCode(parsed);
  const generatedReadable = parsed.formatted || "";

  // Always normalize both fields to parsed output so visible input reflects parser results.
  readableInput.value = generatedReadable;
  codeInput.value = generatedCode;

  resultContent.innerHTML = `<p class="m-0 text-lg font-semibold text-slate-800">${generatedReadable}</p>`;
  resultDiv.classList.remove("hidden");

  await lookupParallelPassages(parsed);
}

// Event listeners
convertBtn.addEventListener("click", () => {
  void handleConvert();
});

clearBtn.addEventListener("click", () => {
  codeInput.value = "";
  readableInput.value = "";
  resultDiv.classList.add("hidden");
  parallelSection.classList.add("hidden");
  document.querySelector<HTMLDivElement>("#rawParallelData")?.classList.add("hidden");
  readableInput.focus();
});

// Enter key on either input field
codeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    void handleConvert();
  }
});
readableInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    void handleConvert();
  }
});

// Normalize verse ranges to remove spaces around dashes.
const normalizeRangeDashSpacing = (value: string): string =>
  value.replace(/\s*-\s*/g, "-");

// Clear the other field when typing
codeInput.addEventListener("input", () => {
  if (codeInput.value.trim()) {
    readableInput.value = "";
  }
});
readableInput.addEventListener("input", () => {
  if (readableInput.value.trim()) {
    codeInput.value = "";
  }
});

// Focus the code input when page loads
readableInput.focus();

// Initialize app - fetch books and populate grid
initializeApp();
