import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

export function SearchIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M21 21L15.8 15.8M17 10.5C17 14.0899 14.0899 17 10.5 17C6.91015 17 4 14.0899 4 10.5C4 6.91015 6.91015 4 10.5 4C14.0899 4 17 6.91015 17 10.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12.02 3.5C7.34 3.5 3.55 7.29 3.55 11.97C3.55 13.46 3.94 14.86 4.61 16.08L3.5 20.5L8.04 19.42C9.2 20.03 10.51 20.38 11.91 20.44H12.02C16.7 20.44 20.49 16.65 20.49 11.97C20.49 7.29 16.7 3.5 12.02 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.36 8.75C9.62 8.12 9.89 8.11 10.11 8.12C10.29 8.12 10.49 8.12 10.69 8.13C10.86 8.14 11.08 8.06 11.26 8.48C11.48 9.02 12.01 10.33 12.07 10.44C12.13 10.55 12.17 10.69 12.08 10.84C11.99 10.99 11.95 11.08 11.82 11.22C11.69 11.36 11.55 11.53 11.44 11.64C11.31 11.78 11.17 11.93 11.33 12.22C11.49 12.5 12.04 13.42 12.87 14.16C13.94 15.11 14.82 15.41 15.12 15.53C15.42 15.64 15.6 15.62 15.73 15.47C15.9 15.28 16.12 14.98 16.34 14.68C16.5 14.45 16.71 14.42 16.96 14.52C17.22 14.61 18.6 15.29 18.88 15.43C19.16 15.57 19.34 15.64 19.41 15.76C19.49 15.88 19.49 16.47 19.21 17.01C18.94 17.56 17.62 18.08 17.06 18.12C16.48 18.17 15.74 18.29 13.07 17.14C9.88 15.76 7.85 11.7 7.7 11.49C7.56 11.28 6.44 9.78 6.44 8.22C6.44 6.66 7.22 5.9 7.49 5.61C7.75 5.33 8.07 5.26 8.27 5.26C8.47 5.26 8.66 5.26 8.8 5.27C8.98 5.27 9.23 5.2 9.36 5.53"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M3.5 5H5.3L7.2 14.2C7.28 14.58 7.48 14.92 7.76 15.17C8.04 15.42 8.41 15.56 8.8 15.56H17.9C18.29 15.56 18.65 15.42 18.93 15.17C19.21 14.92 19.41 14.58 19.49 14.2L20.7 8.5H6.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.4 19.4C9.4 19.73 9.13 20 8.8 20C8.47 20 8.2 19.73 8.2 19.4C8.2 19.07 8.47 18.8 8.8 18.8C9.13 18.8 9.4 19.07 9.4 19.4Z"
        fill="currentColor"
      />
      <path
        d="M18.2 19.4C18.2 19.73 17.93 20 17.6 20C17.27 20 17 19.73 17 19.4C17 19.07 17.27 18.8 17.6 18.8C17.93 18.8 18.2 19.07 18.2 19.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function StarIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M10 1.9L12.52 7.01L18.16 7.83L14.08 11.81L15.05 17.43L10 14.77L4.95 17.43L5.92 11.81L1.84 7.83L7.48 7.01L10 1.9Z" />
    </svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M22 11.08V12C21.99 14.16 21.29 16.26 20 18C18.71 19.74 16.9 21.03 14.84 21.67C12.78 22.31 10.57 22.27 8.54 21.57C6.5 20.86 4.74 19.5 3.51 17.72C2.28 15.94 1.64 13.81 1.68 11.65C1.73 9.49 2.45 7.39 3.75 5.67C5.05 3.95 6.87 2.66 8.93 2.02C10.99 1.38 13.21 1.42 15.24 2.13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M22 4L12 14.01L9 11.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ArrowUpRightIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-4 w-4", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 17L17 7M17 7H8M17 7V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
