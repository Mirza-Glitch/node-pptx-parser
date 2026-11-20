import PptxParser from "node-pptx-parser";

const parser = new PptxParser("presentation.pptx");
const result: Promise<unknown> = parser.extractText();

void result;
