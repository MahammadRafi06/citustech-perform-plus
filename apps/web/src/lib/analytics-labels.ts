export function scoreBasisLabel(basis:string,program:string) {
 const cms=program==='MA'||program==='Part D';
 return ({captured_baseline:'Baseline',baseline:'Baseline',potential:'Potential',submitted:cms?'Submitted to CMS':'Submitted',accepted:cms?'Accepted by CMS':'Accepted'} as Record<string,string>)[basis]||basis;
}
