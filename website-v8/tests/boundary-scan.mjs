// Bounded lexical evidence, not a general secret scanner or security certification.
// Never return matched values, source snippets or internal origin strings.
export function scanText(path,text,{publicCode=false}={}){
 const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['bearer-literal',/Bearer\s+[A-Za-z0-9._~+\/-]{24,}/i],
  ['credential-literal',/(?:api[_-]?key|client[_-]?secret|password|access[_-]?token|provider[_-]?secret)\s*['"]?\s*[:=]\s*['"][^'"\r\n]{24,}['"]/i],
  ['provider-key',/(?:AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{30,})/],
  ['internal-origin',/https?:\/\/(?:[^\s/'"<>]*\.(?:internal|local|azurewebsites\.net|database\.windows\.net)|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})(?=[:/\s'"<>]|$)/i],
  ['raw-diagnostic',/(?:SELECT\s+.{1,100}\s+FROM\s+|INSERT\s+INTO\s+|Traceback \(most recent call last\)|at \S+ \(.*:\d+:\d+\)|[A-Za-z]:\\(?:Users|inetpub)\\|\/home\/[^/\s]+\/)/i]
 ];
 if(publicCode)rules.push(
  ['browser-persistence',/\b(?:localStorage|sessionStorage|indexedDB)\b|document\.cookie\s*=/],
  ['query-write',/\.searchParams\.(?:set|append)\s*\(|location\.search\s*=|(?:location\.(?:href|assign|replace)|history\.(?:pushState|replaceState))[^;\n]*\?/],
  ['query-data-link',/['"]https?:\/\/[^'"\s]+\?[^'"]*['"]\s*\+\s*encodeURIComponent\s*\(/],
  ['analytics-sink',/\b(?:sendBeacon|gtag|fbq)\s*\(|dataLayer\.push\s*\(/],
  ['server-import',/(?:from\s*|import\s*\()['"][^'"]*(?:integration\/|node:)/]
 );
 return rules.filter(([,re])=>re.test(text)).map(([category])=>({path,category}));
}
export function artifactFindings(paths){return paths.filter(p=>/(?:^|\/)(?:\.env(?:\.|$)|\.git|integration|tests|docs|AGENTS\.md|README\.md)|\.(?:map|pem|key|pfx|p12|sql|bak)$|(?:programme|internal|credentials)/i.test(p)).map(path=>({path,category:'unexpected-artifact'}));}
