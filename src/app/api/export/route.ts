import { getAdmin } from "@/lib/auth";
import { getBooks } from "@/lib/data";
import { todayISO } from "@/lib/utils";

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote everything; neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  if (!(await getAdmin())) return new Response("Sign in as admin to export the collection.", { status: 401 });
  const head = ["Title", "Author", "ISBN", "Category", "Rack", "Total copies", "Available", "Publisher", "Year", "Language", "Edition", "Added"];
  const rows = getBooks().map((b) =>
    [b.title, b.author, b.isbn, b.category, b.rack_number, b.total_copies, b.available_copies, b.publisher, b.year, b.language, b.edition, b.created_at.slice(0, 10)]
      .map(cell)
      .join(","),
  );
  return new Response("﻿" + [head.map(cell).join(","), ...rows].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rare-bookie-collection-${todayISO()}.csv"`,
    },
  });
}
