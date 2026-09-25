"""Stable sorting for scoped member directories, applied before pagination."""
import re


def sort_records(rows, field, direction='asc'):
    if not field:
        return rows
    def value(row):
        return row.get(field)
    def present(row):
        return value(row) is not None and value(row) != ''
    def key(row):
        v = value(row)
        if isinstance(v, (int, float)):
            return (0, v)
        return (1, tuple((0, int(part)) if part.isdigit() else (1, part.casefold())
                         for part in re.split(r'(\d+)', str(v))))
    return sorted((row for row in rows if present(row)), key=key, reverse=direction == 'desc') + [row for row in rows if not present(row)]
