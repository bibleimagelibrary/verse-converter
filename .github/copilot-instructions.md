# Copilot Instructions for verse-converter

## Project Overview
Bible Verse Converter is a TypeScript/Vite web application that parses Bible verse codes in BBBCCCVVV format and converts them to human-readable "Book Chapter:Verse" format using the standard 66-book Bible index.   It also returns all parallel passages in a verse range. The app validates input and displays error messages for invalid codes or ranges. It features a responsive design and a reference grid of Bible books with their IDs.

## Key Technologies
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI**: Vanilla JavaScript with CSS3
- **No external dependencies** for core functionality

## Important Features
- Parses single verse codes (BBBCCCVVV) where BBB is book ID, CCC is chapter, VVV is verse
- Parses verse ranges in BBBCCCVVVSSMMM-BBBCCCVVVSSMMM format (start-end)
- Supports SSMMM suffix which is ignored (for future segment/morpheme codes)
- Validates input: book IDs 1-66, chapter/verse > 0
- Validates ranges: start verse ≤ end verse in Bible order
- Displays all 66 Bible books with their IDs
- Responsive design for desktop and mobile

## Running the Project

### Development
```bash
npm run dev
```
Opens at `http://localhost:5173` with hot module reloading.

### Production Build
```bash
npm run build
```
Creates optimized output in `dist/` directory.

### Preview Build
```bash
npm run preview
```
Preview production build locally.

## File Structure
- `src/main.ts` - Application UI and event handlers
- `src/verse-parser.ts` - Core parsing and validation logic
- `src/style.css` - Modern responsive styling
- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript compiler options

## Testing
Manual testing through the UI:
1. Try valid single verses: `040001001` (Matthew 1:1), `023150006` (Isaiah 15:6)
2. Try verse ranges: `040001001-040001010` (Matthew 1:1-10), `011010001-011010013` (1 Kings 10:1-13)
3. Try invalid codes to see error messages
4. Reference Bible books grid for book IDs
5. Test with SSMMM suffix (e.g., `040001001000000` or `040001001-040002010000000`)
6. Test invalid ranges (e.g., end before start)

## Customization
To add translations or modify parser behavior, edit `src/verse-parser.ts`.

## Performance
Builds to just 3.82 KB (gzipped 1.72 KB) with zero runtime dependencies.
