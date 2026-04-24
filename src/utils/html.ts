/**
 * Escapes characters for HTML parse_mode in Telegram.
 * Replaces <, >, and & with their HTML entity equivalents.
 */
export function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
