import PptxParser from "node-pptx-parser";

const parser = new PptxParser("presentation.pptx");
void parser.extractText();
