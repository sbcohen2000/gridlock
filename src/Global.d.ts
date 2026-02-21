/**
 * A position in a multi-line text document, in terms of rows and
 * columns.
 *
 * Rows and columns are zero-based.
 */
interface Point {
  /** The zero-based row number. */
  row: number;

  /** The zero-based column number. */
  column: number;
}

/**
 * A callback for parsing that takes an index and point, and should
 * return a string.
 */
type ParseCallback = (index: number, position: Point) => string | undefined;

declare namespace treeSitter {
  class Parser {
    static init(): Promise<Parser>;
    setLanguage(language: Language | null): this;
    parse(callback: string | ParseCallback, oldTree?: Tree | null): Tree | null;
  }

  class Language {
    static load(input: string | Uint8Array): Promise<Language>;
  }

  class Tree {
    get rootNode(): Node;
  }

  class Node {
    startPosition: Point;
    startIndex: number;
    get endPosition(): Point;
    get endIndex(): number;
    get type(): string;
    get isNamed(): boolean;
    get isExtra(): boolean;
    get isError(): boolean;
    get isMissing(): boolean;
    get text(): string;
    get childCount(): number;
    get children(): Node[];
  }
}
