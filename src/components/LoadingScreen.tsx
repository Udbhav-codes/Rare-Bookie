"use client";

import { useEffect, useState } from "react";
import { clothFor } from "@/lib/utils";

// A few books per compartment, dropping in one after another.
const CUBBIES = [3, 6, 4, 4, 7, 3, 2, 5, 4, 3, 6, 5];
// Running index so spines drop in one after another across the whole rack.
const OFFSETS = CUBBIES.map((_, i) => CUBBIES.slice(0, i).reduce((a, b) => a + b, 0));
const MIN_MS = 1600;
const MAX_MS = 3800;

/** First visit per browser session: the rack fills with books, then fades into the page. */
export function LoadingScreen({ libraryName }: { libraryName: string }) {
  const [state, setState] = useState<"show" | "done" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("rb-loaded") === "1";
      sessionStorage.setItem("rb-loaded", "1");
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const minMs = seen ? 0 : reduced ? 400 : MIN_MS;

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      const wait = Math.max(0, minMs - (performance.now() - start));
      setTimeout(() => setState("done"), wait);
      setTimeout(() => setState("gone"), wait + 500);
    };
    const hardStop = setTimeout(finish, MAX_MS);
    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });
    return () => {
      clearTimeout(hardStop);
      window.removeEventListener("load", finish);
    };
  }, []);

  if (state === "gone") return null;

  return (
    <div className="loader" data-done={state === "done"} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-6">
        <div className="rack loader-rack" aria-hidden>
          {CUBBIES.map((n, c) => (
            <div key={c} className="cubby items-end gap-px">
              {Array.from({ length: n }, (_, i) => {
                const id = c * 10 + i;
                return (
                  <span
                    key={i}
                    className="spine"
                    style={{
                      width: 5 + ((id * 7) % 4),
                      height: `${70 + ((id * 13) % 26)}%`,
                      backgroundColor: clothFor(id),
                      animationDelay: `${0.3 + (OFFSETS[c] + i) * 0.045}s`,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="loader-name text-center">
          <p className="display text-4xl">{libraryName}</p>
          <p className="label-mono mt-2 text-ink-soft">Shelving your library…</p>
        </div>
      </div>
    </div>
  );
}
