import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculatePriceWithFee(price: string | number): number {
  const basePrice = typeof price === 'string' ? parseFloat(price) : price;
  return basePrice * 1.001; // Add 0.1% fee
}

export function formatPriceWithFee(price: string | number): string {
  return calculatePriceWithFee(price).toFixed(2);
}