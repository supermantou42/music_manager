const fs=require('fs/promises'),path=require('path');
const file=require('./runtime-paths.cjs').data('settings.json');
const defaults={asrConcurrency:32,apiConcurrency:10};let value={...defaults};
function validate(input){const next={...value,...input};for(const [key,max]of [['asrConcurrency',32],['apiConcurrency',16]])if(!Number.isInteger(next[key])||next[key]<1||next[key]>max)throw Error(`${key==='asrConcurrency'?'ASR':'接口'}并行度须为 1–${max} 的整数`);return {asrConcurrency:next.asrConcurrency,apiConcurrency:next.apiConcurrency}}
async function load(){try{value=validate(JSON.parse(await fs.readFile(file,'utf8')))}catch(e){if(e.code!=='ENOENT')console.warn('并行设置读取失败，使用默认值：'+e.message)}return snapshot()}
function snapshot(){return {...value}}
async function save(input){const next=validate(input);await fs.mkdir(path.dirname(file),{recursive:true});const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(next,null,2));await fs.rename(temp,file);value=next;return snapshot()}
module.exports={load,save,snapshot,validate};
