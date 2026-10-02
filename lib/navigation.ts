export function callbackPath(search: string) {
  const path = new URLSearchParams(search).get("callbackUrl") ?? "/dashboard";
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/dashboard";
}
