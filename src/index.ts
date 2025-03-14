import unzipper from "unzipper";
import xml2js from "xml2js";
import {
  ParsedPresentation,
  SlideRelation,
  SlideTextContent,
  ParsedSlide,
} from "./types";

/**
 * PptxParser - A class for parsing PowerPoint (PPTX) files and extracting their content
 *
 * This parser can:
 * - Extract raw XML content from PPTX files
 * - Parse the XML into JavaScript objects
 * - Extract formatted text content from slides
 * - Preserve line breaks and paragraph formatting
 *
 * PPTX files are essentially ZIP archives containing XML files. The main files we care about are:
 * - presentation.xml: Contains the main presentation structure
 * - _rels/presentation.xml.rels: Contains relationships between presentation parts
 * - slides/slide*.xml: Contains individual slide content
 */
export default class PptxParser {
  private filePath: string;

  /**
   * Creates a new instance of PptxParser
   * @param filePath - Path to the PPTX file to be parsed
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Parses the entire PPTX file and returns its content
   *
   * This method:
   * 1. Opens the PPTX file as a ZIP archive
   * 2. Extracts and parses the presentation.xml
   * 3. Extracts and parses the relationship file
   * 4. Finds and parses all slides
   *
   * @returns Promise<ParsedPresentation> - Object containing parsed presentation data
   * @throws Error if the PPTX file is invalid or cannot be parsed
   */
  async parse(): Promise<ParsedPresentation> {
    try {
      const directory = await unzipper.Open.file(this.filePath);

      // Find main XML files in the PPTX structure
      const presentationXml = directory.files.find(
        (d) => d.path === "ppt/presentation.xml"
      );
      const slideRelationsXml = directory.files.find(
        (d) => d.path === "ppt/_rels/presentation.xml.rels"
      );

      if (!presentationXml || !slideRelationsXml) {
        throw new Error("Invalid PPTX file structure");
      }

      // Extract and parse the main presentation content
      const presentationContent = await this.getFileContent(presentationXml);
      const relationshipsContent = await this.getFileContent(slideRelationsXml);

      const presentationData = await this.parseXmlContent(presentationContent);
      const relationshipsData = await this.parseXmlContent(
        relationshipsContent
      );

      // Get information about all slides
      const slideRelations = this.getSlideRelations(relationshipsData);

      // Parse each slide in parallel
      const slides = await Promise.all(
        slideRelations.map(async (relation) => {
          const slideFile = directory.files.find(
            (f) => f.path === `ppt/${relation.target}`
          );
          if (!slideFile) return null;

          const slideContent = await this.getFileContent(slideFile);
          return {
            id: relation.id,
            path: slideFile.path,
            xml: slideContent,
            parsed: await this.parseXmlContent(slideContent),
          };
        })
      );

      return {
        presentation: {
          path: "ppt/presentation.xml",
          xml: presentationContent,
          parsed: presentationData,
        },
        relationships: {
          path: "ppt/_rels/presentation.xml.rels",
          xml: relationshipsContent,
          parsed: relationshipsData,
        },
        slides: slides.filter((slide): slide is ParsedSlide => slide !== null),
      };
    } catch (error) {
      throw new Error(`Failed to parse PPTX: ${(error as Error).message}`);
    }
  }

  /**
   * Extracts content from a file within the PPTX archive
   *
   * @param file - A file from the unzipper library
   * @returns Promise<string> - The file's content as a string
   */
  private async getFileContent(file: unzipper.File): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = "";
      file
        .stream()
        .on("data", (chunk) => (data += chunk))
        .on("end", () => resolve(data))
        .on("error", reject);
    });
  }

  /**
   * Parses XML content into a JavaScript object
   *
   * @param xmlContent - Raw XML string to parse
   * @returns Promise<any> - Parsed JavaScript object
   */
  private async parseXmlContent(xmlContent: string): Promise<any> {
    return new Promise((resolve, reject) => {
      xml2js.parseString(xmlContent, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Extracts slide relations from the presentation relationships XML
   *
   * In PPTX files, slides are referenced by relationships in the presentation.xml.rels file.
   * This method finds all slide references in these relationships.
   *
   * @param relationshipsData - Parsed relationship XML data
   * @returns SlideRelation[] - Array of slide relations
   */
  private getSlideRelations(relationshipsData: any): SlideRelation[] {
    const relationships = relationshipsData["Relationships"]["Relationship"];
    return relationships
      .filter((rel: any) => rel["$"]["Type"].endsWith("/slide"))
      .map((rel: any) => ({
        id: rel["$"]["Id"],
        target: rel["$"]["Target"],
      }));
  }

  /**
   * Extracts formatted text content from all slides
   *
   * This is a convenience method that:
   * 1. Parses the entire presentation
   * 2. Extracts text from each slide
   * 3. Preserves formatting and line breaks
   *
   * @returns Promise<SlideTextContent[]> - Array of slide text content
   */
  async extractText(): Promise<SlideTextContent[]> {
    const parsed = await this.parse();
    const textContent: SlideTextContent[] = [];

    for (const slide of parsed.slides) {
      const slideText = this.extractTextFromSlide(slide.parsed);
      textContent.push({
        ...slide,
        text: slideText,
      });
    }

    return textContent;
  }

  /**
   * Extracts text content from a single slide while preserving formatting
   *
   * PowerPoint slide XML structure:
   * - p:sp: Shape elements that can contain text
   * - p:txBody: The text body within a shape
   * - a:p: Individual paragraphs
   * - a:r: Text runs within paragraphs
   * - a:t: Actual text content
   * - a:br: Line breaks
   * - a:endParaRPr: Paragraph end markers
   *
   * @param slideData - Parsed slide XML data
   * @returns string[] - Array of text blocks with preserved formatting
   */
  private extractTextFromSlide(slideData: any): string[] {
    const texts: string[] = [];

    // Navigate the XML structure to find text elements
    if (
      slideData["p:sld"] &&
      slideData["p:sld"]["p:cSld"] &&
      slideData["p:sld"]["p:cSld"][0]["p:spTree"]
    ) {
      const spTree = slideData["p:sld"]["p:cSld"][0]["p:spTree"][0];

      if (spTree["p:sp"]) {
        // Process each shape that might contain text
        spTree["p:sp"].forEach((shape: any) => {
          if (shape["p:txBody"]) {
            shape["p:txBody"].forEach((textBody: any) => {
              if (textBody["a:p"]) {
                const paragraphTexts: string[] = [];

                // Process each paragraph
                textBody["a:p"].forEach((paragraph: any) => {
                  const paragraphText: string[] = [];

                  // Extract text from runs
                  if (paragraph["a:r"]) {
                    paragraph["a:r"].forEach((run: any) => {
                      if (run["a:t"]) {
                        paragraphText.push(run["a:t"][0]);
                      }
                    });
                  }

                  // Handle explicit line breaks
                  if (paragraph["a:br"]) {
                    paragraphText.push("\n");
                  }

                  // Handle paragraph breaks
                  if (paragraphText.length === 0 || paragraph["a:endParaRPr"]) {
                    paragraphText.push("\n");
                  }

                  if (paragraphText.length > 0) {
                    paragraphTexts.push(paragraphText.join(""));
                  }
                });

                if (paragraphTexts.length > 0) {
                  texts.push(paragraphTexts.join("\n"));
                }
              }
            });
          }
        });
      }
    }

    return texts;
  }
}
