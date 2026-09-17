export const OPPORTUNITY_QUADRANTS = [
  {id:'high_value',label:'High value · lower chance',title:'High value Suspects',x1:0,x2:.65,y1:.14,y2:.3},
  {id:'priority',label:'High value · high chance',title:'High value Suspects',x1:.65,x2:1,y1:.14,y2:.3},
  {id:'lower_priority',label:'Lower value · lower chance',title:'Lower value Suspects',x1:0,x2:.65,y1:0,y2:.14},
  {id:'likely_to_close',label:'Lower value · high chance',title:'Lower value Suspects',x1:.65,x2:1,y1:0,y2:.14},
] as const;

export type OpportunityQuadrant = typeof OPPORTUNITY_QUADRANTS[number]['id'];
export const opportunityQuadrantLabel = (id:string) => OPPORTUNITY_QUADRANTS.find(q=>q.id===id)?.label || 'Selected opportunity';
export const OPPORTUNITY_LEVELS = ['low','medium','high'] as const;
export type OpportunityLevel = typeof OPPORTUNITY_LEVELS[number];
export const opportunityLevel = (chance:number):OpportunityLevel => chance<.35?'low':chance<.65?'medium':'high';
export const opportunityLevelLabel = (level:string) => level.charAt(0).toUpperCase()+level.slice(1);
