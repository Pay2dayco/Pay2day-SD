// Company lookups use the protected intake endpoint; provider credentials stay on the server.
export function attachCompanyLookup(root,{preview,request,onSelect}){
 let timer=null,sequence=0,activeInput=null,activeIndex=-1,items=[];
 const findInput=event=>event.target.closest('[data-company-query]');
 const parts=input=>({box:document.getElementById(input.dataset.companyResults),status:document.getElementById(input.dataset.companyStatus)});
 function close(input){
  if(!input)return;const {box}=parts(input);if(box){box.replaceChildren();box.hidden=true;}
  input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');activeIndex=-1;items=[];
 }
 function cancel(){clearTimeout(timer);sequence++;close(activeInput);activeInput=null;}
 function choose(index){const item=items[index];if(!item)return;cancel();onSelect(item);}
 function highlight(index){
  const {box}=parts(activeInput);activeIndex=index;
  [...box.children].forEach((option,i)=>option.setAttribute('aria-selected',String(i===index)));
  if(index>=0){activeInput.setAttribute('aria-activedescendant',box.children[index].id);box.children[index].scrollIntoView({block:'nearest'});}
 }
 async function search(input,query,ticket){
  const {status,box}=parts(input);if(!status||!box)return;
  if(preview){status.textContent='Automatic company lookup will be available when connected. For this review, enter the business details manually.';return;}
  status.textContent='Searching Companies House…';input.setAttribute('aria-busy','true');
  try{
   const response=await request('/lookups/companies',{query});
   if(ticket!==sequence||!input.isConnected||input.value.trim()!==query)return;
   items=(Array.isArray(response.items)?response.items:[]).filter(x=>x&&typeof x.name==='string'&&typeof x.number==='string').slice(0,10);
   status.textContent=items.length?`${items.length} ${items.length===1?'match':'matches'}. Choose your company, or keep entering details manually.`:'No matches found. Check the name or company number, or enter your details manually.';
   for(const [index,item]of items.entries()){
    const option=document.createElement('li');option.id=box.id+'-'+index;option.setAttribute('role','option');option.setAttribute('aria-selected','false');
    const name=document.createElement('strong'),number=document.createElement('span');name.textContent=item.name;number.textContent=item.number+(item.postcode?' · '+item.postcode:'');option.append(name,number);
    option.addEventListener('pointerdown',event=>event.preventDefault());option.addEventListener('click',()=>choose(index));box.append(option);
   }
   box.hidden=!items.length;input.setAttribute('aria-expanded',String(items.length>0));
  }catch(error){if(ticket===sequence&&input.isConnected)status.textContent='We couldn’t load company matches. Keep typing to retry, or enter your details manually.';}
  finally{if(input.isConnected)input.removeAttribute('aria-busy');}
 }
 root.addEventListener('input',event=>{
  const input=findInput(event);if(!input)return;cancel();activeInput=input;const {status}=parts(input),query=input.value.trim();
  // A name starts at three characters; numeric / prefixed registration numbers work in either field.
  if(query.length<3){if(status)status.textContent='';return;}
  if(input.dataset.companyQuery==='number'&&!/^[A-Z0-9]{3,8}$/i.test(query)){if(status)status.textContent='Enter up to eight letters or numbers, without spaces.';return;}
  const ticket=sequence;timer=setTimeout(()=>search(input,query,ticket),350);
 });
 root.addEventListener('keydown',event=>{
  const input=findInput(event);if(!input||input!==activeInput)return;
  if(event.key==='Escape'){event.preventDefault();cancel();return;}
  if(!items.length)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();highlight((activeIndex+(event.key==='ArrowDown'?1:items.length-1)+items.length)%items.length);}
  if(event.key==='Enter'&&activeIndex>=0){event.preventDefault();choose(activeIndex);}
 });
 root.addEventListener('focusout',event=>{if(findInput(event))cancel();});
 return {reset:cancel};
}
