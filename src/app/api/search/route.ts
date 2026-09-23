import { NextResponse, type NextRequest } from "next/server";
import { searchBooks } from "@/lib/data";

export function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
  return NextResponse.json(searchBooks(q, 7));
}
