export interface SlideRelation {
  id: string;
  target: string;
}

export interface ParsedSlide {
  id: string;
  path: string;
  xml: string;
  parsed: any;
}

export interface ParsedPresentation {
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

export interface SlideTextContent extends ParsedSlide {
  text: string[];
}
