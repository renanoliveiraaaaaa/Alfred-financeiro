export default function AppLoading() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-5">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full bg-brand/15 blur-md"
          aria-hidden
        />
        <span
          className="absolute h-10 w-10 rounded-full border border-border/70 bg-surface/40 animate-pulse"
          aria-hidden
        />
        <span
          className="relative h-8 w-8 rounded-full border-2 border-brand/50 border-t-brand animate-spin"
          style={{ animationDuration: '1.1s' }}
          aria-hidden
        />
      </div>
      <p className="text-xs font-medium tracking-wide text-muted">A preparar o salão…</p>
    </div>
  )
}
