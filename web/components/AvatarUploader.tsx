"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { avatarSrc, AVATAR_UPLOAD_SIZE } from "@/lib/avatars";
import { updateAvatarUrl, removeAvatar } from "@/app/profile/actions";
import { Spinner } from "./Spinner";

// Reject absurd inputs before we bother decoding them.
const MAX_INPUT_BYTES = 12 * 1024 * 1024;

// Center-crop to a square and downscale to a small webp. Keeps stored avatars
// tiny (~10-30 KB) regardless of the source photo's size.
async function resizeToSquareWebp(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not encode image"))),
        "image/webp",
        0.85,
      ),
    );
  } finally {
    bitmap.close?.();
  }
}

export function AvatarUploader({
  userId,
  avatarUrl,
}: {
  userId: string;
  avatarUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasPhoto, setHasPhoto] = useState(!!avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const displayed = previewUrl ?? avatarSrc(avatarUrl);

  async function onFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("That image is too large — pick one under 12 MB.");
      return;
    }

    let blob: Blob;
    try {
      blob = await resizeToSquareWebp(file, AVATAR_UPLOAD_SIZE);
    } catch {
      setError("Couldn't process that image — try a different one.");
      return;
    }

    // Show the resized result instantly while it uploads.
    setPreviewUrl(URL.createObjectURL(blob));

    startTransition(async () => {
      const supabase = createClient();
      const path = `${userId}/avatar.webp`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new photo replaces the old one immediately.
      const res = await updateAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);
      if (res && "error" in res) {
        setError(res.error ?? "Couldn't save your photo.");
        return;
      }
      setHasPhoto(true);
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removeAvatar();
      if (res && "error" in res) {
        setError(res.error ?? "Couldn't remove your photo.");
        return;
      }
      setPreviewUrl(null);
      setHasPhoto(false);
    });
  }

  return (
    <div className="avatar-picker">
      <button
        type="button"
        className={`avatar-current ${pending ? "is-saving" : ""}`}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload a profile photo"
        disabled={pending}
      >
        {/* Plain img: the source can be a blob: preview or a remote storage
            URL, and we don't need next/image optimization for a 256px avatar. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayed}
          alt="Profile"
          width={120}
          height={120}
          className="avatar-img"
        />
        {pending ? (
          <span className="avatar-saving-overlay">
            <Spinner size={28} />
          </span>
        ) : (
          <span className="avatar-edit-badge">Change</span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = ""; // allow re-picking the same file
        }}
      />

      {hasPhoto && !pending && (
        <button type="button" className="avatar-remove" onClick={onRemove}>
          Remove photo
        </button>
      )}

      {error && (
        <p className="auth-error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
