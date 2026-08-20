"use client";
import { useEffect, useRef, useState } from "react";

export default function CharTextarea({
  name,
  defaultValue = "",
  maxLength,
  placeholder,
  className,
  minRows = 1,
}: {
  name: string;
  defaultValue?: string;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [len, setLen] = useState(defaultValue.length);

  function resize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (ref.current) resize(ref.current);
  }, []);

  return (
    <div>
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        rows={minRows}
        onInput={(e) => { const el = e.currentTarget; setLen(el.value.length); resize(el); }}
        className={`${className ?? ""} resize-none overflow-hidden`}
      />
      {maxLength ? (
        <div className={`mt-1 text-right text-[11px] ${len >= maxLength ? "text-accent" : "text-muted"}`}>
          {len}/{maxLength}
        </div>
      ) : null}
    </div>
  );
}
