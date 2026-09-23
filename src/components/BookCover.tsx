"use client";

import { useState } from "react";
import { clothFor, coverSrc } from "@/lib/utils";

type CoverBook = { id: number; title: string; author: string; cover_url: string | null; isbn: string | null };

/** Real cover when we have one; otherwise a cloth-bound cover with gilt title, so shelves never show broken images. */
export function BookCover({ book, className = "", size = "md" }: { book: CoverBook; className?: string; size?: "xs" | "md" | "lg" }) {
  const src = coverSrc(book);
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;

  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[3px_8px_8px_3px] bg-paper-2 shadow-[inset_3px_0_0_rgb(0_0_0/0.18),0_6px_14px_-8px_rgb(0_0_0/0.5)] ${className}`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[9%] text-[#ecd9a4]"
          style={{
            backgroundColor: clothFor(book.id),
            backgroundImage:
              "linear-gradient(90deg, rgb(0 0 0 / .28) 0 6%, rgb(255 255 255 / .06) 6% 7%, transparent 7%), repeating-linear-gradient(45deg, rgb(255 255 255 / .025) 0 2px, transparent 2px 4px)",
          }}
          role="img"
          aria-label={`Cover of ${book.title}`}
        >
          <div className="ml-[6%] border-t border-b border-[#ecd9a4]/50 py-[6%] text-center">
            <p
              className={`display ${size === "xs" ? "text-[0.5rem]" : size === "lg" ? "text-2xl" : "text-[0.95rem]"} line-clamp-4 leading-tight`}
            >
              {book.title}
            </p>
          </div>
          {size !== "xs" && (
            <p className={`ml-[6%] text-center font-mono ${size === "lg" ? "text-xs" : "text-[0.6rem]"} uppercase tracking-wider opacity-80`}>
              {book.author}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
