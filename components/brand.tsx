import Link from "next/link";

export function Brand() {
  return (
    <Link className="brand" href="/dashboard" aria-label="d3CRM dashboard">
      <span className="brand-mark">d3</span>
      <span>CRM</span>
    </Link>
  );
}
