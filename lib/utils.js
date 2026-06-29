import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn `cn` helper: merge conditional class names and dedupe
// conflicting Tailwind utilities (last one wins).
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
