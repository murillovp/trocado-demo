import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { useViewPath } from '@/app/view';

type AsLink = Omit<ComponentProps<typeof Link>, 'to'> & { to: string; selected?: boolean };
type AsButton = Omit<ComponentProps<'button'>, 'type'> & { to?: undefined; selected?: boolean };

export type ClickableProps = AsLink | AsButton;

/**
 * A router link when it has an address, a button when it only has a click handler.
 * `selected` shows as `aria-current` on a link and `aria-pressed` on a button.
 * `CardLink` and `RowLink` add their look on top. A link keeps the month and person on screen.
 */
export function Clickable(props: ClickableProps) {
  const viewPath = useViewPath();
  if (props.to !== undefined) {
    const { selected, to, ...link } = props;
    return <Link aria-current={selected ? 'true' : undefined} to={viewPath(to)} {...link} />;
  }
  const { selected, ...button } = props;
  return <button type="button" aria-pressed={selected} {...button} />;
}
