"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHotTake } from "@/app/profile/actions";
import { Spinner } from "./Spinner";

const MAX = 180;

// Owner-only editor for the pinned "hot take" / favorite quote. Shows the quote
// with an Edit affordance, or a prompt to add one when empty.
export function HotTakeForm({ current }: { current: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current ?? "");
  const [saved, setSaved] = useState(current ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    setError(null);
    const next = value.trim();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("hot_take", next);
      const res = await updateHotTake(fd);
      if (res && "error" in res) {
        setError(res.error ?? "Could not save");
      } else {
        setSaved(next);
        setEditing(false);
        router.refresh();
      }
    });
  }

  if (!editing) {
    if (!saved) {
      return (
        <button
          type="button"
          className="hot-take-add link-button"
          onClick={() => setEditing(true)}
        >
          + Add a hot take or favorite quote
        </button>
      );
    }
    return (
      <div className="hot-take">
        <blockquote className="hot-take-quote">{saved}</blockquote>
        <button
          type="button"
          className="link-button hot-take-edit"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      className="hot-take-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <textarea
        className="hot-take-input"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX))}
        maxLength={MAX}
        rows={2}
        placeholder="Your hottest take, or a movie quote you live by…"
        autoFocus
        disabled={pending}
      />
      <div className="hot-take-foot">
        <span className="meta">
          {value.length}/{MAX}
        </span>
        <div className="hot-take-actions">
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
          <button
            type="button"
            className="link-button"
            disabled={pending}
            onClick={() => {
              setValue(saved);
              setEditing(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="auth-error">{error}</p>}
    </form>
  );
}
