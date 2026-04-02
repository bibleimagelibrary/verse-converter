import {
  parseVerseRange,
  parseReadableRange,
  rangeToCode,
  ParsedVerse,
  ParsedVerseRange,
} from "./verse-parser";
import { fetchBooks, Book, getBookById, getBookByCode } from "./book-service";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const PARALLEL_PASSAGES_API =
  "https://q9md038uhk.execute-api.us-east-1.amazonaws.com/parallel-passages";

app.innerHTML = `
  <div class="mx-auto max-w-[1040px] px-3 py-2 md:px-4">
    <div class="mb-2 flex items-center justify-center gap-3">
      <img src="/verse-converter.png" alt="Verse Converter logo" class="h-12 w-12 rounded" />
      <h1 class="m-0 text-center text-2xl font-bold leading-tight text-slate-800 md:text-2xl">Bible Verse Converter & Parallel Passages</h1>
    </div>
    
    <div class="mb-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
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
            <p class="m-0 text-[0.8rem] text-slate-500">Book Chapter or Book C:V or Book C:V - Book C:V</p>
            <p class="m-0 text-[0.85rem] text-slate-500">e.g., Luke 10 or Matthew 1:1 or MAT 1:1-2:10</p>
          </div>

          <div class="flex flex-col gap-2">
            <label for="codeInput" class="text-[0.95rem] font-semibold text-slate-800">Verse Code Format</label>
            <input 
              type="text" 
              id="codeInput" 
              maxlength="50"
              class="app-input"
            />
            <p class="m-0 text-[0.8rem] text-slate-500">BBBCCCVVV or BBBCCCVVV-BBBCCCVVV</p>
            <p class="m-0 text-[0.85rem] text-slate-500">e.g., 040001001 or 040001001-040002010</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-stretch md:justify-center">
        <div class="flex w-full flex-row gap-2 md:w-auto md:flex-col md:items-stretch md:gap-3">
          <button id="convertBtn" class="app-btn-primary">⇄ Convert</button>
          <button id="clearBtn" class="app-btn-secondary">⊗ Clear</button>
        </div>
      </div>

      <div id="result" class="hidden rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <div id="resultContent"></div>
      </div>
    </div>

    <div id="parallelSection" class="hidden mb-5 rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h2 class="mb-3 mt-0 text-2xl font-semibold text-slate-800">Parallel Passages</h2>
      <div id="parallelContent"></div>
    </div>

    <div class="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
      <h2 class="mb-4 mt-0 text-2xl font-semibold text-slate-800">Bible Books Reference</h2>
      <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" id="booksGrid"></div>
    </div>
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
      "flex items-center gap-2 rounded-md border border-slate-300 bg-slate-100 p-3 text-[0.9rem] transition app-hover-primary-border hover:bg-slate-200";
    bookItem.innerHTML = `<span class="min-w-[45px] font-mono font-bold app-text-primary">${String(book.id).padStart(
      3,
      "0"
    )}</span> ${book.name} <span class="ml-2 font-mono text-[0.8rem] text-slate-500">(${book.code})</span>`;
    booksGrid.appendChild(bookItem);
  });
}

function showError(message: string) {
  const booksGrid = document.querySelector<HTMLDivElement>("#booksGrid")!;
  booksGrid.innerHTML = `<div style="grid-column: 1/-1; color: var(--color-secondary);">${message}</div>`;
}

function formatVerseIndex(verse: ParsedVerse): number {
  const bookId = String(verse.bookId!);
  const chapter = String(verse.chapter!).padStart(3, "0");
  const verseNum = String(verse.verse!).padStart(3, "0");
  return Number(`${bookId}${chapter}${verseNum}`);
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

async function lookupParallelPassages(parsed: ParsedVerseRange) {
  const startVerse = parsed.startVerse!;
  const endVerse = parsed.endVerse!;
  const requestedStartIdx = formatVerseIndex(startVerse);
  const requestedEndIdx = formatVerseIndex(endVerse);

  const scripture = {
    start_idx: requestedStartIdx,
    end_idx: requestedEndIdx,
  };

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
    const jsonOutput = JSON.stringify(data, null, 2);

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

    for (const group of normalizedGroups) {
      const requestedScriptures = group.scriptures.filter((scripture) =>
        overlapsRequestedRange(scripture, requestedStartIdx, requestedEndIdx)
      );
      const parallelScriptures = group.scriptures.filter(
        (scripture) =>
          !overlapsRequestedRange(scripture, requestedStartIdx, requestedEndIdx)
      );

      const orderedScriptures = [...requestedScriptures, ...parallelScriptures];

      readableHtml += `<div class="mb-3 rounded-md border border-slate-300 bg-slate-50 p-3">`;
      readableHtml += `<div class="mb-2 text-[0.85rem] font-semibold text-slate-500">Passage ID: ${group.passage_id}</div>`;

      if (orderedScriptures.length > 0) {
        readableHtml += `<div class="mb-2 rounded app-bg-primary-soft p-2 font-mono text-[0.95rem] font-semibold app-text-primary" style="border-left:4px solid var(--color-primary); box-shadow: inset 0 0 0 1px rgba(var(--color-primary),0.25);">${orderedScriptures[0]}</div>`;
      }

      if (orderedScriptures.length > 1) {
        readableHtml += `<div class="grid gap-1.5">`;
        for (let i = 1; i < orderedScriptures.length; i++) {
          readableHtml += `<div class="rounded bg-white p-2 font-mono text-[0.9rem] app-text-secondary" style="border-left:3px solid var(--color-secondary);">${orderedScriptures[i]}</div>`;
        }
        readableHtml += `</div>`;
      }
      readableHtml += `</div>`;
    }

    parallelContent.innerHTML = `
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="rounded-lg border border-slate-300 bg-white p-4">
          <h3 class="mb-3 text-lg font-semibold text-slate-800">Raw Response</h3>
          <pre class="m-0 break-words whitespace-pre-wrap rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm leading-[1.4]">${jsonOutput}</pre>
        </div>
        <div class="rounded-lg border border-slate-300 bg-white p-4">
          <h3 class="mb-3 text-lg font-semibold text-slate-800">Grouped by Passage</h3>
          ${readableHtml || `<p class="m-0 text-slate-500">No grouped passage data found in response.</p>`}
        </div>
      </div>
    `;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to fetch parallel passages.";

    parallelContent.innerHTML = `<p class="m-0 app-text-secondary">${message}</p>`;
  }
}

async function handleConvert() {
  const codeValue = codeInput.value.trim();
  const readableValue = readableInput.value.trim();

  // Determine which input to parse
  let sourceIsCode = false;
  let parsed;

  if (codeValue && !readableValue) {
    // Parse code format
    sourceIsCode = true;
    parsed = parseVerseRange(codeValue);
  } else if (readableValue && !codeValue) {
    // Parse readable format
    sourceIsCode = false;
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

  // Generate the converted format
  const startVerse = parsed.startVerse!;
  const endVerse = parsed.endVerse!;

  // Check if it's a single verse or a range
  const isSingleVerse =
    startVerse.bookId === endVerse.bookId &&
    startVerse.chapter === endVerse.chapter &&
    startVerse.verse === endVerse.verse;

  // Generate output
  const generatedCode = rangeToCode(parsed);
  const generatedReadable = parsed.formatted || "";

  // Update input fields with the converted values
  if (sourceIsCode) {
    readableInput.value = generatedReadable;
  } else {
    codeInput.value = generatedCode;
  }

  // Display result
  // Get official book names from the books table
  const startBook = getBookById(startVerse.bookId!);
  const endBook = getBookById(endVerse.bookId!);
  
  const startBookName = startBook?.name || startVerse.bookName;
  const endBookName = endBook?.name || endVerse.bookName;

  let detailsHtml = "";

  if (isSingleVerse) {
    detailsHtml = `
      <p><strong>Book:</strong> ${startBookName}</p>
      <p><strong>Chapter:</strong> ${startVerse.chapter}</p>
      <p><strong>Verse:</strong> ${startVerse.verse}</p>
    `;
  } else {
    detailsHtml = `
      <p><strong>Start:</strong> ${startBookName} ${startVerse.chapter}:${startVerse.verse}</p>
      <p><strong>End:</strong> ${endBookName} ${endVerse.chapter}:${endVerse.verse}</p>
    `;
  }

  resultContent.innerHTML = `
    <div>
      <div class="text-slate-800">
        ${detailsHtml}
      </div>
    </div>
  `;
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
