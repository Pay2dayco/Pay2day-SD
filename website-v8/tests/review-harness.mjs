import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium:engine}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? resolve(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright') : 'playwright');
export async function startReview(port){
 const root=fileURLToPath(new URL('../dist/',import.meta.url));
 const server=createServer(async(req,res)=>{
  try{
   if(req.method!=='GET')throw Error('Read-only preview');
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(root.endsWith(sep)?root:root+sep))throw Error('Outside preview');
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
   res.writeHead(200,{'Content-Type':mime[extname(file)]||'text/plain','X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise((ok,no)=>{server.once('error',no);server.listen(port,'127.0.0.1',ok);});
 const browser=await engine.launch({...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{channel:'msedge'}),headless:true});
 const newPage=browser.newPage.bind(browser),blocked=[];
 browser.newPage=async options=>{
  const page=await newPage({...options,serviceWorkers:'block'});
  await page.context().route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin===`http://127.0.0.1:${port}`&&req.method()==='GET'&&!url.pathname.startsWith('/api/'))return route.continue();
   blocked.push(req.method()+' '+url.origin+url.pathname);return route.abort();
  });
  await page.context().routeWebSocket('**/*',ws=>{blocked.push('WebSocket');ws.close();});
  page.setDefaultTimeout(10000);return page;
 };
 const close=browser.close.bind(browser);
 browser.close=async()=>{await close();await new Promise(ok=>server.close(ok));assert.deepEqual(blocked,[],'Unexpected network attempt blocked');};
 return {browser,server:{kill:()=>server.close()}};
}
