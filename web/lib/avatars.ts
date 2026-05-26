// Pre-defined profile avatars (48x48 PNGs in /web/public/avatars/).
// `id` is what gets stored in the DB — keep it stable; renaming breaks
// existing profiles.

export interface Avatar {
  id: string;
  label: string;
  file: string; // path under /public
}

export const AVATARS: Avatar[] = [
  { id: "anonymous",        label: "Anonymous",       file: "/avatars/anonymous.png" },
  { id: "boba-fett",        label: "Boba Fett",       file: "/avatars/boba-fett.png" },
  { id: "captain-america",  label: "Captain America", file: "/avatars/captain-america.png" },
  { id: "charlie-chaplin",  label: "Charlie Chaplin", file: "/avatars/charlie-chaplin.png" },
  { id: "clown",            label: "Clown",           file: "/avatars/clown.png" },
  { id: "darth-vader",      label: "Darth Vader",     file: "/avatars/darth-vader.png" },
  { id: "deadpool",         label: "Deadpool",        file: "/avatars/deadpool.png" },
  { id: "geek-female",      label: "Geek (F)",        file: "/avatars/geek-female.png" },
  { id: "geek-male",        label: "Geek (M)",        file: "/avatars/geek-male.png" },
  { id: "harry-potter",     label: "Harry Potter",    file: "/avatars/harry-potter.png" },
  { id: "iron-man",         label: "Iron Man",        file: "/avatars/iron-man.png" },
  { id: "jack-sparrow",     label: "Jack Sparrow",    file: "/avatars/jack-sparrow.png" },
  { id: "jason-voorhees",   label: "Jason Voorhees",  file: "/avatars/jason-voorhees-mask.png" },
  { id: "spiderman",        label: "Spider-Man",      file: "/avatars/spiderman.png" },
  { id: "stormtrooper",     label: "Stormtrooper",    file: "/avatars/stormtrooper.png" },
  { id: "terminator",       label: "Terminator",      file: "/avatars/terminator.png" },
  { id: "thor",             label: "Thor",            file: "/avatars/thor.png" },
  { id: "wolverine",        label: "Wolverine",       file: "/avatars/wolverine.png" },
];

export const AVATAR_BY_ID = new Map(AVATARS.map((a) => [a.id, a]));

export const DEFAULT_AVATAR = "/avatars/_default.svg";

export function avatarSrc(id: string | null | undefined): string {
  if (!id) return DEFAULT_AVATAR;
  return AVATAR_BY_ID.get(id)?.file ?? DEFAULT_AVATAR;
}
