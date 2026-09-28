// ─────────────────────────────────────────────────────────────────────────────
// Whose seat you are reading the thread from.
//
// The message store is office-centric and always was: `fromMe` means the office
// sent it, a conversation is NAMED after the person on the other end, and the
// list is every conversation the office has. That was the only seat there was,
// so nothing had to say so.
//
// Drivers can sign in now, and from that seat every one of those assumptions is
// wrong in a way that shows: Elizabeth opens Messages and finds a conversation
// with herself, in which she appears to have sent herself a collection list,
// which she is then not allowed to answer because the card thinks she is the
// office watching its own copy.
//
// So the seat becomes explicit. One resolver, because "which way round is this
// message" is asked by the bubble, the avatar, the sender's name, the list
// preview, the composer and the collection card — six places that must not each
// work it out for themselves.
//
// Nothing is rewritten in the store. A thread has two ends and both are reading
// the same record; which end you are at is a question about the reader.
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser, driverIdOfUser } from "@/data/users.data";
import type { ChatMessage, Conversation } from "./messages-store";

export interface ChatViewer {
    /** True when a driver is signed in — the whole point of this module. */
    asDriver: boolean;
    /** Their driver record id, for the surfaces that are about that driver. */
    driverId?: string;
    /** Their name, which is also the name of their conversation in the store. */
    driverName?: string;
}

export const OFFICE_VIEWER: ChatViewer = { asDriver: false };

/** Who is reading. The office unless a driver is signed in. */
export function currentChatViewer(): ChatViewer {
    const u = currentUser();
    const driverId = driverIdOfUser(u);
    if (!u || !driverId) return OFFICE_VIEWER;
    return { asDriver: true, driverId, driverName: u.name };
}

/**
 * Is this message going out from where the reader sits?
 *
 * The one flip. `fromMe` is the office's word for "we sent it", so from the driver's seat
 * every one of those is something they RECEIVED — which is why Elizabeth was looking at a
 * collection list attributed to herself.
 */
export const isOutgoing = (m: Pick<ChatMessage, "fromMe">, v: ChatViewer): boolean =>
    v.asDriver ? !m.fromMe : m.fromMe;

/**
 * The threads this reader is allowed to see.
 *
 * A driver sees exactly one: their own. Everything else in that list is the office's
 * correspondence with other drivers, an insurance adjuster and a dispatch desk, and none of
 * it is theirs to read. Matched by name because that is what the store keys a driver
 * conversation on (`getOrCreateDriverConversation`).
 */
export function visibleConversations(convs: Conversation[], v: ChatViewer): Conversation[] {
    if (!v.asDriver || !v.driverName) return convs;
    const mine = v.driverName.trim().toLowerCase();
    return convs.filter((c) => !c.ai && c.name.trim().toLowerCase() === mine);
}

/**
 * Who the thread is WITH, from this seat.
 *
 * The store names a conversation after the driver, so from the driver's own seat the name
 * on the header is their own — a thread titled "Elizabeth Cook", addressed to Elizabeth
 * Cook. The other end of it is the office.
 */
export const counterpartyName = (conv: Conversation, v: ChatViewer, officeName?: string): string =>
    v.asDriver ? (officeName?.trim() || "The office") : conv.name;

/** The counterpart's role line, same reasoning as the name. */
export const counterpartyRole = (conv: Conversation, v: ChatViewer): string =>
    v.asDriver ? "Dispatch & safety" : conv.role;
