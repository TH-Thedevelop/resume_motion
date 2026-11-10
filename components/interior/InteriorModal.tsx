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

      <div
        className="relative flex h-full justify-center overflow-y-auto p-4 md:p-8"
        onClick={(event) => {
          if (event.target === event.currentTarget) leave();
        }}
      >
        <motion.div
          // my-auto centers the panel vertically, but still lets a tall store scroll.
          className={`my-auto w-full max-w-4xl px-6 pt-5 pb-8 shadow-2xl md:px-14 md:pt-10 md:pb-14 ${interiorPanelClass}`}
          initial={{ opacity: 0, y: 48 }}
          animate={leaving ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
          transition={transition}
          onAnimationComplete={() => {
            if (leaving) router.back();
          }}
        >
          <button
            type="button"
            onClick={leave}
            className={`mb-4 ${leaveStoreClass}`}
          >
            &larr; Leave store
          </button>
          {children}
        </motion.div>
      </div>
    </dialog>
  );
}
