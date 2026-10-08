export default function LoadingIndicator() {
  return <div className="flex flex-1 items-center justify-center py-16" role="status" aria-label="Loading">
    <span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-[#FAF7F2]/30 border-t-[#FAF7F2] motion-reduce:animate-none" />
  </div>;
}
