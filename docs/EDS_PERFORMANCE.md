# EDS navigation performance

The expanded EDS population exposed expensive work during page rendering. The
acceptance funnel repeatedly searched each stage's encounter-ID array for every
record in the previous stage. The paginated table also constructed all 14,903
React rows before discarding everything beyond the visible page.

The fix uses Set membership for stage gaps and chart drilldowns, appends to group
buckets instead of copying them repeatedly, and indexes member score lookups.
EDS tables sort the full data array and construct only the visible 50 rows. Other
existing tables retain their rendered-cell sorting behavior.

Local checks on the 14,903-record default report:

- Acceptance funnel gap calculation: 3,098 ms before; 9 ms after.
- Combined computation for all 20 reports: 13,546 ms before; 663 ms after.
- Fingerprints of metrics, chart values, drilldown IDs and table record order match
  before and after for all 20 reports. No records or reporting rules were removed.
- 20 EDS, drilldown, pagination and sorting tests passed; TypeScript validation passed.
- Browser checks cover top-navigation entry, all-record member sorting, the second
  50-row page, stable table width, report-group switching and numeric score sorting.

These are local calculation timings, not a guarantee of production page-load time.
