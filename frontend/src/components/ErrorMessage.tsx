import { AlertTriangle } from "lucide-react";

export function ErrorMessage({
  message = "Something went wrong.",
  retry,
}: {
  message?: string;
  retry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Try again
        </button>
      )}
    </div>
  );
}
