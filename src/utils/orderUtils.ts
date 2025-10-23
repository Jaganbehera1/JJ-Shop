import { Order, OrderItem } from '../lib/supabase';

// Utility function to sort orders by date, ensuring newest orders are always at the top
export function sortOrdersByDate<T extends Order>(orders: T[]): T[] {
  return [...orders].sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
}

// Format a date consistently for display
export function formatOrderDate(date: string): string {
  return new Date(date).toLocaleString();
}

// Sort orders and ensure correct typing
export function sortOrdersWithItems(orders: (Order & { order_items: OrderItem[] })[]): (Order & { order_items: OrderItem[] })[] {
  return sortOrdersByDate(orders);
}