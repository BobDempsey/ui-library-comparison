import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/react';

/**
 * A single select built on Headless UI's `Listbox`. Used for the Assignee filter
 * (with an optional "clear" choice) and for status/priority in the record modal.
 */
export function SingleSelectField<T extends string>({
  testId,
  label,
  options,
  value,
  onChange,
  nullOption,
}: {
  testId: string;
  label: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  /** When set, renders a leading option that clears the field back to `null`. */
  nullOption?: string;
}) {
  const display = value ?? nullOption ?? options[0];

  return (
    <Listbox as="div" className="field" value={value} onChange={onChange}>
      <ListboxLabel>{label}</ListboxLabel>
      <ListboxButton className="select-button" data-testid={`${testId}-button`}>
        {display}
      </ListboxButton>
      <ListboxOptions className="select-options" data-testid={`${testId}-options`}>
        {nullOption ? (
          <ListboxOption value={null} className="select-option" data-testid={`${testId}-option-null`}>
            {({ selected }) => (
              <>
                <span aria-hidden="true" className="select-check">
                  {selected ? '✓' : ''}
                </span>
                {nullOption}
              </>
            )}
          </ListboxOption>
        ) : null}
        {options.map((option) => (
          <ListboxOption key={option} value={option} className="select-option" data-testid={`${testId}-option-${option}`}>
            {({ selected }) => (
              <>
                <span aria-hidden="true" className="select-check">
                  {selected ? '✓' : ''}
                </span>
                {option}
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
