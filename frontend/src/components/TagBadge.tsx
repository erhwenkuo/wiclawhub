import { clsx } from "clsx";

export function TagBadge({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
        className,
      )}
    >
      {label}
    </span>
  );
}
