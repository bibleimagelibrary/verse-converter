# Bible Verse Converter

A TypeScript web application that parses Bible verse codes and converts them to human-readable format.

## Format

The application accepts Bible verse codes in the format: **BBBCCCVVV[SSMMM]**

- **BBB** (3 digits): Book ID (001-066 for standard 66-book Bible)
- **CCC** (3 digits): Chapter number (padded with leading zeros)
- **VVV** (3 digits): Verse number (padded with leading zeros)
- **SSMMM** (optional): Segment and Morpheme codes (ignored for conversion)

### Single Verses
- Input: `040001001` → Output: `Matthew 1:1`
- Input: `023150006` → Output: `Isaiah 15:6`
- Input: `006705011000000` → Output: `Joshua 7:5:11` (SSMMM ignored)

### Verse Ranges
Format: `BBBCCCVVV-BBBCCCVVV`

- Input: `040001001-040002010` → Output: `Matthew 1:1-2:10`
- Input: `011010001-011010013` → Output: `1 Kings 10:1-13`
- Input: `011010001-012001005` → Output: `1 Kings 10:1 - 2 Kings 1:5`

**Note:** Start verse must come before end verse in the Bible. The optional SSMMM suffix is ignored on both verses.

## Bible Books Reference

The application uses the standard 66-book Bible:

**Old Testament (39 books)**
1. Genesis through Malachi

**New Testament (27 books)**
39. Matthew through Revelation

All books are indexed 1-66 with their traditional order.

## Installation

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The application will open automatically at `http://localhost:5173`.

## Build

```bash
npm run build
```

Creates optimized production build in the `dist` directory.

## Features

- ✅ Parse single verse codes in BBBCCCVVV format
- ✅ Parse verse ranges in BBBCCCVVV-BBBCCCVVV format
- ✅ Convert to readable "Book Chapter:Verse" and "Book Chapter:Verse - Book Chapter:Verse" format
- ✅ Validate book IDs (1-66), chapter and verse numbers
- ✅ Validate verse ranges (start ≤ end)
- ✅ Display all 66 Bible books with their IDs for reference
- ✅ Responsive UI for desktop and mobile
- ✅ Real-time conversion with Enter key support

## Usage

1. Enter a verse code or range (e.g., `040001001` or `040001001-040002010`)
2. Click "Convert" or press Enter
3. View the formatted result and detailed breakdown
4. Reference the Bible books grid to find book IDs

## Testing
Manual testing through the UI:
1. Try single verses: `040001001` (Matthew 1:1), `023150006` (Isaiah 15:6)
2. Try verse ranges: `040001001-040001010` (Matthew 1:1-10), `011010001-011010013` (1 Kings 10:1-13)
3. Try ranges across chapters: `040001020-040002015` (Matthew 1:20 - 2:15)
4. Try invalid codes to see error messages
5. Reference Bible books grid for book IDs
6. Test with SSMMM suffix (e.g., `040001001000000` or `040001001-040002010000000`)

## Project Structure

```
verse-converter/
├── src/
│   ├── main.ts           # Main application logic and UI
│   ├── verse-parser.ts   # Verse parsing and validation
│   └── style.css         # Application styles
├── index.html            # Entry point
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with CSS variables

## License

MIT
