import type { LandingAnalytics } from './analytics-types';

export function cumulativeOutcomes(providers:LandingAnalytics['providers'],months:string[]) {
 let identified=0,closed=0,added=0;
 return months.map(month=>{
  for(const provider of providers) {
   if(provider.suppressed)continue;
   const period=provider.series?.find(row=>row.month===month);
   if(period){identified+=period.rules;closed+=period.closed;added+=period.added;}
  }
  return {month,identified,closed,open:identified-closed,added};
 });
}
