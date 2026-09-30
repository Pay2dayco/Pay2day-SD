import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyIllustration,advanceIllustration,fixedDebitIllustration} from '../public/calculators.js';
test('upfront fees change total cost but not the monthly loan payment',()=>{
 const r=monthlyIllustration({amount:12000,rate:0,months:12,fee:400});
 assert.equal(r.monthly,1000);assert.equal(r.total,12400);assert.equal(r.cost,400);
 const interest=monthlyIllustration({amount:10000,rate:12,months:12,fee:0});
 assert.ok(Math.abs(interest.monthly-888.4878867834)<1e-8);
});
test('missing assumptions and invalid loan terms produce no estimate',()=>{
 for(const patch of [{rate:''},{rate:-1},{months:0},{months:12.5},{fee:-10},{amount:Infinity}])assert.equal(monthlyIllustration({amount:25000,rate:12,months:36,fee:0,...patch}),null);
});
test('cash advance duration responds to sales and fixed cost correctly',()=>{
 const r=advanceIllustration({amount:25000,cost:5000,sales:30000,share:10});
 assert.equal(r.total,30000);assert.equal(r.monthly,3000);assert.equal(r.months,10);assert.equal(r.slowerMonths,12.5);assert.ok(Math.abs(r.fasterMonths-8.3333333)<1e-6);
 for(const patch of [{share:0},{share:101},{cost:''},{cost:-1},{sales:0},{sales:Infinity}])assert.equal(advanceIllustration({amount:25000,cost:5000,sales:30000,share:10,...patch}),null);
});

test('fixed-cost monthly schedule reconciles to the penny across month ends',()=>{
 const r=fixedDebitIllustration({amount:10000,cost:1000,months:3,frequency:'monthly',firstDate:'2026-01-31'});
 assert.equal(r.count,3);assert.equal(r.first,'2026-01-31');assert.equal(r.last,'2026-03-31');assert.equal(Math.round((r.payment*(r.count-1)+r.finalPayment)*100),1100000);
});
test('weekday and weekly schedules count actual dates and reject malformed inputs',()=>{
 const r=fixedDebitIllustration({amount:12000,cost:2400,months:1,frequency:'daily',firstDate:'2026-02-01'});assert.equal(r.count,20);assert.equal(r.first,'2026-02-02');assert.equal(r.last,'2026-02-27');
 const weekly=fixedDebitIllustration({amount:10000,cost:1000,months:1,frequency:'weekly',firstDate:'2026-02-01'});assert.equal(weekly.count,4);assert.equal(weekly.last,'2026-02-22');
 for(const patch of [{cost:''},{months:1.2},{months:0},{firstDate:'2026-02-30'},{frequency:'other'},{amount:0}])assert.equal(fixedDebitIllustration({amount:10000,cost:1000,months:12,frequency:'monthly',firstDate:'2026-01-01',...patch}),null);
});
