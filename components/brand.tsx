import Link from "next/link";
import Image from "next/image";

export function Brand({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label={href === "/" ? "d3CRM home" : "d3CRM dashboard"}>
      <Image src="/logo.svg" alt="" width={103} height={29} priority />
    </Link>
  );
}
