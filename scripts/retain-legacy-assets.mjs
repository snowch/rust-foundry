// Preserve the pre-release Vite graph for already-open tabs on the first rollout.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function retainLegacyAssets(directory,source,{fetcher=fetch}={}){
 const base=new URL(source.endsWith('/')?source:source+'/'),get=async path=>{const response=await fetcher(new URL(path,base),{cache:'no-store',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Could not preserve open-tab asset ${path} (HTTP ${response.status}).`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>12e6)throw Error('Legacy asset exceeds retention limit.');return bytes;};
 let metadata;const published=await fetcher(new URL('release.json',base),{cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(published.ok)metadata=await published.json();else if(published.status!==404)throw Error('Could not inspect the published legacy graph.');
 let pending=metadata?.legacyAssets?.map(file=>file.path);
 if(!pending){const html=(await get('index.html')).toString();pending=[...html.matchAll(/(?:src|href)=["']\.\/(assets\/[^"']+)["']/g)].map(match=>match[1]);if(metadata)return [];}
 // Old clients load their manifest by root URL. Reject publication if those bytes changed.
 if(pending.length){const old=JSON.parse((await get('toolchain/manifest.json')).toString()),current=JSON.parse(await readFile(`${directory}/toolchain/manifest.json`));if(JSON.stringify(old)!==JSON.stringify(current))throw Error('The compiler manifest changed: migrate the legacy toolchain before publishing.');}
 const retained=[],seen=new Set();
 while(pending.length){const path=pending.shift();if(seen.has(path))continue;if(!/^assets\/[A-Za-z0-9_.-]+\.(js|css|woff2)$/.test(path))throw Error('Unsafe legacy asset path.');seen.add(path);if(seen.size>100)throw Error('Too many legacy assets.');const bytes=await get(path),expected=metadata?.legacyAssets?.find(file=>file.path===path);if(expected&&(bytes.length!==expected.bytes||digest(bytes)!==expected.sha256))throw Error('Legacy asset integrity mismatch.');
  const target=`${directory}/${path}`;await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,bytes);retained.push({path,bytes:bytes.length,sha256:digest(bytes)});
  if(!metadata&&/\.(js|css)$/.test(path))for(const match of bytes.toString().matchAll(/["'(]((?:\.\/)?[A-Za-z0-9_.-]+\.(?:js|woff2))["')]/g))pending.push('assets/'+match[1].replace(/^\.\//,''));
 }
 return retained;
}
