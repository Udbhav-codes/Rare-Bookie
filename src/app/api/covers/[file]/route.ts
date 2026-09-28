import { get, SCHEMA } from "@/lib/db";

/** Uploaded covers are stored in Postgres (Vercel's filesystem is read-only at runtime). */
export async function GET(_req: Request, ctx: RouteContext<"/api/covers/[file]">) {
  const { file } = await ctx.params;
  const id = file.replace(/\.(jpg|png|webp)$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const row = await get<{ mime: string; bytes: Buffer }>(`SELECT mime, bytes FROM ${SCHEMA}.covers WHERE id = ?`, id);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
