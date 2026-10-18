const assert=require('node:assert/strict'),fs=require('fs/promises');
const {MPVPlayer}=require('./mpv-player.cjs');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await delay(50)}throw Error('mpv state timed out')}
(async()=>{const records=JSON.parse(await fs.readFile('validation/music-sample-10/results.json','utf8')).records;
const player=new MPVPlayer();try{
 await player.connect();await player.control('volume',0);
 const track=records.find(t=>t.title==='Hard Love');await player.load(track);await until(()=>player.state.loaded&&player.state.position>.1);
 assert.equal(await player.command(['get_property','current-ao']),'wasapi');
 await player.control('pause',true);await until(()=>player.state.paused);const before=player.state.position;await delay(200);assert.ok(Math.abs(player.state.position-before)<.1);
 await player.control('seek',20);await until(()=>Math.abs(player.state.position-20)<.2);
 await player.control('volume',35);await until(()=>player.state.volume===35);await player.control('volume',0);
 await assert.rejects(player.control('seek',-1));await assert.rejects(player.control('volume',101));
 const chinese=records.find(t=>t.title==='告白气球');const sliced={...chinese,transcriptSegments:[{start:30,end:32}]};await player.load(sliced,0);await until(()=>player.state.loaded);assert.equal(player.state.duration,2);
 await player.control('seek',1);await until(()=>player.state.position>=.9&&player.state.position<1.8);await until(()=>!player.state.loaded);assert.ok(player.state.position<2.2);
 await player.load(track);await until(()=>player.state.loaded);await player.control('stop');await until(()=>!player.state.loaded);assert.equal(player.state.position,0);
 console.log('Real mpv WASAPI: load, pause, exact seek, volume, bounded slice, switch, stop passed (muted).');
 }finally{player.dispose()}
})().catch(e=>{console.error(e);process.exitCode=1});
