import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The theme's named type sizes (index.css). Without them, tailwind-merge reads
// `text-figure` as a colour and drops it next to `text-positive`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { 'font-size': [{ text: ['micro', 'caption', 'body', 'heading', 'figure', 'title'] }] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
