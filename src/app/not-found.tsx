import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[60dvh] max-w-md content-center px-4 text-center">
      <p className="label-mono text-gilt-ink">Not on the shelf</p>
      <h1 className="display mt-2 text-5xl">Page not found</h1>
      <p className="mt-3 text-ink-soft">This page doesn’t exist or the book was removed from the catalogue.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/catalogue" className="btn btn-primary">
          Browse catalogue
        </Link>
        <Link href="/" className="btn btn-outline">
          Home
        </Link>
      </div>
    </div>
  );
}
