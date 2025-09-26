import type { SVGProps } from "react";

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10" />
      <path d="M22 12a10 10 0 0 0-10-10" />
      <path d="M12 12a10 10 0 0 1 10-10" />
    </svg>
  );
}

export function QrCodePlaceholder(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      {...props}
    >
      <rect width="200" height="200" rx="10" fill="hsl(var(--muted))" />
      <rect x="30" y="30" width="60" height="60" rx="5" fill="hsl(var(--foreground))" />
      <rect x="45" y="45" width="30" height="30" rx="2" fill="hsl(var(--muted))" />
      <rect x="30" y="110" width="30" height="30" rx="5" fill="hsl(var(--foreground))" />
      <rect x="110" y="30" width="30" height="30" rx="5" fill="hsl(var(--foreground))" />
      <rect x="110" y="110" width="60" height="60" rx="5" fill="hsl(var(--foreground))" />
      <rect x="80" y="80" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="150" y="80" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="80" y="150" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="80" y="40" width="10" height="10" fill="hsl(var(--foreground))" />
      <rect x="40" y="80" width="10" height="10" fill="hsl(var(--foreground))" />
    </svg>
  );
}
