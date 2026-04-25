import { useEffect, useRef, useState } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * DeferredInput / DeferredTextarea — Debug Story 3.2
 * ---------------------------------------------------
 * Drop-in replacements for `<input>` / `<textarea>` that keep the
 * keystrokes LOCAL and only fire the upstream `onChange` on blur,
 * Enter (input), or Ctrl+Enter (textarea). This is the single most
 * effective fix for the "Heavy Hand" freeze QA reproduces by holding
 * a key inside an inspector field — without it every keystroke pushes
 * a draft mutation that re-renders the whole admin tree (including
 * the live canvas) hundreds of times per second.
 *
 * USAGE
 * -----
 *   <DeferredInput value={x} onChange={setX} placeholder="…" className="…" />
 *
 * Compatible with every native input/textarea attribute (className,
 * style, placeholder, maxLength, type, etc.) so callers can swap
 * `<input>` → `<DeferredInput>` mechanically.
 *
 * COMMIT TRIGGERS
 * ---------------
 *   • blur
 *   • Enter key (input)
 *   • Cmd / Ctrl + Enter (textarea — Enter alone inserts a newline)
 *
 * Local state is also re-synced if `value` changes externally (e.g.
 * a Revision History restore swaps the draft underneath us).
 */

const useDeferredText = (
  externalValue: string,
  onCommit: (v: string) => void,
) => {
  const [local, setLocal] = useState(externalValue || "");
  const committedRef = useRef(externalValue || "");

  useEffect(() => {
    if (externalValue !== committedRef.current) {
      setLocal(externalValue || "");
      committedRef.current = externalValue || "";
    }
  }, [externalValue]);

  const commit = () => {
    if (local !== committedRef.current) {
      committedRef.current = local;
      onCommit(local);
    }
  };

  return { local, setLocal, commit };
};

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
};

export const DeferredInput = ({ value, onChange, onBlur, onKeyDown, ...rest }: InputProps) => {
  const { local, setLocal, commit } = useDeferredText(value, onChange);
  return (
    <input
      {...rest}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        onKeyDown?.(e);
      }}
    />
  );
};

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> & {
  value: string;
  onChange: (v: string) => void;
};

export const DeferredTextarea = ({ value, onChange, onBlur, onKeyDown, ...rest }: TextareaProps) => {
  const { local, setLocal, commit } = useDeferredText(value, onChange);
  return (
    <textarea
      {...rest}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        commit();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        // Cmd / Ctrl + Enter commits; bare Enter still inserts a newline.
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        onKeyDown?.(e);
      }}
    />
  );
};
