// Utility function to sort orders by created_at timestamp (newest first)
export function sortOrdersByDate<T extends { created_at: string }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}