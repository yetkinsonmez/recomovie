"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

export function SubmitButton({
  children,
  className = "auth-button",
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`${className} ${pending ? "is-pending" : ""}`}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel ?? "Working…"}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
