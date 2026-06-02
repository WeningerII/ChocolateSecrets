/**
 * Centered loading spinner used as the Suspense fallback while a lazily-loaded
 * route chunk is fetched. Mirrors the existing auth-loading spinner in Layout.
 */
export default function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-8 h-8 border-4 border-amber-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
