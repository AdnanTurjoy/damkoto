/**
 * Lightweight, transparent content heuristics. These never delete content;
 * they either flag it for moderator review or ask the user to rephrase.
 * The word list is intentionally small and should be extended by moderators.
 */
const BLOCKED_TERMS = [
  // English
  "fuck",
  "shit",
  "bitch",
  "bastard",
  // Bengali (common slurs/abuse; keep short and unambiguous)
  "শালা",
  "শুয়োর",
  "খানকি",
  "মাগি",
  "চুদ",
  "হারামি",
  "বাস্টার্ড",
];

export function containsBlockedLanguage(text: string | null | undefined): boolean {
  if (!text) return false;
  const lower = text.normalize("NFKC").toLowerCase();
  return BLOCKED_TERMS.some((term) => lower.includes(term));
}

export function containsLink(text: string | null | undefined): boolean {
  if (!text) return false;
  return /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|xyz|bd|info|shop)\b)/i.test(text);
}

/** Phone numbers in notes are personal data; flag them for review. */
export function containsPhoneNumber(text: string | null | undefined): boolean {
  if (!text) return false;
  return /(\+?880|০১|01)[\d০-৯\s-]{8,}/.test(text);
}
