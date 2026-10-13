"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export function DropdownMenu({ label = "Mais ações", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("mousedown", closeOnOutsideClick); document.removeEventListener("keydown", closeOnEscape); };
  }, []);

  return <div className="ds-dropdown" ref={ref}><button className="ds-icon-button" type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}><MoreHorizontal aria-hidden="true" /></button>{open && <div className="ds-dropdown__menu" role="menu" onClick={() => setOpen(false)}>{children}</div>}</div>;
}
