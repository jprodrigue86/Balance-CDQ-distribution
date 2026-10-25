// Execute the bytes just inspected, including their complete static dependency
// graph. Browser module cache and service-worker fallbacks cannot substitute an
// older root copy. Only the closed, public PC test graph is accepted.
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',typeof value==='string'?new TextEncoder().encode(value):value));
const asUrl=text=>{const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return 'data:text/javascript;base64,'+btoa(binary);};
export function verifiedModuleGraphV58(manifest){
 const sources=manifest?.sources,records=new Map((manifest?.files||[]).map(x=>[x.name,x]));
 if(!(sources instanceof Map)||!records.size)throw Error('MISSING_VERIFIED_SOURCES');
 const urls=new Map(),modules=new Map();
 async function url(name,ancestors=[]){
  if(ancestors.includes(name))throw Error('CYCLIC_TEST_DEPENDENCY: '+name);
  if(urls.has(name))return urls.get(name);
  const task=(async()=>{
   const source=sources.get(name),record=records.get(name);
   if(!/^(?:pc\/[\w-]+\.mjs|apps-script-manager\/(?:local-tests|regressions)-v58\.mjs)$/.test(name)||typeof source!=='string'||!record)throw Error('UNINSPECTED_TEST_DEPENDENCY: '+name);
   if(await digest(source)!==record.sha256)throw Error('VERIFIED_SOURCE_CHANGED: '+name);
   if(name.startsWith('pc/')&&/\bimport\s*\(/.test(source))throw Error('DYNAMIC_TEST_DEPENDENCY: '+name);
   const imports=[...source.matchAll(/^(?:import|export)\s+[^;\n]*?\bfrom\s*(['"])([^'"]+)\1\s*;/gm)];
   let rewritten=source;
   for(const match of imports){
    const spec=match[2];if(!/^\.\/[\w-]+\.mjs$/.test(spec))throw Error('UNSAFE_TEST_DEPENDENCY: '+spec);
    const target=name.slice(0,name.lastIndexOf('/')+1)+spec.slice(2);
    const targetUrl=await url(target,[...ancestors,name]);
    rewritten=rewritten.replace(match[0],match[0].replace(match[1]+spec+match[1],JSON.stringify(targetUrl)));
   }
   // Side-effect imports are not part of the qualified graph.
   if(/^import\s*['"]/m.test(rewritten))throw Error('UNINSPECTED_SIDE_EFFECT_IMPORT');
   return asUrl(rewritten);
  })();urls.set(name,task);return task;
 }
 return {async sources(){const out=new Map();for(const [name,source]of sources){const record=records.get(name);if(!record||await digest(source)!==record.sha256)throw Error('VERIFIED_SOURCE_CHANGED: '+name);out.set(name,source);}return out;},load(name){if(!modules.has(name))modules.set(name,url(name).then(spec=>import(spec)));return modules.get(name);}};
}
