const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const wait=()=>new Promise(resolve=>setTimeout(resolve,70));
async function workspace(t){
  const library=[],errors=[],requests=[],sources=require('../src/music-sources.json').map(({hosts,...s})=>s),jobs=[];
  const html=fs.readFileSync(path.join(__dirname,'../ui/index.html'),'utf8').replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g,'');
  const console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
  const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:console});
  t.after(()=>{dom.window.close();assert.deepEqual(errors,[])});
  const w=dom.window,d=w.document;w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};
  const songs=[{key:'one',id:'1',source:'qq',title:'<img src=x onerror=alert(1)>',artist:'Artist',album:'Album',duration:180,bitrate:320},{key:'two',id:'2',source:'apple',title:'Preview',artist:'Singer',duration:200,preview:true}];
  w.fetch=async(url,options={})=>{
    requests.push({url,options});let data=null;
    if(url.startsWith('/api/state'))data={tracks:library,settings:{asrConcurrency:32,apiConcurrency:10}};
    if(url==='/api/music/sources')data=sources;
    if(url==='/api/music/preview'){const song=songs.find(s=>s.key===JSON.parse(options.body).key);data={...song,id:'online:'+song.key,online:true,path:'http://localhost/api/music/stream?id=online:'+song.key}}
    if(url==='/api/music/downloads')data=jobs;
    if(url==='/api/music/search')data={songs,groups:[{source:'qq',songs:[songs[0]]},{source:'apple',songs:[songs[1]]},{source:'kuwo',songs:[],error:'服务暂不可用'}]};
    if(url==='/api/music/download'){const body=JSON.parse(options.body),job={id:String(jobs.length),key:body.key,title:'Downloaded',artist:'Artist',source:'qq',status:'queued',receivedBytes:0};jobs.unshift(job);data=job}
    if(url==='/api/music/import'){const job=jobs.find(j=>j.id===JSON.parse(options.body).id),track={...job.track,path:job.path,status:'缺少歌词',differences:[],asrStatus:'unrecognized'};library.push(track);data={track,alreadyAdded:false}}
    if(url==='/api/music/cancel'){const body=JSON.parse(options.body);jobs.find(j=>j.id===body.id).status='cancelled';data={}}
    return {ok:true,json:async()=>data};
  };
  for(const name of ['lyrics.js','comparison.js','library.js','app.js','desktop.js','metadata-editor.js','appearance.js','online-music.js']){const s=d.createElement('script');s.textContent=fs.readFileSync(path.join(__dirname,'../ui',name),'utf8');d.body.append(s)}
  await wait();return {w,d,requests,jobs};
}
test('online music opens a bounded dialog with twelve sources and restores the library on Escape',async t=>{
  const {w,d}=await workspace(t);d.getElementById('openOnlineMusic').click();await wait();
  assert.equal(d.getElementById('onlineMusicPanel').hidden,false);assert.equal(d.querySelectorAll('#onlineSources input').length,12);assert.equal(d.querySelectorAll('#onlineSources input:checked').length,4);assert.equal(d.querySelector('main').inert,true);assert.equal(d.querySelector('.app-sidebar').inert,true);
  assert.match(d.getElementById('onlineSources').textContent,/Apple Music · 试听/);
  d.getElementById('onlineMusicPanel').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait();assert.equal(d.getElementById('onlineMusicPanel').hidden,true);assert.equal(d.querySelector('main').inert,false);assert.equal(d.querySelector('.app-sidebar').inert,false);
});
test('search shows source failures safely and batch download submits only selected result keys',async t=>{
  const {w,d,requests}=await workspace(t);d.getElementById('openOnlineMusic').click();await wait();
  d.getElementById('onlineQuery').value='Piano';d.getElementById('onlineSearchForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait();
  const search=JSON.parse(requests.find(r=>r.url==='/api/music/search').options.body);assert.equal(search.query,'Piano');assert.equal(search.sources.length,4);assert.equal(d.querySelectorAll('#onlineResults tbody tr').length,2);assert.equal(d.querySelector('#onlineResults img'),null);assert.match(d.getElementById('onlineResults').textContent,/<img src=x/);assert.match(d.getElementById('onlineMessage').textContent,/服务暂不可用/);
  d.querySelector('#onlineResults thead input').click();assert.equal(d.getElementById('onlineDownloadSelected').disabled,false);assert.equal(d.getElementById('onlineOutput').value,'');
  d.getElementById('onlineOutput').value='C:/Downloads/Music';d.getElementById('onlineDownloadSelected').click();await wait();
  const downloads=requests.filter(r=>r.url==='/api/music/download').map(r=>JSON.parse(r.options.body));assert.deepEqual(downloads,[{key:'one',output:'C:/Downloads/Music'},{key:'two',output:'C:/Downloads/Music'}]);assert.equal(d.getElementById('onlineDownloads').hidden,false);assert.equal(d.querySelectorAll('.online-download-row').length,2);
  d.querySelector('.online-download-actions button').click();await wait();assert(requests.some(r=>r.url==='/api/music/cancel'));
  const event=new w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});d.getElementById('onlineQuery').dispatchEvent(event);assert(event.defaultPrevented);
  const saved=JSON.parse(w.eval('JSON.stringify(captureWorkspace().onlineMusic)'));assert.equal(saved.output,'C:/Downloads/Music');assert.equal(saved.query,'Piano');assert.equal(saved.sources.length,4);assert.equal(saved.tab,'downloads');
});

test('search result audition needs no download directory and follows player state',async t=>{
  const {w,d,requests}=await workspace(t);let paused=true;
  Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return paused},configurable:true});
  Object.defineProperty(w.HTMLMediaElement.prototype,'readyState',{get(){return 4},configurable:true});
  w.HTMLMediaElement.prototype.play=async function(){paused=false;this.dispatchEvent(new w.Event('playing'))};
  w.HTMLMediaElement.prototype.pause=function(){paused=true;this.dispatchEvent(new w.Event('pause'))};
  d.getElementById('openOnlineMusic').click();await wait();d.getElementById('onlineQuery').value='Piano';d.getElementById('onlineSearchForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await wait();
  const button=d.querySelector('#onlineResults [data-play-track]');button.click();await wait();assert.equal(paused,false);assert.equal(d.getElementById('audioPlayer').getAttribute('src'),'/api/audio?id=online%3Aone');assert.equal(button.textContent,'⏸');
  button.click();await wait();assert.equal(paused,true);assert.equal(button.textContent,'▶');button.click();await wait();assert.equal(paused,false);
  assert.equal(requests.filter(r=>r.url==='/api/music/preview').length,1);assert.equal(requests.filter(r=>r.url==='/api/music/download').length,0);
});

test('downloaded audio can join the processing library and is selected for export',async t=>{
 const {w,d,jobs,requests}=await workspace(t);jobs.push({id:'done',key:'one',title:'Song',artist:'Artist',source:'qq',status:'completed',path:'C:/cache/Song.mp3',receivedBytes:10,track:{id:'download:done',title:'Song',artist:'Artist',duration:180}});
 d.getElementById('openOnlineMusic').click();await wait();d.getElementById('onlineDownloadsTab').click();const add=[...d.querySelectorAll('.online-download-actions button')].find(b=>b.textContent==='加入处理列表');assert(add);add.click();await wait();
 assert(requests.some(r=>r.url==='/api/music/import'));assert.equal(w.eval("checked.has('download:done')"),true);assert.match(d.getElementById('onlineDownloads').textContent,/已加入处理列表/);assert.equal(w.eval('tracks.length'),1);
});

test('result-derived facets deduplicate singers, expose populated ranges and sort from headers',async t=>{
 const {w,d,requests}=await workspace(t);const original=w.fetch;
 const songs=[{key:'a',id:'a',title:'A',artist:'Beta',source:'qq',duration:180,bitrate:320},{key:'b',id:'b',title:'B',artist:'Alpha',source:'netease',duration:240,bitrate:128},{key:'c',id:'c',title:'C',artist:'Alpha',source:'qq',duration:300,bitrate:256},{key:'u',id:'u',title:'U',artist:'Unknown',source:'qq',duration:0,bitrate:0}];
 w.fetch=async(url,options)=>url==='/api/music/search'?{ok:true,json:async()=>({songs,groups:[]})}:original(url,options);
 d.getElementById('openOnlineMusic').click();await wait();d.getElementById('onlineQuery').value='test';d.getElementById('onlineSearchForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await wait();
 const set=(id,value)=>{const n=d.getElementById(id);n.value=value;n.dispatchEvent(new w.Event('change'))};const keys=()=>[...d.querySelectorAll('#onlineResults [data-download-key]')].map(n=>n.dataset.downloadKey);const sort=key=>d.querySelector('[data-online-sort="'+key+'"]').click();
 assert.equal(d.querySelectorAll('#onlineArtistFilter option').length,4);assert.match(d.getElementById('onlineArtistFilter').textContent,/Alpha（2）/);assert.deepEqual([...d.querySelectorAll('#onlineDurationFilter option')].map(n=>n.value),['','3','4','5','unknown']);assert.deepEqual([...d.querySelectorAll('#onlineBitrateFilter option')].map(n=>n.value),['','128','256','320','unknown']);
 sort('bitrate');assert.deepEqual(keys(),['b','c','a','u']);sort('bitrate');assert.deepEqual(keys(),['a','c','b','u']);assert.equal(d.querySelector('th[aria-sort="descending"] button').dataset.onlineSort,'bitrate');sort('bitrate');assert.deepEqual(keys(),['a','b','c','u']);
 sort('artist');assert.deepEqual(keys().slice(0,2),['b','c']);d.querySelector('#onlineResults thead input').click();set('onlineArtistFilter','alpha');set('onlineSourceFilter','qq');set('onlineDurationFilter','5');set('onlineBitrateFilter','256');assert.deepEqual(keys(),['c']);assert.match(d.getElementById('onlineCount').textContent,/3 首隐藏/);
 d.getElementById('onlineDownloadSelected').click();await wait();assert.deepEqual(requests.filter(r=>r.url==='/api/music/download').map(r=>JSON.parse(r.options.body).key),['c']);
 d.getElementById('onlineResultsTab').click();d.getElementById('onlineClearFilters').click();assert.equal(keys().length,4);set('onlineDurationFilter','unknown');assert.deepEqual(keys(),['u']);d.getElementById('onlineClearFilters').click();set('onlineBitrateFilter','unknown');assert.deepEqual(keys(),['u']);
 const prefs=JSON.parse(w.eval('JSON.stringify(captureWorkspace().onlineMusic.filters)'));assert.equal(prefs.onlineBitrateFilter,'unknown');assert.equal(prefs.sortKey,'artist');
});
