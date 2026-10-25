const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {createDownloadService,safeMediaURL}=require('../src/music-downloads.cjs');
const song={id:'test',source:'qq',name:'Song',artist:'Artist',album:'Album',duration:180,bitrate:320};
async function fixture(t,overrides={}){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'music-download-test-'));
  const stateFile=path.join(root,'state.json'),output=path.join(root,'output');
  const bridge=async request=>request.action==='catalog-search'?[{...song,source:request.source}]:{url:'https://audio.qq.com/test.mp3',preview:false,headers:{}};
  const options={stateFile,bridge,fetch:async()=>new Response(Buffer.from('audio-bytes'),{headers:{'content-length':'11','content-type':'audio/mpeg'}}),probe:async()=>({ext:'mp3',duration:180,bitrate:320}),...overrides};
  const service=createDownloadService(options);
  t.after(async()=>{for(const job of await service.list())await service.cancel(job.id);await service.settled();await fs.rm(root,{recursive:true,force:true})});
  return {service,root,output,stateFile,options};
}
test('multi-source search isolates provider failure and never exposes reusable media URLs',async t=>{
  const {service}=await fixture(t,{bridge:async request=>{if(request.source==='netease')throw Error('upstream https://music.163.com/api?token=private');return [{...song,url:'https://audio.qq.com/a?key=private'},{...song}]}});
  const found=await service.search('Song',['qq','netease']);
  assert.equal(found.songs.length,1);assert.equal(found.groups[1].songs.length,0);assert.ok(found.groups[1].error);assert(!JSON.stringify(found).includes('private'));
  assert.equal(service.sources().length,12);assert(service.sources().find(s=>s.id==='apple').preview);
  await assert.rejects(service.search('Song',['unknown']));await assert.rejects(service.search(' ',['qq']));
});
test('downloads preserve existing files, use actual audio extension and persist playable records',async t=>{
  const {service,output,options}=await fixture(t,{probe:async()=>({ext:'flac',duration:180,bitrate:900})});
  const found=await service.search('Song',['qq']);await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'Artist - Song.flac'),'keep');
  await assert.rejects(service.enqueue('invented',output));await assert.rejects(service.enqueue(found.songs[0].key,'relative'));
  await service.enqueue(found.songs[0].key,output);await service.settled();
  const [job]=await service.list();assert.equal(job.status,'completed');assert.equal(path.basename(job.path),'Artist - Song (1).flac');assert.equal(await fs.readFile(path.join(output,'Artist - Song.flac'),'utf8'),'keep');assert.equal(await fs.readFile(job.path,'utf8'),'audio-bytes');assert(!JSON.stringify(job).includes('https://audio.qq.com'));
  assert.deepEqual((await fs.readdir(output)).sort(),['Artist - Song (1).flac','Artist - Song.flac']);
  const reopened=createDownloadService(options);await reopened.load();assert.equal(reopened.track(job.track.id).path,job.path);
});
test('short preview tracks are labelled in both records and filenames',async t=>{
  const {service,output}=await fixture(t,{probe:async()=>({ext:'m4a',duration:30,bitrate:128})});
  const found=await service.search('Song',['qq']);await service.enqueue(found.songs[0].key,output);await service.settled();
  const [job]=await service.list();assert(job.preview);assert.match(job.path,/\[试听\]\.m4a$/);
});
test('valid audio with an incorrect HTML content type is still checked and downloaded',async t=>{
  const content=Buffer.concat([Buffer.from('ID3'),Buffer.alloc(100)]);
  const {service,output}=await fixture(t,{fetch:async()=>new Response(content,{headers:{'content-type':'text/html'}})});
  const found=await service.search('Song',['qq']);await service.enqueue(found.songs[0].key,output);await service.settled();
  assert.equal((await service.list())[0].status,'completed');
});
test('redirects cannot leave a source CDN and error responses never become music files',async t=>{
  let calls=0;const {service,output}=await fixture(t,{fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})}});
  const found=await service.search('Song',['qq']);await service.enqueue(found.songs[0].key,output);await service.settled();
  assert.equal(calls,1);assert.equal((await service.list())[0].status,'failed');assert.deepEqual(await fs.readdir(output),[]);
  for(const url of ['file:///secret','https://qq.com.attacker.com/a','http://127.0.0.1/a','https://user:password@audio.qq.com/a','https://audio.qq.com/a#auth=private'])assert.throws(()=>safeMediaURL(url,'qq'));
});
test('HTML and incomplete HTTP ranges are rejected without leaving partial files',async t=>{
  for(const response of [()=>new Response('login',{headers:{'content-type':'text/html'}}),()=>new Response('part',{status:206,headers:{'content-range':'bytes 0-3/100','content-length':'4'}})]){
    const {service,output}=await fixture(t,{fetch:async()=>response()});const found=await service.search('Song',['qq']);await service.enqueue(found.songs[0].key,output);await service.settled();assert.equal((await service.list())[0].status,'failed');assert.deepEqual(await fs.readdir(output),[]);
  }
});
test('download queue is bounded to two transfers and cancellation cleans active and queued work',async t=>{
  let active=0,maximum=0,resolved=0;const {service,output}=await fixture(t,{
    bridge:async request=>{if(request.action==='catalog-search')return [song];if(request.action==='catalog-lyrics')return {lyrics:''};resolved++;return {url:'https://audio.qq.com/song.mp3'}},
    fetch:async()=>{active++;maximum=Math.max(maximum,active);let timer;return new Response(new ReadableStream({start(controller){timer=setTimeout(()=>{controller.enqueue(new Uint8Array([1,2,3]));controller.close();active--},100)},cancel(){clearTimeout(timer);active--}}))},
  });
  const found=await service.search('Song',['qq']);const queued=[];for(let i=0;i<4;i++)queued.push(await service.enqueue(found.songs[0].key,output));
  await service.cancel(queued[0].id);await service.cancel(queued[3].id);await service.settled();
  const jobs=await service.list();assert.equal(jobs.find(j=>j.id===queued[0].id).status,'cancelled');assert.equal(jobs.find(j=>j.id===queued[3].id).status,'cancelled');assert(maximum<=2);assert(resolved<=3);assert(!(await fs.readdir(output)).some(name=>name.endsWith('.part')));
});
test('unfinished downloads are marked interrupted after restart without automatic network activity',async t=>{
  const {service,stateFile}=await fixture(t);await fs.writeFile(stateFile,JSON.stringify({jobs:[{id:'old',status:'downloading',receivedBytes:4}]}));
  const jobs=await service.list();assert.equal(jobs[0].status,'failed');assert.match(jobs[0].error,/中断/);
});
const http=require('node:http'),{once}=require('node:events');
test('online audition resolves opaque results and streams byte ranges without creating downloads',async t=>{
  const calls=[];const {service}=await fixture(t,{fetch:async(address,options)=>{calls.push({address,options});return new Response(Buffer.from('abc'),{status:206,headers:{'content-type':'audio/mpeg','content-range':'bytes 2-4/10','content-length':'3','accept-ranges':'bytes'}})}});
  const server=http.createServer((req,res)=>service.stream(req,res,new URL(req.url,'http://localhost').searchParams.get('id')));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
  const origin='http://127.0.0.1:'+server.address().port;
  await assert.rejects(service.preview('unknown',origin));const found=await service.search('Song',['qq']);const track=await service.preview(found.songs[0].key,origin);
  assert.equal(track.id,'online:'+found.songs[0].key);assert.equal(service.track(track.id),track);assert(!JSON.stringify(track).includes('audio.qq.com'));assert.deepEqual(await service.list(),[]);
  const response=await fetch(track.path,{headers:{Range:'bytes=2-4'}});assert.equal(response.status,206);assert.equal(await response.text(),'abc');assert.equal(response.headers.get('content-range'),'bytes 2-4/10');assert.equal(calls[0].options.headers.Range,'bytes=2-4');
  const missing=await fetch(origin+'/api/music/stream?id=unknown');assert.equal(missing.status,410);
});
test('audition rejects untrusted redirects before fetching the destination',async t=>{
  let calls=0;const {service}=await fixture(t,{fetch:async()=>{calls++;return new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})}});
  const found=await service.search('Song',['qq']),track=await service.preview(found.songs[0].key,'http://localhost');
  const server=http.createServer((req,res)=>service.stream(req,res,track.id));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve)}));
  const response=await fetch('http://127.0.0.1:'+server.address().port);assert.equal(response.status,502);assert.equal(calls,1);
});

test('downloads default to an app-owned temporary directory',async t=>{
 const {service,root}=await fixture(t);const result=await service.search('Song',['qq']);await service.enqueue(result.songs[0].key);await service.settled();const [job]=await service.list();assert.equal(job.status,'completed');assert.equal(job.output,path.join(root,'download-cache'));assert.equal(path.dirname(job.path),service.temporaryDirectory);
});

test('download retains same-source lyrics and lyric failures do not discard audio',async t=>{
 let fail=false;const {service,output}=await fixture(t,{bridge:async request=>request.action==='catalog-search'?[song]:request.action==='catalog-lyrics'?fail?Promise.reject(Error('lyric timeout')):{lyrics:'[00:10.00]downloaded original lyrics'}:{url:'https://audio.qq.com/test.mp3'}});
 const result=await service.search('Song',['qq']);await service.enqueue(result.songs[0].key,output);await service.settled();assert.equal((await service.list())[0].lyrics,'[00:10.00]downloaded original lyrics');fail=true;await service.enqueue(result.songs[0].key,output);await service.settled();const [job]=await service.list();assert.equal(job.status,'completed');assert.equal(job.lyricStatus,'获取失败');assert.match(job.lyricError,/timeout/);await fs.access(job.path);
});
