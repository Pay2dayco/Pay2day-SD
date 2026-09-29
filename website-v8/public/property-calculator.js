// Illustrations from user-entered assumptions, not product prices or an APR calculation.
export function propertyIllustration(input){
 const {product,interestMode,feeMode}=input;
 if(!['bridge','interest','repayment'].includes(product)||!['upfront','deduct','add'].includes(feeMode)||!['serviced','retained','rolled','compound'].includes(interestMode))return null;
 const keys=['amount','rate','months','price','debt','arrangement','broker','valuation','legal','exit','tax','other'];
 if(keys.some(k=>input[k]===''||input[k]==null))return null;
 const n=Object.fromEntries(keys.map(k=>[k,Number(input[k])]));if(Object.values(n).some(x=>!Number.isFinite(x)||x<0||x>1e9)||n.amount<=0||!Number.isInteger(n.months)||n.months<1||n.months>(product==='bridge'?36:480)||n.rate>(product==='bridge'?10:100))return null;
 const financeFees=n.arrangement+n.broker,principal=n.amount+(feeMode==='add'?financeFees:0),rate=n.rate/(product==='bridge'?100:1200),mode=product==='bridge'?interestMode:'serviced';
 let interest=0,monthly=0,balloon=principal,retained=0;
 if(product==='repayment'){monthly=rate===0?principal/n.months:principal*rate/(1-Math.pow(1+rate,-n.months));interest=monthly*n.months-principal;balloon=0;}
 else if(mode==='compound'){interest=principal*(Math.pow(1+rate,n.months)-1);balloon=principal+interest;}
 else{interest=principal*rate*n.months;if(mode==='serviced')monthly=principal*rate;if(mode==='rolled')balloon=principal+interest;if(mode==='retained')retained=interest;}
 const netAdvance=n.amount-(feeMode==='deduct'?financeFees:0)-retained;if(netAdvance<=0||!Number.isFinite(interest))return null;
 const upfrontFees=(feeMode==='upfront'?financeFees:0)+n.valuation+n.legal+n.tax+n.other;
 const purchaseCash=n.price+upfrontFees-netAdvance;
 const refinanceCash=netAdvance-n.debt-upfrontFees;
 const cost=interest+financeFees+n.valuation+n.legal+n.exit+n.other;
 return {principal,interest,monthly,balloon,retained,netAdvance,financeFees,upfrontFees,cost,tax:n.tax,exitFee:n.exit,purchaseCash,refinanceCash,months:n.months,finalDue:balloon+n.exit,ltv:n.price>0?principal/n.price*100:null};
}
