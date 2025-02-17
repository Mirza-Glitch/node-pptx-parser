# node-pptx-parser

A Node.js library for parsing PowerPoint (PPTX) files and extracting text content. This library maintains text formatting, line breaks, and paragraph structures from the original presentation.

## Features

- Extract text content from PPTX files with preserved formatting

- Parse PPTX structure into manageable JavaScript objects

- Access raw XML content of presentation components

- Written in TypeScript for type safety

- Promise-based API

- Preserves line breaks and paragraph formatting

- Minimal dependencies

## Installation

```bash

npm  install  node-pptx-parser
```

## Usage

Once the package is installed you can you it with `import` or `require` statements like this:

```javascript
// ESM import:
import PptxParser from "node-pptx-parser";

// CommonJs require:
const PptxParser = require("node-pptx-parser").default;
```

### Basic Text Extraction

```typescript
import PptxParser from "node-pptx-parser";

async function main() {
  const parser = new PptxParser("presentation.pptx");

  try {
    // Extract text from all slides
    const textContent = await parser.extractText();

    // Print text from each slide
    textContent.forEach((slide) => {
      console.log(`\nSlide ${slide.id}:`);

      console.log(slide.text.join("\n"));
    });
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
```

### Advanced Usage - Full Presentation Parsing

```typescript
import PptxParser from "node-pptx-parser";

async function main() {
  const parser = new PptxParser("presentation.pptx");

  try {
    // Get complete parsed presentation content
    const parsedContent = await parser.parse();

    // Access presentation structure
    console.log(parsedContent.presentation.parsed);

    // Access individual slides
    parsedContent.slides.forEach((slide) => {
      console.log(`Slide ${slide.id}:`, slide.parsed);
    });

    // Access raw XML if needed
    console.log(parsedContent.presentation.xml);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
```

## API Reference

### `PptxParser`

The main class for parsing PPTX files.

#### Constructor

```typescript

constructor(filePath: string)
```

Creates a new instance of PptxParser.

- `filePath`: Path to the PPTX file to be parsed

#### Methods

##### `parse()`

```typescript

async parse(): Promise<ParsedPresentation>
```

Parses the entire PPTX file and returns its content.

- Returns: Promise resolving to a `ParsedPresentation` object containing the complete presentation structure

##### `extractText()`

```typescript

async extractText(): Promise<SlideTextContent[]>
```

Extracts formatted text content from all slides.

- Returns: Promise resolving to an array of `SlideTextContent` objects

### Types

#### `ParsedPresentation`

```typescript
interface ParsedPresentation {
  presentation: {
    path: string;
    xml: string;
    parsed: any;
  };
  relationships: {
    path: string;
    xml: string;
    parsed: any;
  };
  slides: ParsedSlide[];
}
```

#### `ParsedSlide`

```typescript
interface ParsedSlide {
  id: string;
  path: string;
  xml: string;
  parsed: any;
}
```

#### `SlideTextContent`

```typescript
interface SlideTextContent extends ParsedSlide {
  text: string[];
}
```

## Error Handling

The library throws errors in the following cases:

- Invalid PPTX file structure

- File reading errors

- XML parsing errors

Example error handling:

```typescript
try {
  const parser = new PptxParser("presentation.ppt");
  const content = await parser.extractText();
} catch (error) {
  if (error.message.includes("Invalid PPTX file structure")) {
    console.error("The PPTX file is corrupted or invalid");
  } else {
    console.error("An error occurred:", error.message);
  }
}
```

## Dependencies

- unzipper: For extracting PPTX files
- xml2js: For parsing XML content

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
