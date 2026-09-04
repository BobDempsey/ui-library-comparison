import type { SVGProps } from 'react';

/**
 * Small inline icon set. shadcn/ui ships as copy-in source with no icon
 * dependency of its own (the reference implementation pairs it with
 * lucide-react, which this build never added), so the select caret and the
 * sort indicators were left as text glyphs. These are plain inline SVGs,
 * not a new dependency, sized to match the 16px icon slots elsewhere.
 */
function iconProps(props: SVGProps<SVGSVGElement>) {
  return {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  };
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

/** Neutral up/down affordance for a sortable column with no active sort. */
export function ChevronsUpDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps(props)}>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}
