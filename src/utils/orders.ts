// Sort orders by created_at timestamp, ensuring newest orders are always at the top
export function sortOrdersByDate<T extends { created_at: string }>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
}

// Create a composite sort key from date and order number
export function getOrderSortKey(order: { created_at: string; order_number: string }) {
  const date = new Date(order.created_at);
  return `${date.getTime()}-${order.order_number}`;
}