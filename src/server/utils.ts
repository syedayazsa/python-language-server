import { TextDocument, Position } from 'vscode-languageserver-textdocument';

// Gets the word at a given position in the document
export function getWordAtPosition(doc: TextDocument, position: Position): string | undefined {
  const text = doc.getText();
  const offset = doc.offsetAt(position);
  
  if (offset >= text.length) {
    return undefined;
  }

  // We fist check if a character is part of a word with a re
  const isWordChar = (char: string): boolean => /[A-Za-z0-9_]/.test(char);

  let start = offset;
  
  //Move backward from the cursor position to find the start of the word.
  while (start > 0 && isWordChar(text[start - 1])) {
    start--;
  }

  let end = offset;
  // Move forward from the cursor position to find the end of the word
  while (end < text.length && isWordChar(text[end])) {
    end++;
  }

  const word = text.substring(start, end);
  return word.length > 0 ? word : undefined;
}