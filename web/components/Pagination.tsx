import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  baseParams,
  basePath = "/",
}: {
  page: number;
  totalPages: number;
  baseParams: string;
  basePath?: string;
}) {
  if (totalPages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(baseParams);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <nav className="pagination">
      <Link
        className="page-btn"
        href={href(page - 1)}
        aria-disabled={page === 1}
      >
        ← Prev
      </Link>

      {start > 1 && (
        <>
          <Link className="page-btn" href={href(1)}>
            1
          </Link>
          {start > 2 && <span className="page-gap">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          className={p === page ? "page-btn active" : "page-btn"}
          href={href(p)}
        >
          {p}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="page-gap">…</span>}
          <Link className="page-btn" href={href(totalPages)}>
            {totalPages}
          </Link>
        </>
      )}

      <Link
        className="page-btn"
        href={href(page + 1)}
        aria-disabled={page === totalPages}
      >
        Next →
      </Link>
    </nav>
  );
}
