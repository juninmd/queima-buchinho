/**
 * Checks if the text contains workout keywords.
 * Improved to handle word boundaries and basic negations.
 *
 * @param text The message text to analyze
 * @returns true if the text indicates a workout, false otherwise
 */
export function hasWorkoutKeyword(text: string): boolean {
  if (!text) return false;

  const normalized = text.toLowerCase();

  // Keywords we are looking for
  // Note: 'eu treinei' is covered by 'treinei'
  const keywords = ['treinei', 'treinado'];

  // Check if any keyword is present as a whole word
  // \b matches word boundaries
  const regex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'i');
  const match = normalized.match(regex);

  if (!match) return false;

  // Check for negation immediately before the match
  // We look at the text before the match to see if it ends with a negation word
  const matchIndex = match.index!;
  const textBefore = normalized.substring(0, matchIndex).trimEnd();

  // Check if it ends with "não", "nao", "nunca", "jamais"
  // We use $ to match the end of the string (textBefore)
  const negationRegex = /(n[ãa]o|nunca|jamais)$/i;

  if (negationRegex.test(textBefore)) {
    return false;
  }

  return true;
}
