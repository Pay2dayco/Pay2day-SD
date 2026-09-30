import {rmSync,cpSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
const production=process.argv.includes('--production'),live=process.argv.includes('--live');
const siteKey=process.env.PAY2DAY_TURNSTILE_SITE_KEY||'';
if(live&&(!production||process.env.PAY2DAY_INTAKE_READY!=='yes'||!/^[A-Za-z0-9_-]{10,100}$/.test(siteKey)))throw new Error('Live build requires --production, PAY2DAY_INTAKE_READY=yes and a valid PAY2DAY_TURNSTILE_SITE_KEY. Complete the integration gates in GO_LIVE_GUIDE.md first.');
const out=new URL('./dist/',import.meta.url);rmSync(out,{recursive:true,force:true});cpSync(new URL('./public',import.meta.url),out,{recursive:true});
const base='https://www.pay2day.co.uk';
const pages=readdirSync(out).filter(f=>f.endsWith('.html'));
const excluded=['fact-find.html','merchant-cash-advance.html'];const indexable=pages.filter(f=>!excluded.includes(f));
if(production){
 for(const file of indexable){const path=new URL(file,out);writeFileSync(path,readFileSync(path,'utf8').replace(/(<meta\b[^>]*\bname="robots"[^>]*>)/,tag=>tag.replace('noindex,nofollow','index,follow')));}
 writeFileSync(new URL('robots.txt',out),'User-agent: *\nAllow: /\nDisallow: /fact-find.html\nDisallow: /api/\nSitemap: '+base+'/sitemap.xml\n');
}else writeFileSync(new URL('robots.txt',out),'User-agent: *\nDisallow: /\n');
writeFileSync(new URL('runtime-config.js',out),'export const runtime=Object.freeze('+JSON.stringify({mode:live?'live':'preview',apiBase:'/api/intake/v1',turnstileSiteKey:live?siteKey:''})+');\n');
if(live){
 for(const file of pages){const path=new URL(file,out);let html=readFileSync(path,'utf8');html=html.replace(/<div class="site-notice" data-preview-only="">[\s\S]*?<\/div>/g,'').replace('Online form preview · To enquire now, call or email.','Business enquiries only. Your details are sent securely.').replace('This version lets you preview the journey using example details. Online submission, secure saving, email confirmation and resume links are not connected yet. Call Pay2Day on 020 3397 8990 to discuss an application.','Yes. Start with your contact details, then complete one short section at a time. Once your enquiry is saved, you can use your secure email link to continue. Saved forms require email verification; draft access lasts 45 days from the start of your enquiry.').replace('Preview only: no agent assignment or lead is saved.','An agent code is checked before attribution. The client confirms their own details and terms.');writeFileSync(path,html);}
 let headers=readFileSync(new URL('_headers',out),'utf8');headers=headers.replace("script-src 'self'", "script-src 'self' https://challenges.cloudflare.com").replace("connect-src 'self'", "connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com");writeFileSync(new URL('_headers',out),headers);
}
writeFileSync(new URL('sitemap.xml',out),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+(production?indexable:[]).map(f=>'<url><loc>'+base+(f==='index.html'?'/':'/'+f)+'</loc></url>').join('')+'</urlset>');
console.log('Built '+(production?'production SEO':'noindex review')+' website in dist/. Intake mode: '+(live?'LIVE — API must pass session and security checks.':'REVIEW — no requests are sent.'));
