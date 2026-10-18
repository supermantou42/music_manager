const {execFile}=require('child_process'),{promisify}=require('util');const run=promisify(execFile);
// Energy is measured in a speech-oriented band; accompaniment remains present.
function splitPCM(pcm,{sampleRate=16000,minSeconds=3,targetSeconds=8,maxSeconds=18,frameSeconds=.025}={}){
 if(!(minSeconds>0&&minSeconds<=targetSeconds&&targetSeconds<=maxSeconds))throw Error('无效切分参数');
 const samples=Math.floor(pcm.length/2),duration=samples/sampleRate,frameSize=Math.round(sampleRate*frameSeconds);if(!samples)return {duration:0,segments:[],method:'band-energy-valleys'};
 const db=[];for(let offset=0;offset<samples;offset+=frameSize){let sum=0,count=Math.min(frameSize,samples-offset);for(let i=0;i<count;i++){const x=pcm.readInt16LE((offset+i)*2)/32768;sum+=x*x}db.push(20*Math.log10(Math.sqrt(sum/count)+1e-9))}
 const smooth=db.map((_,i)=>{let sum=0,n=0;for(let j=Math.max(0,i-2);j<=Math.min(db.length-1,i+2);j++){sum+=db[j];n++}return sum/n});
 const segments=[];let start=0;while(start<duration-1e-6){if(duration-start<=maxSeconds){add(duration,'尾段');break}const lo=Math.ceil((start+minSeconds)/frameSeconds),hi=Math.min(smooth.length-1,Math.floor((start+maxSeconds)/frameSeconds));let best=null;for(let i=lo;i<=hi;i++){const time=i*frameSeconds;if(duration-time<minSeconds)continue;const radius=Math.round(1/frameSeconds);let context=0,n=0;for(let j=Math.max(0,i-radius);j<=Math.min(smooth.length-1,i+radius);j++){context+=smooth[j];n++}const dip=context/n-smooth[i];if(dip<2.5||smooth[i]>smooth[i-1]||smooth[i]>smooth[i+1])continue;const cost=Math.abs(time-start-targetSeconds)*.4-dip*.3;if(!best||cost<best.cost)best={time,cost,dip}}add(best?.time??start+maxSeconds,best?'能量低谷':'最长片段回退')}
 function add(end,boundary){const first=Math.floor(start/frameSeconds),last=Math.min(db.length,Math.ceil(end/frameSeconds));let peak=-180;for(let i=first;i<last;i++)peak=Math.max(peak,db[i]);segments.push({index:segments.length,start:+start.toFixed(3),end:+end.toFixed(3),boundary,silent:peak< -65});start=end}
 return {duration:+duration.toFixed(3),method:'band-energy-valleys',parameters:{sampleRate,frameSeconds,minSeconds,targetSeconds,maxSeconds,bandHz:[150,3500]},segments};
}
async function segmentAudio(file){const {stdout}=await run('ffmpeg',['-v','error','-i',file,'-vn','-af','highpass=f=150,lowpass=f=3500','-ac','1','-ar','16000','-f','s16le','pipe:1'],{encoding:'buffer',windowsHide:true,maxBuffer:64*1024*1024,timeout:120000});return splitPCM(stdout)}
function stamp(seconds){const cs=Math.round(seconds*100);return `${String(Math.floor(cs/6000)).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`}
function roughLRC(segments){return '[re:声笺 声学粗切分，时间戳为片段起点，非逐句对齐]\n'+segments.map(s=>`[${stamp(s.start)}]${String(s.text||'').replace(/\s+/g,' ').trim()}`).join('\n')+'\n'}
module.exports={splitPCM,segmentAudio,stamp,roughLRC};
