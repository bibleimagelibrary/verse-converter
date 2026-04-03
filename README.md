# Bible Verse Converter

A TypeScript + Vite web app that converts Bible references between code format and readable format, and retrieves parallel passages.

## Supported Input Formats

### Code Format

`BBBCCCVVV[SSSMMM]` or `BBBCCCVVV[SSSMMM]-BBBCCCVVV[SSSMMM]`

- `BBB`: Book ID (001-066)
- `CCC`: Chapter (3 digits)
- `VVV`: Verse (3 digits)
- `SSSMMM`: Optional segment/morpheme suffix (ignored by parsing/conversion)

Examples:

- `042012053`
- `040001002-040003004`
- `040001001000000`

### Readable Format

Book names and book codes are supported, including numeric codes like `1TI`.

Examples:

- `Luke 10`
- `MAT 1:1-2`
- `MAT 1:23-2:1`
- `1TI 1-4`

## Parsing and Range Rules

- Start must come before end in Bible order.
- Chapter-only references use internal chapter-wide handling.
- `999` is used internally for chapter-end API ranges and is hidden from user-facing output.

## Parallel Passages Output

- Parallel passages are grouped and sorted by requested passage order.
- Each scripture reference in the parallel passage cards is rendered as a bible.com link.
- URL format:
	- `https://www.bible.com/bible/<versionId>/<bookCode>.<chapter>.<verse>`
- Same-chapter ranges include end verse in URL:
	- `MAT 1:23-24` -> `.../MAT.1.23-24`
- Cross-chapter ranges use start chapter/verse only:
	- `MAT 1:23-2:1` -> `.../MAT.1.23`

## UI Behavior

- Convert/Clear buttons remain between input and results cards.
- Floating return-to-top button appears at bottom-right after scrolling.
- Raw API Data panel:
	- Hidden when there is no input/result.
	- Rendered only after conversion.
	- Collapsed by default.
- Spaces around range dashes are normalized on Convert/Enter (not while typing).

## Run Locally

Install dependencies:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Project Structure

```text
verse-converter/
├── src/
│   ├── main.ts                   # UI, conversion flow, API integration
│   ├── verse-parser.ts  # Main parsing/formatting logic
│   ├── book-service.ts           # Book lookup/fetch helpers
│   └── style.css                 # Styling
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## Manual Test Checklist

1. Code single verse: `042012053`
2. Code range: `040001002-040003004`
3. Readable single verse: `MAT 1:23`
4. Readable same-chapter range: `MAT 1:23-24`
5. Readable cross-chapter range: `MAT 1:23-2:1`
6. Readable chapter-only: `MAT 1`
7. Readable numeric book code: `1TI 1-4`
8. Confirm Raw API Data is hidden initially and collapsed when shown
9. Confirm parallel passage references open bible.com links

## Tech Stack

- TypeScript
- Vite
- Vanilla JS/DOM APIs
- Tailwind/CSS

## License

MIT
