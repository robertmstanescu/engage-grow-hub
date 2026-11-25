import type { CSSProperties } from "react";

/**
 * Style for the grid cell around a WorkCard inside an `.align-cards`
 * grid: the card's five parts (picture/quote/number, categories, title,
 * text, foot line) sit on five rows shared with the other cards in the
 * line, 12px apart.
 */
export const WORK_CARD_SLOTS = { "--slots": 5, "--slot-gap": "12px" } as CSSProperties;
