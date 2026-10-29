"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  /** "center" for dialogs, "sheet" for bottom sheet on mobile / side panel on desktop. */
  variant?: "center" | "sheet";
  children: React.ReactNode;
  className?: string;
}

/**
 * Native <dialog> gives focus trapping, Escape-to-close and an accessible
 * modal role without extra dependencies.
 */
export function Dialog({ open, onClose, title, description, closeLabel, variant = "center", children, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]",
        variant === "center" ? "fixed inset-0 m-auto h-fit w-[min(32rem,calc(100vw-2rem))]" : "fixed inset-x-0 bottom-0 top-auto w-full md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[26rem]",
      )}
    >
      <div
        className={cn(
          "flex flex-col bg-white shadow-[var(--shadow-lift)]",
          variant === "center" ? "rounded-2xl" : "max-h-[88vh] rounded-t-2xl md:h-full md:max-h-none md:rounded-none md:rounded-l-2xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="-mr-2 grid size-10 place-items-center rounded-lg hover:bg-paper">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </dialog>
  );
}
