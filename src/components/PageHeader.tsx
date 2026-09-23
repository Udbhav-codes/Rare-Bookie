import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  children,
  back,
}: {
  eyebrow?: string;
  title: string;
  children?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link href={back.href} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
          <ChevronLeft size={16} aria-hidden /> {back.label}
        </Link>
      )}
      {eyebrow && <p className="label-mono text-gilt-ink">{eyebrow}</p>}
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[clamp(2.25rem,5vw,3.5rem)]">{title}</h1>
        {children}
      </div>
    </div>
  );
}
