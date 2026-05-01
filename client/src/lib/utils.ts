import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculatePriceWithFee(price: string | number): number {
  const basePrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(basePrice)) return 0;
  return basePrice * 1.05; // Standard 5% service fee
}

export function formatPriceWithFee(price: string | number): string {
  const total = calculatePriceWithFee(price);
  return `GH₵${total.toFixed(2)}`;
}