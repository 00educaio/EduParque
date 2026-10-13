"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({ open, onOpenChange, title, description, children, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, destructive = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  destructive?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} className="ds-dialog" onCancel={(event) => { event.preventDefault(); onOpenChange(false); }} onClose={() => onOpenChange(false)}><div className="ds-dialog__header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><button type="button" className="ds-icon-button" onClick={() => onOpenChange(false)} aria-label="Fechar"><X aria-hidden="true" /></button></div>{children && <div className="ds-dialog__content">{children}</div>}<div className="ds-dialog__actions"><Button variant="ghost" onClick={() => onOpenChange(false)}>{cancelLabel}</Button>{onConfirm && <Button variant={destructive ? "danger" : "default"} onClick={onConfirm}>{confirmLabel}</Button>}</div></dialog>;
}
