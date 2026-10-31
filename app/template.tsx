"use client";

import type { ReactNode } from "react";
import * as m from "framer-motion/m";
import { pageEnter } from "@/lib/motion";

// A template re-mounts on every navigation, so each page fades and rises in briefly.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <m.div initial={pageEnter.initial} animate={pageEnter.animate} transition={pageEnter.transition} className="contents">
      {children}
    </m.div>
  );
}
