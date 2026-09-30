// Synthetic website-only cases, derived from the reviewed form controls.
export const widths=[320,390,768,1024,1440];
export const cardBounds=[
 {name:'financial.terminals',min:'0',max:'1000',bad:['-1','1001','1.5'],good:['0','1000']},
 {name:'financial.processorCount',min:'1',max:'20',bad:['0','21','1.5'],good:['1','20']},
 {name:'financial.locations',min:'1',max:'20',bad:['0','21','1.5'],good:['1','20']}
];
export const loanCases=[
 {id:'blank-outstanding',fields:{outstanding:'',taken:'',term:'',termUnit:''},error:'outstanding'},
 {id:'zero-and-empty-optionals',fields:{outstanding:'0',taken:'',term:'',termUnit:''}},
 {id:'date-only',fields:{outstanding:'0',taken:'2020-01-01',term:'',termUnit:''}},
 {id:'unit-only',fields:{outstanding:'0',taken:'',term:'',termUnit:'Months'},error:'term'},
 {id:'paired-minimum',fields:{outstanding:'0',taken:'',term:'1',termUnit:'Months'}},
 {id:'paired-maximum',fields:{outstanding:'0',taken:'',term:'600',termUnit:'Months'}},
 {id:'below-term',fields:{outstanding:'0',taken:'',term:'0',termUnit:'Months'},error:'term'},
 {id:'above-term',fields:{outstanding:'0',taken:'',term:'601',termUnit:'Months'},error:'term'},
 {id:'fractional-term',fields:{outstanding:'0',taken:'',term:'1.5',termUnit:'Months'},error:'term'},
 {id:'future-date',fields:{outstanding:'0',taken:'2999-01-01',term:'',termUnit:''},error:'taken'}
];
export const statusCases=[
 'Indefinite leave to remain / enter','EU Settlement Scheme — settled status',
 'EU Settlement Scheme — pre-settled status','Right of abode','Not resident in the UK','Other / not sure'
];
export const propertyTerms=[
 {id:'minimum-month',term:'1',unit:'Months',min:'',max:''},
 {id:'maximum-months',term:'480',unit:'Months',min:'1',max:'480'},
 {id:'maximum-years',term:'40',unit:'Years',min:'1',max:'40'},
 {id:'too-many-months',term:'481',unit:'Months',min:'',max:'',error:'term'},
 {id:'too-many-years',term:'41',unit:'Years',min:'',max:'',error:'termUnit'},
 {id:'zero-term',term:'0',unit:'Months',min:'',max:'',error:'term'},
 {id:'fractional-term',term:'1.5',unit:'Months',min:'',max:'',error:'term'},
 {id:'reversed-range',term:'6',unit:'Months',min:'12',max:'3',error:'maximumTerm'},
 {id:'outside-range',term:'12',unit:'Months',min:'3',max:'6',error:'term'}
];
