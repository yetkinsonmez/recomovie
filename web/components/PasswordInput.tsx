"use client";

import { useState } from "react";

export function PasswordInput({
  name,
  autoComplete,
  minLength,
  required,
  id,
}: {
  name: string;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  id?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <span className="auth-input-wrap">
      <span className="auth-input-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <input
        id={id}
        name={name}
        type={shown ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="auth-input has-icon has-trailing"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="auth-input-toggle"
        aria-label={shown ? "Hide password" : "Show password"}
        title={shown ? "Hide password" : "Show password"}
      >
        {shown ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 6.2A10.9 10.9 0 0 1 12 6c5 0 9 4 10 6-.4.9-1.4 2.4-2.9 3.8M6.6 6.6C4.6 8 3.4 9.9 2 12c1 2 5 6 10 6 1.7 0 3.3-.5 4.6-1.2" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
