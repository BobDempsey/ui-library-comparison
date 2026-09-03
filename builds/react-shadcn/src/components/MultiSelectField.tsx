import { Button } from '@/components/ui/button.js';
import { Checkbox } from '@/components/ui/checkbox.js';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.js';
import { Label } from '@/components/ui/label.js';

/**
 * Section 5's Status and Priority fields. Radix ships no multi-select combobox,
 * so `DropdownMenuCheckboxItem` stands in: it gives roving keyboard focus,
 * `role="menuitemcheckbox"`, and `aria-checked` from the library. The trigger's
 * summary text, keeping the menu open across multiple picks (`onSelect`
 * defaults to closing after one), and a visually hidden mirror of the current
 * selection are hand built. The mirror exists because `FilterProbe.values()`
 * is a synchronous read and the menu's content is unmounted while closed.
 */
export function MultiSelectField<T extends string>({
  id,
  testId,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  testId: string;
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (values: T[]) => void;
}) {
  const summary = value.length === 0 ? `Any ${label.toLowerCase()}` : `${value.length} selected`;

  const toggle = (option: T) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <div className="flex min-w-32 flex-col gap-1.5">
      <Label id={`${id}-label`}>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className="justify-between font-normal capitalize"
            data-testid={`${testId}-button`}
            aria-labelledby={`${id}-label ${id}`}
          >
            {summary}
          </Button>
        </DropdownMenuTrigger>
        <span className="visually-hidden" data-testid={`${testId}-selected`}>
          {value.join(',')}
        </span>
        <DropdownMenuContent data-testid={`${testId}-options`}>
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={value.includes(option)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => toggle(option)}
              data-testid={`${testId}-option-${option}`}
            >
              <Checkbox checked={value.includes(option)} aria-hidden="true" tabIndex={-1} className="pointer-events-none" />
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
