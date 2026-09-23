import Link from "next/link";
import type { RackSummary } from "@/lib/types";
import { clothFor, describeRack, RACK_COL_WIDTHS, rackLabels, spineShape } from "@/lib/utils";

const GRID = RACK_COL_WIDTHS.map((w) => `${w}fr`).join(" ");
const MAX_SPINES = 22;

/**
 * The library rack, drawn from the hand sketch: 3 columns (wide middle), R1… numbered left-to-right,
 * top-to-bottom. "full" shows books as spines and links each compartment; "mini" is a locator.
 */
export function RackMap({
  rows,
  summary,
  highlight,
  variant = "full",
  hrefFor,
  className = "",
}: {
  rows: number;
  summary?: RackSummary;
  highlight?: string | null;
  variant?: "full" | "mini";
  hrefFor?: (rack: string) => string;
  className?: string;
}) {
  const labels = rackLabels(rows);

  if (variant === "mini") {
    return (
      <div
        className={`rack rack-sm ${className}`}
        style={{ gridTemplateColumns: GRID }}
        role="img"
        aria-label={highlight ? `Rack map: ${highlight} is at ${describeRack(highlight)}` : "Rack map"}
      >
        {labels.map((r) => (
          <div key={r} className="cubby" data-active={r === highlight?.toUpperCase()}>
            <span className="cubby-label">{r}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`rack ${className}`} style={{ gridTemplateColumns: GRID }}>
      {labels.map((r, i) => {
        const cell = summary?.[r];
        // One spine per physical copy; copies of the same title sit side by side with a slight variation.
        const spines = (cell?.spines ?? [])
          .flatMap((s) => Array.from({ length: Math.max(1, s.copies) }, (_, k) => ({ ...s, key: `${s.id}-${k}`, seed: s.id * 31 + k })))
          .slice(0, MAX_SPINES);
        const firstRow = i < 3;
        const body = (
          <>
            <span className="rack-plate">{r}</span>
            {cell && <span className="cubby-count">{cell.count}</span>}
            {spines.length === 0 && <span className="cubby-empty">empty</span>}
            {spines.map((s, j) => {
              const { width, height } = spineShape(s.seed);
              const lean = j === spines.length - 1 && spines.length > 2 && spines.length < MAX_SPINES;
              return (
                <span
                  key={s.key}
                  className={`spine ${lean ? "spine-lean" : ""}`}
                  title={s.title}
                  style={{ width, height: `${firstRow ? height * 0.72 : height}%`, backgroundColor: clothFor(s.id) }}
                />
              );
            })}
          </>
        );
        const style = { height: firstRow ? "clamp(64px, 9vw, 92px)" : "clamp(84px, 12vw, 128px)" };
        const label = `${r}: ${cell ? `${cell.count} title${cell.count === 1 ? "" : "s"}` : "empty"}. ${describeRack(r)}.`;
        return hrefFor ? (
          <Link key={r} href={hrefFor(r)} className="cubby" style={style} aria-label={`${label} Show these books.`}>
            {body}
          </Link>
        ) : (
          <div key={r} className="cubby" style={style} aria-label={label}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
