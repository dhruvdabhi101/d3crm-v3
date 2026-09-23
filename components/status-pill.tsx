export function StatusPill({ status }: { status: string }) {
  return <span className="status-pill" data-status={status.toLowerCase()}><i aria-hidden />{status.toLowerCase()}</span>;
}
