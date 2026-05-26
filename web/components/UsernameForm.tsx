"use client";

import { useState, useTransition } from "react";
import { updateUsername } from "@/app/profile/actions";
import { Spinner } from "./Spinner";

export function UsernameForm({ current }: { current: string | null }) {
  const [editing, setEditing] = useState(!current);
  const [value, setValue] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="username-row">
        <span className="username-display">@{current}</span>
        <button
          type="button"
          className="link-button"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      className="username-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const fd = new FormData();
          fd.set("username", value);
          const res = await updateUsername(fd);
          if (res && "error" in res) setError(res.error);
          else setEditing(false);
        });
      }}
    >
      <input
        name="username"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        minLength={3}
        maxLength={20}
        pattern="[a-zA-Z0-9_]{3,20}"
        required
        disabled={pending}
        className="auth-input"
        autoFocus
      />
      <button
        type="submit"
        className={`auth-button ${pending ? "is-pending" : ""}`}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Spinner /> <span>Saving…</span>
          </>
        ) : (
          "Save"
        )}
      </button>
      {current && (
        <button
          type="button"
          className="link-button"
          disabled={pending}
          onClick={() => {
            setValue(current);
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      )}
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}
