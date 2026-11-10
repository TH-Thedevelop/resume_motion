"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// MotionConfig needs the browser, so it lives in this client component.
// That keeps app/layout.tsx a server component that can export metadata.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
