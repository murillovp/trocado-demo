/**
 * The 7 px dot in a person's colour that opens a row in Casa view, so the row says
 * whose line it is. The person's name is its label, for screen readers and on hover.
 */
export function OwnerDot({ name, color }: { name: string; color: string }) {
  return <span role="img" aria-label={name} title={name} className="size-[7px] shrink-0 rounded-full" style={{ backgroundColor: color }} />;
}
