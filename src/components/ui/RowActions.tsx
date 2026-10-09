// ─────────────────────────────────────────────────────────────────────────────
// RowActions — the four things you can do to a row, in the same order everywhere.
//
// Every list in the product had grown its own answer: the asset directory had a pencil
// beside a three-dot menu with a Delete that did nothing; yard terminals had a pencil and
// a bin; the driver list had a pencil and a shortcut to DQ Files; the roadside list had a
// proper menu. Four lists, four shapes, and the one action a reader has to hunt for —
// delete — sometimes a red bin sitting a pixel from Edit.
//
// So it is one component with one order: Open, Edit, Share to chat, then Delete last and
// red. The order matters more than the icons: a menu whose items move between screens has
// to be read every time, and a destructive item that moves is a destructive item somebody
// eventually hits by muscle memory.
//
// Delete asks first, here rather than in each caller, so the question is worded the same
// way about an asset, a driver and a yard.
// ─────────────────────────────────────────────────────────────────────────────

import { Eye, Pencil, Share2, Trash2 } from 'lucide-react';
import { KebabMenu, type KebabItem } from './KebabMenu';

export interface RowActionsProps {
    /**
     * What this row IS, lower case: "asset", "driver", "yard terminal".
     *
     * Used in the menu labels and the delete question, so a reader is told what they are
     * about to remove rather than being asked whether they are sure in the abstract.
     */
    noun: string;
    /** What this row is CALLED — the unit number, the driver's name, the yard. */
    name: string;
    onOpen?: () => void;
    onEdit?: () => void;
    onShare?: () => void;
    /** Called once the reader has confirmed. Callers do not ask again. */
    onDelete?: () => void;
    /** Anything this list can do that the other lists cannot, between Share and Delete. */
    extra?: KebabItem[];
    /** Where "Open" goes, when "Open asset" is not what it does. */
    openLabel?: string;
    className?: string;
}

export function RowActions({
    noun, name, onOpen, onEdit, onShare, onDelete, extra = [], openLabel, className,
}: RowActionsProps) {
    const items: KebabItem[] = [];
    if (onOpen) items.push({ label: openLabel ?? `Open ${noun}`, icon: Eye, onClick: onOpen });
    if (onEdit) items.push({ label: `Edit ${noun}`, icon: Pencil, onClick: onEdit });
    if (onShare) items.push({ label: 'Share to chat', icon: Share2, onClick: onShare });
    items.push(...extra);
    if (onDelete) {
        items.push({
            label: `Delete ${noun}`,
            icon: Trash2,
            danger: true,
            // Named, not "Are you sure?" — the reader is being asked about a specific row,
            // and in a list of eighteen trucks the row is the whole question.
            onClick: () => {
                if (window.confirm(`Delete ${noun} ${name}? This cannot be undone.`)) onDelete();
            },
        });
    }

    return <KebabMenu items={items} className={className} title={`Actions for ${name}`} />;
}
