/** Set-based encounter lookups keep full-population chart drilldowns responsive. */
export function edsStageGaps(previous: readonly string[], current: readonly string[]): string[] {
 const included=new Set(current);
 return previous.filter(id=>!included.has(id));
}
export function edsRecordSubset<T extends {id:string}>(rows: readonly T[], ids: readonly string[]): T[] {
 const included=new Set(ids);
 return rows.filter(row=>included.has(row.id));
}
