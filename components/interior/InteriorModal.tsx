"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  interiorPanelClass,
  leaveStoreClass,
} from "@/components/interior/Interior";
import { duration, ease } from "@/lib/motion";

// The store interior as a dialog over the street. A native <dialog> opened with
// showModal() traps focus, makes the street behind it inert, and returns focus
// to the canvas when it closes.
export function InteriorModal({
  titleId,
  children,
}: {
  titleId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [leaving, setLeaving] = useState(false);

  // Next keeps this route mounted but hidden after you leave (Activity), so
  // close the dialog on hide. Otherwise the street would stay inert.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      setLeaving(false);
    };
  }, []);

  function leave() {
    setLeaving(true);
  }

  // Exits are faster than entrances (motion rule 2).
  const transition = leaving
    ? { duration: duration.fast, ease: ease.inOut }
    : { duration: duration.base, ease: ease.out };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-paper backdrop:bg-transparent"
      onCancel={(event) => {
        event.preventDefault();
        leave();
      }}
    >
      <motion.div
        aria-hidden="true"
        className="fixed inset-0 bg-night/85"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={transition}
      />

      {/* px-4 keeps 16px of space on each side on small screens. */}
      <div
        className="relative flex h-full items-center justify-center px-4"
        onClick={(event) => {
          if (event.target === event.currentTarget) leave();
        }}
      >
        <motion.div
          // Flexible size: the text size grows with the window (16px up to a
          // 1440px-wide window, then up to 24px), and the width is 45em, so the
          // panel is 720px at 16px and scales with everything inside it. It never
          // gets closer than 16px to the screen edges. Height follows the content,
          // up to 85% of the viewport; taller stores scroll inside the body below
          // while "Leave store" stays in view.
          className={`flex max-h-[85dvh] w-[min(45em,calc(100vw_-_32px))] flex-col overflow-hidden text-[length:clamp(16px,calc(8px_+_0.5556vw),24px)] shadow-2xl ${interiorPanelClass}`}
          initial={{ opacity: 0, y: 48 }}
          animate={leaving ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          transition={transition}
          onAnimationComplete={() => {
            if (leaving) router.back();
          }}
        >
          <div className="shrink-0 px-[1.5em] pt-[1.25em] pb-[0.75em] md:px-[2.5em] md:pt-[2em]">
            <button type="button" onClick={leave} className={leaveStoreClass}>
              &larr; Leave store
            </button>
          </div>
          {/* Focusable so keyboard users can scroll a tall store with the arrow keys. */}
          <div
            tabIndex={0}
            aria-labelledby={titleId}
            className="min-h-0 overflow-y-auto px-[1.5em] pb-[2em] focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-interior-accent md:px-[2.5em] md:pb-[2.5em]"
          >
            {children}
          </div>
        </motion.div>
      </div>
    </dialog>
  );
}
