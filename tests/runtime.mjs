import assert from "node:assert/strict";
import { createRequire } from "node:module";
import PptxParser from "node-pptx-parser";

const require = createRequire(import.meta.url);
const CommonJsParser = require("node-pptx-parser").default;

for (const Parser of [PptxParser, CommonJsParser]) {
  const parser = new Parser("presentation.pptx");
  assert.equal(typeof parser.extractText, "function");
}
