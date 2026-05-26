"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { AVATARS, avatarSrc } from "@/lib/avatars";
import { updateAvatar } from "@/app/profile/actions";
import { Spinner } from "./Spinner";

export function AvatarPicker({
  currentAvatarId,
}: {
  currentAvatarId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentAvatarId);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(id: string) {
    setSelected(id);
    setSavingId(id);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("avatar_id", id);
      const res = await updateAvatar(fd);
      setSavingId(null);
      if (res && "error" in res) {
        setError(res.error ?? "Avatar update failed");
      } else {
        setTimeout(() => setOpen(false), 200);
      }
    });
  }

  return (
    <div className="avatar-picker">
      <button
        type="button"
        className={`avatar-current ${pending ? "is-saving" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Change profile photo"
      >
        <Image
          src={avatarSrc(selected)}
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
      {open && (
        <div className="avatar-grid" role="listbox">
          {AVATARS.map((a) => {
            const isSaving = savingId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={selected === a.id}
                title={a.label}
                className={`avatar-option ${
                  selected === a.id ? "is-selected" : ""
                } ${isSaving ? "is-saving" : ""}`}
                disabled={pending}
                onClick={() => pick(a.id)}
              >
                <Image
                  src={a.file}
                  alt={a.label}
                  width={48}
                  height={48}
                  className="avatar-img"
                />
                {isSaving && (
                  <span className="avatar-option-overlay">
                    <Spinner size={18} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="auth-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
