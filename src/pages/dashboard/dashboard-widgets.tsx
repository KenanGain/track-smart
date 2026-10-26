import type { WidgetCategory, WidgetDef } from './dashboard-types';
import type { LayoutItem } from './dashboard-layout';
import { OVERVIEW_WIDGETS } from './widgets/overview';
import { COMPLIANCE_WIDGETS } from './widgets/compliance';
import { SAFETY_WIDGETS } from './widgets/safety';
import { OPERATIONS_WIDGETS } from './widgets/operations';
import { PROFILE_WIDGETS } from './widgets/profile';
import { SHORTCUT, registerWidgetForPath } from './widgets/shortcut';

// The registry: every widget the dashboard can show, by area. What each one is, and the
// contract they share, is in dashboard-types; the pieces they are drawn from are in
// dashboard-charts. A shortcut card is drawn by the one shortcut widget, whatever it points at.

export const WIDGETS: WidgetDef[] = [...OVERVIEW_WIDGETS, ...COMPLIANCE_WIDGETS, ...SAFETY_WIDGETS, ...OPERATIONS_WIDGETS, ...PROFILE_WIDGETS];
export const WIDGET_BY_ID: Record<string, WidgetDef> = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));
// A large page shortcut carries the widget for its page — matched by the longest path the widget opens.
registerWidgetForPath((path) => {
    let best: WidgetDef | undefined; let len = -1;
    for (const w of WIDGETS) {
        for (const scope of ['carrier', 'profile'] as const) {
            const p = w.path?.(scope);
            if (p && (path === p || path.startsWith(p + '/')) && p.length > len) { best = w; len = p.length; }
        }
    }
    return best;
});
export const WIDGET_CATEGORIES: WidgetCategory[] = ['Overview', 'Compliance', 'Safety', 'Fleet', 'Hiring', 'Team'];
/** The widget that draws this card. */
export const defFor = (item: LayoutItem): WidgetDef | undefined => (item.shortcut ? SHORTCUT : WIDGET_BY_ID[item.id]);
export { attentionItems } from './widgets/overview';
export { KIND_META, SHORTCUT, pageShortcuts, shortcutAllowed, shortcutIcon } from './widgets/shortcut';
export { menuKeyOf, TONE, type BuildCtx, type Shortcut, type ShortcutKind, type Tone, type WidgetDef } from './dashboard-types';
