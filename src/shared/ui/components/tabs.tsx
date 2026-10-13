"use client";

import { useId, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/shared/ui/lib/utils";

export type TabItem = { value: string; label: ReactNode; content: ReactNode; disabled?: boolean };

export function Tabs({ items, value, onValueChange, ariaLabel, className }: { items: TabItem[]; value: string; onValueChange: (value: string) => void; ariaLabel: string; className?: string }) {
  const instanceId = useId().replace(/:/g, "");
  const enabledItems = items.filter((item) => !item.disabled);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentValue: string) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !enabledItems.length) return;
    event.preventDefault();
    const currentIndex = Math.max(0, enabledItems.findIndex((item) => item.value === currentValue));
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? enabledItems.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + enabledItems.length) % enabledItems.length;
    const next = enabledItems[nextIndex];
    if (!next) return;
    onValueChange(next.value);
    document.getElementById(`${instanceId}-tab-${next.value}`)?.focus();
  }

  return <div className={className}><div className="ds-tabs" role="tablist" aria-label={ariaLabel}>{items.map((item) => <button id={`${instanceId}-tab-${item.value}`} key={item.value} type="button" role="tab" aria-selected={value === item.value} aria-controls={`${instanceId}-panel-${item.value}`} tabIndex={value === item.value ? 0 : -1} disabled={item.disabled} className={cn("ds-tabs__trigger", value === item.value && "is-active")} onClick={() => onValueChange(item.value)} onKeyDown={(event) => handleKeyDown(event, item.value)}>{item.label}</button>)}</div>{items.map((item) => <div id={`${instanceId}-panel-${item.value}`} key={item.value} role="tabpanel" aria-labelledby={`${instanceId}-tab-${item.value}`} hidden={value !== item.value} tabIndex={0}>{item.content}</div>)}</div>;
}
