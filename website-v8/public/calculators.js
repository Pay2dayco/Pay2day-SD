import {illustrateLoan} from './logic.js';
export function monthlyIllustration({amount,rate,months,fee}){
 if([amount,rate,months,fee].some(v=>v===''||v==null))return null;
 const principal=Number(amount),fees=Number(fee),result=illustrateLoan(principal,Number(rate),Number(months));
 if(!result||!Number.isFinite(fees)||fees<0||fees>1e9)return null;
 return {...result,principal,fee:fees,total:result.total+fees,cost:result.interest+fees,months:Number(months)};
}
export function advanceIllustration({amount,cost,sales,share}){
 if([amount,cost,sales,share].some(v=>v===''||v==null))return null;
 const [a,c,s,p]=[amount,cost,sales,share].map(Number);
 if(![a,c,s,p].every(Number.isFinite)||a<=0||a>1e9||c<0||c>1e9||s<=0||s>1e9||p<=0||p>100)return null;
 const total=a+c,monthly=s*p/100;
 return {principal:a,cost:c,total,monthly,months:total/monthly,slowerMonths:total/(monthly*.8),fasterMonths:total/(monthly*1.2)};
}

// Calendar-based fixed-cost illustration. Bank holidays are not excluded.
export function fixedDebitIllustration({amount,cost,months,frequency,firstDate}) {
 if([amount,cost,months,firstDate].some(v=>v===''||v==null))return null;
 const a=Number(amount),c=Number(cost),m=Number(months);
 if(!Number.isFinite(a)||a<=0||a>1e9||!Number.isFinite(c)||c<0||c>1e9||!Number.isInteger(m)||m<1||m>120||!['daily','weekly','monthly'].includes(frequency)||!/^\d{4}-\d{2}-\d{2}$/.test(firstDate))return null;
 const start=new Date(firstDate+'T00:00:00Z');
 if(!Number.isFinite(+start)||start.toISOString().slice(0,10)!==firstDate)return null;
 const addMonths=(d,n)=>{const y=d.getUTCFullYear(),month=d.getUTCMonth()+n;const last=new Date(Date.UTC(y,month+1,0)).getUTCDate();return new Date(Date.UTC(y,month,Math.min(d.getUTCDate(),last)));};
 const end=addMonths(start,m),dates=[];
 if(frequency==='monthly')for(let i=0;i<m;i++)dates.push(addMonths(start,i));
 else for(let d=new Date(start);d<end;d.setUTCDate(d.getUTCDate()+(frequency==='weekly'?7:1)))if(frequency!=='daily'||(d.getUTCDay()>0&&d.getUTCDay()<6))dates.push(new Date(d));
 if(!dates.length)return null;
 const cents=Math.round((a+c)*100),regularCents=Math.floor(cents/dates.length),finalCents=cents-regularCents*(dates.length-1);
 return {principal:a,cost:c,total:cents/100,count:dates.length,payment:regularCents/100,finalPayment:finalCents/100,first:dates[0].toISOString().slice(0,10),last:dates.at(-1).toISOString().slice(0,10),frequency,months:m};
}
