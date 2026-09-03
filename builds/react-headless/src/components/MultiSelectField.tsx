import { Listbox, ListboxButton, ListboxLabel, ListboxOption, ListboxOptions } from '@headlessui/react';

/**
 * Section 5's Status and Priority fields. Headless UI's `Listbox` takes a
 * `multiple` prop, so the selection behaviour, keyboard nav, and ARIA come from
 * the library; the trigger summary ("2 selected"), the checkmarks, and the
 * hidden selection summary the test adapter reads are ours.
 */
export function MultiSelectField<T extends string>({
  testId,
  label,
  options,
  value,
  onChange,
}: {
  testId: string;
  label: string;
  options: readonly T[];
  value: T[];
  onChange: (values: T[]) => void;
}) {
  const summary = value.length === 0 ? `Any ${label.toLowerCase()}` : `${value.length} selected`;

  return (
    <Listbox as="div" className="field" value={value} onChange={onChange} multiple>
      <ListboxLabel>{label}</ListboxLabel>
      <ListboxButton className="select-button" data-testid={`${testId}-button`}>
        {summary}
      </ListboxButton>
      {/* A visually hidden mirror of the current selection: the button summary only
          carries a count, and reading it back exactly as the library marks selected
          options would mean opening the popup on every read. */}
      <span className="visually-hidden" data-testid={`${testId}-selected`}>
        {value.join(',')}
      </span>
      <ListboxOptions className="select-options" data-testid={`${testId}-options`}>
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
