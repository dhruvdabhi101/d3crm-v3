export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-orbit" aria-hidden><i /></span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}
