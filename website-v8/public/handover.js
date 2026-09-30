import {validate,styleLabels,tradingLabels} from './logic.js';

// Whitelist only the explorer's business inputs. No URL, storage or network payload.
export function mapExplorerToFactFind(raw){
 const {data:d,errors}=validate(raw);
 if(errors.length||d.uk!=='yes'||d.purpose==='personal')return null;
 const purposes={growth:'Growth and expansion in the UK',cashflow:'Working capital',stock:'Stock and inventory',equipment:'Equipment or refurbishment',tax:'Business tax or VAT',refinance:'Refinance business debt',other:'Other business purpose'};
 const structures={limited:'Limited company',llp:'LLP',sole:'Sole trader',partnership:'Partnership',other:'Other'};
 return {
  fields:{'funding.amount':String(d.amount),'funding.purpose':purposes[d.purpose],'funding.repayment':styleLabels[d.repayment],'funding.repayment2':d.repayment2?styleLabels[d.repayment2]:'','screening.propertyOwner':d.propertyOwner,'property.interested':d.propertyFinance==='yes'?'yes':'no','property.type':d.propertyType||'','property.occupied':d.propertyOccupied||'','business.structure':structures[d.entity],'financial.turnover':String(Math.round(d.turnover*1200)/100),'financial.cards':d.cards,'financial.cardSales':d.cards==='yes'?String(d.cardAmount):'',
   'explorer.monthlyTurnover':String(d.turnover),'explorer.trading':tradingLabels[d.trading],'explorer.pattern':{steady:'Fairly steady',variable:'Seasonal or variable',unsure:'Too early / not sure'}[d.pattern],'explorer.terminal':d.cards==='yes'?{yes:'Physical terminal',no:'Online payments only',unsure:'Not sure'}[d.terminal]:'Not applicable'},
  signature:JSON.stringify([d.amount,d.purpose,d.repayment,d.entity,d.turnover,d.cards,d.cardAmount,d.trading,d.pattern,d.terminal||'',d.repayment2||'',d.propertyOwner,d.propertyFinance,d.propertyType,d.propertyOccupied])
 };
}
