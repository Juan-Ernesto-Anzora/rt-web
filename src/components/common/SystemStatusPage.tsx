type SystemStatusPageProps = {
  insideShell?: boolean;
  eyebrow?: string;
  title: string;
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function SystemStatusPage({
  insideShell = false,
  eyebrow,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: SystemStatusPageProps) {
  const Container = insideShell ? "div" : "main";
  return (
    <div className="grid min-h-screen place-items-center bg-neutral-50 p-4 sm:p-6">
      <Container className="w-full max-w-2xl rounded-lg border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
        {eyebrow ? <div className="text-sm font-semibold text-neutral-600">{eyebrow}</div> : null}
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{title}</h1>
        <p className="mt-2 text-sm text-neutral-700">{message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {primaryLabel && onPrimary ? <button type="button" onClick={onPrimary} className="btn btn-primary">{primaryLabel}</button> : null}
          {secondaryLabel && onSecondary ? <button type="button" onClick={onSecondary} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">{secondaryLabel}</button> : null}
        </div>
      </Container>
    </div>
  );
}
