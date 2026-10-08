
import { Badge } from "@/components/ui/badge";
export function StatusPill({ status }: { status: string }) {
  return <Badge variant="secondary" className="status-pill" data-status={status.toLowerCase()}><i aria-hidden />{status.toLowerCase()}</Badge>;
}
