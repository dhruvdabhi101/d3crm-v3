export function weeklyDays(daily: { day: string; total: number }[], now = new Date()) {
  const end = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const totals = new Map(daily.map(day => [day.day, day.total]));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(end.getTime() - (6 - index) * 86400_000).toISOString().slice(0, 10);
    return { day, total: totals.get(day) ?? 0 };
  });
}
