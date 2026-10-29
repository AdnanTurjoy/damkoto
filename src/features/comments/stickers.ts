/**
 * Predefined community stickers. Only these identifiers are stored; the
 * visual is rendered from this list, so no user-supplied markup is ever shown.
 */
export const STICKERS = [
  { id: "too_expensive", emoji: "😱", tone: "rose" },
  { id: "wow", emoji: "🤩", tone: "amber" },
  { id: "really", emoji: "🤔", tone: "sky" },
  { id: "cheap_find", emoji: "🎉", tone: "green" },
  { id: "higher_here", emoji: "📈", tone: "rose" },
  { id: "bit_less", emoji: "😅", tone: "amber" },
  { id: "thanks", emoji: "🙏", tone: "green" },
  { id: "mismatch", emoji: "🧐", tone: "sky" },
  { id: "check_market", emoji: "🔍", tone: "violet" },
  { id: "great_info", emoji: "👏", tone: "green" },
] as const;

export type StickerId = (typeof STICKERS)[number]["id"];
export const STICKER_IDS = STICKERS.map((s) => s.id) as [StickerId, ...StickerId[]];

export function getSticker(id: string | null | undefined) {
  return STICKERS.find((s) => s.id === id) ?? null;
}
