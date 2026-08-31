import Link from 'next/link';

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="ReNodo, inicio">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span>ReNodo</span>
    </Link>
  );
}
