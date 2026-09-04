/** Slug for a section card's anchor id — keeps the page and its SectionNav rail
 *  in agreement about what each `[data-section]` card is addressed by. */
export function sectionId(prefix: string, title: string) {
    return `${prefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}
