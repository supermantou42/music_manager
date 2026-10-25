function shiftLyrics(text,seconds){
 if(typeof seconds!=='number'||!Number.isFinite(seconds)||Math.abs(seconds)>600)throw Error('偏移须在 -600 到 600 秒之间');
 const offset=Number(String(text).match(/\[offset:\s*(-?\d+)\]/i)?.[1]||0)/1000;
 return String(text||'').replace(/\[offset:\s*-?\d+\]/gi,'').replace(/\[(\d+):(\d+(?:\.\d+)?)\]/g,(_,m,s)=>{const centiseconds=Math.max(0,Math.round((Number(m)*60+Number(s)-offset+seconds)*100));return '['+String(Math.floor(centiseconds/6000)).padStart(2,'0')+':'+String(Math.floor(centiseconds%6000/100)).padStart(2,'0')+'.'+String(centiseconds%100).padStart(2,'0')+']'});
}
module.exports={shiftLyrics};
