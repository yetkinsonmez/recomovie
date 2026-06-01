// Profile photos are user-uploaded. Before a user uploads one, every profile
// shows a single default placeholder. (The old preset-icon system is gone.)

export const DEFAULT_AVATAR = "/avatars/_default.svg";

// The square a photo is resized to before upload — small for storage, 2x of
// the largest place we render an avatar (~120px) so it stays crisp on retina.
export const AVATAR_UPLOAD_SIZE = 256;

// Resolve the image to show for a profile: the uploaded photo, else the default.
export function avatarSrc(avatarUrl: string | null | undefined): string {
  return avatarUrl || DEFAULT_AVATAR;
}
