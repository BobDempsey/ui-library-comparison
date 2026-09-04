# Application code

The screen goes here: the table, the filter form, the record modal, and the toasts from sections 2 to 8 of the spec.

`measure` counts lines of application code in this folder, so keep test helpers in `test/` and do not vendor library source here.

Load rows through `loadTickets` from `@uilc/fixture`. It holds the 600ms skeleton, honours the `fail` flag behind criterion 16, and returns the same 240 rows in the same order as every other build.
