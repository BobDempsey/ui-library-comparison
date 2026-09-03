import { Label } from '@/components/ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.js';

const NULL_VALUE = '__none__';

/**
 * A single select built on Radix's Select primitive. Used for the Assignee
 * filter (with an optional "clear" choice) and for status/priority/assignee
 * in the record modal. Radix's Select has no native `null` value, so a
 * sentinel stands in and is translated back at the boundary.
 */
export function SingleSelectField<T extends string>({
  id,
  testId,
  label,
  options,
  value,
  onChange,
  nullOption,
}: {
  id: string;
  testId: string;
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** When set, renders a leading option that clears the field back to `null`. */
  nullOption?: string;
}) {
  return (
    <div className="flex min-w-32 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value ?? NULL_VALUE}
        onValueChange={(next) => onChange(next === NULL_VALUE ? null : (next as T))}
      >
        <SelectTrigger id={id} data-testid={`${testId}-button`} className="capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-testid={`${testId}-options`}>
          {nullOption ? (
            <SelectItem value={NULL_VALUE} data-testid={`${testId}-option-null`}>
              {nullOption}
            </SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem key={option} value={option} data-testid={`${testId}-option-${option}`}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
