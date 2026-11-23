const memory=new Map(),prefix='rust-foundry-result-v1:';
export function readResult(key){if(memory.has(key))return memory.get(key);try{return JSON.parse(localStorage.getItem(prefix+key));}catch{return null;}}
export function writeResult(key,value){memory.set(key,value);try{localStorage.setItem(prefix+key,JSON.stringify(value));}catch{/* The restart snapshot includes in-tab results. */}}
export const resultSnapshot=()=>[...memory];
export function restoreResults(values){for(const[key,value]of values||[])memory.set(key,value);}
