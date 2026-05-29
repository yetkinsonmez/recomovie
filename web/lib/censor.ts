// Comment profanity filter. We store the raw text the user typed and only
// censor at render time, so the word list can be tweaked without a backfill
// and the author still sees their original text when editing.
const BLOCKED = [
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "bastard",
  "dick",
  "piss",
  "nigger",
  "faggot",
  "slut",
  "whore",
  "retard",
];

// Common leetspeak substitutions, normalized back to the letter they stand in
// for. Restricted to alphanumerics plus @ and $ — the symbols people actually
// embed mid-word. We deliberately skip ambiguous punctuation like ! | + ( )
// so we don't swallow trailing punctuation into a "word".
const LEET: Record<string, string> = {
  "@": "a",
  "4": "a",
  "8": "b",
  "3": "e",
  "1": "i",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
  "2": "z",
};

// A token is a run of letters/digits and the leet symbols above. Everything
// else (spaces, punctuation) is a separator and never part of a match.
const TOKEN = /[A-Za-z0-9@$]+/g;

// Each blocked stem becomes a pattern where every letter may be stretched
// (f+u+c+k+ catches "fuuuck"), anchored to the token start and allowed to run
// on into suffixes ("fucking", "shitty"). Tested against the leet-normalized,
// lowercased token.
const STEM = new RegExp(
  "^(?:" +
    BLOCKED.map((w) =>
      w
        .split("")
        .map((c) => `${c}+`)
        .join(""),
    ).join("|") +
    ")",
);

function normalize(token: string): string {
  let out = "";
  for (const ch of token.toLowerCase()) out += LEET[ch] ?? ch;
  return out;
}

export function censorComment(text: string): string {
  return text.replace(TOKEN, (token) => {
    if (!STEM.test(normalize(token))) return token;
    return token.length <= 1 ? token : token[0] + "*".repeat(token.length - 1);
  });
}
