const fs=require('node:fs/promises'),nativeFS=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Readable,Transform}=require('node:stream'),{pipeline}=require('node:stream/promises');
const {execFile}=require('node:child_process'),{promisify}=require('node:util');
const {setTimeout:delay}=require('node:timers/promises');
const {createLimiter}=require('./concurrency.cjs'),{clean}=require('./core.cjs');
const definitions=require('./music-sources.json');
const MAX_BYTES=1024*1024*1024;
function safeMediaURL(address,source){
  const u=new URL(address),definition=definitions.find(s=>s.id===source);
  if(!definition||!['http:','https:'].includes(u.protocol)||u.username||u.password||u.hash||u.port&&!['80','443'].includes(u.port))throw Error('平台未提供可用的音频直链');
  const host=u.hostname.toLowerCase();
  if(!definition.hosts.some(suffix=>host===suffix||host.endsWith('.'+suffix)))throw Error('音频地址不属于该平台的已支持 CDN：'+host);
  return u.href;
}
function message(error){return String(error?.message||error).replace(/https?:\/\/[^\s"'<>]+/g,url=>{try{return new URL(url).origin}catch{return '[地址]'}}).slice(0,300)}
async function probe(file){
  const {stdout}=await promisify(execFile)('ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_streams','-show_format','-of','json',file],{windowsHide:true,timeout:20000,maxBuffer:2*1024*1024});
  const data=JSON.parse(stdout),audio=data.streams?.find(s=>s.codec_type==='audio');
  if(!audio||data.streams.some(s=>s.codec_type==='video'&&!s.disposition?.attached_pic))throw Error('返回的文件不是独立音频');
  const formats=String(data.format?.format_name||'').split(','),name=formats[0];
  const ext=formats.includes('m4a')?'m4a':name==='ogg'&&audio.codec_name==='opus'?'opus':({mp3:'mp3',flac:'flac',ogg:'ogg',wav:'wav',aac:'aac',ape:'ape',asf:'wma'})[name];
  if(!ext||!Number.isFinite(Number(data.format?.duration))||Number(data.format.duration)<=0)throw Error('音频格式或时长无效');
  return {ext,duration:Number(data.format.duration),bitrate:Math.round(Number(data.format.bit_rate||0)/1000)};
}
function createDownloadService(options={}){
  const bridge=options.bridge||require('./music-bridge.cjs').bridge,request=options.fetch||fetch,inspect=options.probe||probe,validate=options.validateURL||safeMediaURL;
  const stateFile=options.stateFile||require('./runtime-paths.cjs').data('downloads.json');
  const temporaryDirectory=options.temporaryDirectory||path.join(path.dirname(stateFile),'download-cache');
  const downloads=createLimiter(2),providers=createLimiter(4),results=new Map(),jobs=new Map(),controllers=new Map();
  let loaded=null,writes=Promise.resolve();
  const snapshot=j=>JSON.parse(JSON.stringify(j));
  async function load(){if(!loaded)loaded=(async()=>{try{const saved=JSON.parse(await fs.readFile(stateFile,'utf8'));for(const entry of (saved.jobs||[]).slice(-200)){if(!entry||typeof entry.id!=='string')continue;const j={...entry};if(['queued','resolving','downloading','checking'].includes(j.status)){j.status='failed';j.error='下载已中断，请重新搜索后重试'}jobs.set(j.id,j)}}catch{}})();return loaded}
  function persist(){const content=JSON.stringify({version:1,jobs:[...jobs.values()].slice(-200)});writes=writes.catch(()=>{}).then(async()=>{await fs.mkdir(path.dirname(stateFile),{recursive:true});const temporary=stateFile+'.tmp';await fs.writeFile(temporary,content);await fs.rename(temporary,stateFile)});return writes}
  function sources(){return definitions.map(({hosts,...s})=>({...s,cookieConfigured:!!process.env['MUSIC_'+s.id.toUpperCase()+'_COOKIE']}))}
  async function search(query,ids){
    query=String(query||'').trim();
    if(!query||query.length>200)throw Error('请输入 1–200 字的歌名或歌手');
    if(!Array.isArray(ids)||!ids.length||ids.length>12||ids.some(id=>!definitions.some(s=>s.id===id)))throw Error('请选择有效的音乐源');
    const now=Date.now();for(const [key,value]of results)if(value.expires<now)results.delete(key);
    const groups=await Promise.all([...new Set(ids)].map(source=>providers.run(async()=>{
      try{
        const found=await bridge({action:'catalog-search',source,query,limit:20},45000);
        if(!Array.isArray(found))throw Error('平台返回的搜索结果无效');
        const seen=new Set(),songs=[];
        for(const raw of found.slice(0,50)){
          if(!raw?.id||seen.has(String(raw.id)))continue;seen.add(String(raw.id));
          const key=crypto.randomUUID(),song={...raw,source,id:String(raw.id)};
          results.set(key,{song,expires:Date.now()+30*60*1000});
          songs.push({key,source,id:song.id,title:String(song.name||'未知歌名'),artist:String(song.artist||'未知歌手'),album:String(song.album||''),duration:Number(song.duration)||0,bitrate:Number(song.bitrate)||0,cover:String(song.cover||''),isVIP:!!song.is_vip,preview:source==='apple'});
        }
        return {source,songs,error:null};
      }catch(error){return {source,songs:[],error:message(error)}}
    })));
    while(results.size>1000)results.delete(results.keys().next().value);
    return {query,groups,songs:groups.flatMap(g=>g.songs)};
  }
  const previews=new Map(),previewPending=new Map();
  async function preview(key,origin){
    const entry=results.get(key);if(!entry||entry.expires<Date.now())throw Error('搜索结果已过期，请重新搜索');
    if(previewPending.has(key))return previewPending.get(key);
    const task=(async()=>{const resolved=await providers.run(()=>bridge({action:'catalog-resolve',source:entry.song.source,song:entry.song},45000));
      const address=validate(resolved.url,entry.song.source),song=entry.song,id='online:'+key;
      const track={id,title:String(song.name||'未知歌名'),artist:String(song.artist||'未知歌手'),album:String(song.album||''),cover:String(song.cover||''),duration:Number(song.duration)||0,lyrics:'',online:true,preview:!!resolved.preview||song.source==='apple',path:origin+'/api/music/stream?id='+encodeURIComponent(id)};
      previews.set(id,{track,address,headers:resolved.headers||{},source:song.source,expires:Date.now()+30*60*1000});
      while(previews.size>100)previews.delete(previews.keys().next().value);return track;
    })();previewPending.set(key,task);try{return await task}finally{previewPending.delete(key)}
  }
  async function stream(req,res,id){
    const entry=previews.get(id);if(!entry||entry.expires<Date.now()){res.writeHead(410).end();return}
    const controller=new AbortController(),signal=AbortSignal.any([controller.signal,AbortSignal.timeout(10*60*1000)]);res.on('close',()=>controller.abort());
    const headers={};for(const [key,value] of Object.entries(entry.headers))if(['user-agent','referer'].includes(key.toLowerCase())&&typeof value==='string')headers[key]=value;
    if(req.headers.range){if(!/^bytes=\d*-\d*$/.test(req.headers.range)){res.writeHead(416).end();return}headers.Range=req.headers.range}
    try{let address=entry.address,response;
      for(let redirects=0;redirects<=5;redirects++){response=await request(validate(address,entry.source),{headers,redirect:'manual',signal});
        if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(!location||redirects===5)throw Error('试听地址重定向失败');address=new URL(location,address).href;continue}break}
      if(![200,206,416].includes(response.status)||!response.body)throw Error('平台音频暂不可用');
      const reader=response.body.getReader(),first=await reader.read();if(first.done)throw Error('平台返回空音频');
      const prefix=Buffer.from(first.value),text=prefix.subarray(0,512).toString('utf8');
      if(/^\s*(?:\uFEFF)?\s*(?:<!doctype|<html|<head|<body|<\?xml|\{|\[|#EXTM3U)/i.test(text)){await reader.cancel();throw Error('平台未提供可试听音频')}
      const output={'Cache-Control':'no-store'};for(const key of ['content-type','content-length','content-range','accept-ranges']){const value=response.headers.get(key);if(value&&!(key==='content-length'&&response.headers.get('content-encoding')))output[key]=value}
      if(/text\/html|application\/json/i.test(output['content-type']||''))output['content-type']=prefix.subarray(0,3).toString()==='ID3'||prefix[0]===255?'audio/mpeg':'application/octet-stream';
      async function* chunks(){try{yield first.value;while(true){const next=await reader.read();if(next.done)break;yield next.value}}finally{await reader.cancel().catch(()=>{})}}
      res.writeHead(response.status,output);await pipeline(Readable.from(chunks()),res,{signal});
    }catch(error){if(!res.headersSent&&!res.destroyed)res.writeHead(502).end('试听加载失败');else res.destroy()}
  }
  async function list(){await load();return [...jobs.values()].reverse().map(snapshot)}
  async function transfer(j,entry,signal){
    let temporary;
    try{
      signal.throwIfAborted();j.status='resolving';
      const resolved=await providers.run(()=>bridge({action:'catalog-resolve',source:j.source,song:entry.song},45000,{signal}));
      signal.throwIfAborted();j.preview=!!resolved.preview||j.source==='apple';
      let address=validate(resolved.url,j.source),response;
      const headers={};for(const [key,value]of Object.entries(resolved.headers||{}))if(['user-agent','referer'].includes(key.toLowerCase())&&typeof value==='string')headers[key]=value;
      for(let redirects=0;redirects<=5;redirects++){
        for(let attempt=0;attempt<3;attempt++){
          try{response=await request(address,{headers,redirect:'manual',signal});break}
          catch(error){if(signal.aborted||attempt===2)throw error;await delay(250*(attempt+1),undefined,{signal})}
        }
        if([301,302,303,307,308].includes(response.status)){
          const location=response.headers.get('location');await response.body?.cancel();
          if(!location||redirects===5)throw Error('音频地址重定向失败');
          address=validate(new URL(location,address).href,j.source);continue;
        }
        break;
      }
      if(!response.ok||!response.body)throw Error('音频下载失败（HTTP '+response.status+'）');
      if(response.status===206){const range=/^bytes 0-(\d+)\/(\d+)$/.exec(response.headers.get('content-range')||'');if(!range||Number(range[1])+1!==Number(range[2])){await response.body.cancel();throw Error('平台返回了不完整的音频片段')}}
      const type=response.headers.get('content-type')||'';
      const total=response.headers.get('content-encoding')?0:Number(response.headers.get('content-length')||0);
      if(total>MAX_BYTES){await response.body.cancel();throw Error('音频超过 1 GiB 下载限制')}
      j.totalBytes=Number.isFinite(total)&&total>0?total:null;j.status='downloading';j.receivedBytes=0;
      temporary=path.join(j.output,'.music-download-'+j.id+'.part');
      let prefix=Buffer.alloc(0),assessed=false;
      function inspectPrefix(final=false){
        if(assessed)return;
        const text=prefix.toString('utf8'),magic=prefix.subarray(0,4).toString('ascii');
        const audio=['ID3','fLa','Ogg','RIF','RF6','MAC'].includes(magic.slice(0,3))||prefix.subarray(4,8).toString('ascii')==='ftyp'||prefix[0]===255&&(prefix[1]&224)===224||prefix.subarray(0,4).toString('hex')==='3026b275';
        if(audio){assessed=true;return}
        if(/^\s*(?:\uFEFF)?\s*(?:<!doctype|<html|<head|<body|<\?xml|\{|\[|#EXTM3U)/i.test(text)||(/text\/html|application\/json|mpegurl/i.test(type)&&(prefix.length>=512||final)))throw Error('平台返回了页面或播放列表，无法作为音频下载');
        if(prefix.length>=512||final)assessed=true;
      }
      const count=new Transform({transform(chunk,encoding,callback){j.receivedBytes+=chunk.length;if(j.receivedBytes>MAX_BYTES)return callback(Error('音频超过 1 GiB 下载限制'));try{if(!assessed)prefix=Buffer.concat([prefix,chunk.subarray(0,512-prefix.length)]);inspectPrefix();callback(null,chunk)}catch(error){callback(error)}},flush(callback){try{inspectPrefix(true);callback()}catch(error){callback(error)}}});
      await pipeline(Readable.fromWeb(response.body),count,nativeFS.createWriteStream(temporary,{flags:'wx'}),{signal});
      if(!j.receivedBytes||j.totalBytes&&j.receivedBytes!==j.totalBytes)throw Error('音频响应不完整');
      j.status='checking';const info=await inspect(temporary);signal.throwIfAborted();
      if(!['mp3','flac','m4a','ogg','opus','wav','aac','ape','wma'].includes(info.ext)||!(info.duration>0))throw Error('返回的音频信息无效');
      if(entry.song.duration>0&&info.duration<entry.song.duration*.85&&entry.song.duration-info.duration>10)j.preview=true;
j.lyrics='';j.lyricStatus='该源不提供歌词';
      if(definitions.find(s=>s.id===j.source)?.lyrics){try{const result=await providers.run(()=>bridge({action:'catalog-lyrics',source:j.source,song:entry.song},25000,{signal}));j.lyrics=String(result.lyrics||'');j.lyricStatus=j.lyrics.trim()?'已获取':'未返回歌词'}catch(error){j.lyricStatus='获取失败';j.lyricError=message(error)}}
      signal.throwIfAborted();
      const stem=clean(j.artist)+' - '+clean(j.title)+(j.preview?' [试听]':'');
      let destination;
      for(let index=0;index<10000;index++){
        destination=path.join(j.output,stem+(index?' ('+index+')':'')+'.'+info.ext);
        try{await fs.copyFile(temporary,destination,nativeFS.constants.COPYFILE_EXCL);break}catch(error){if(error.code!=='EEXIST')throw error;if(index===9999)throw Error('同名文件过多')}
      }
      if(signal.aborted){await fs.unlink(destination);signal.throwIfAborted()}
      j.path=destination;j.audioInfo=info;      j.status='completed';j.finishedAt=new Date().toISOString();j.track={id:'download:'+j.id,title:j.title,artist:j.artist,album:j.album,path:destination,duration:info.duration,lyrics:'',cover:j.cover,coverIndex:null};
    }catch(error){const timeout=signal.reason?.name==='TimeoutError';j.status=signal.aborted&&!timeout?'cancelled':'failed';j.error=timeout?'下载超时，请重试':signal.aborted?'下载已取消':(error.cause?.code?'网络错误（'+error.cause.code+'）：':'')+message(error);j.finishedAt=new Date().toISOString()}
    finally{if(temporary)await fs.unlink(temporary).catch(()=>{});controllers.delete(j.id);await persist().catch(()=>{})}
  }
  async function enqueue(key,output){
    await load();const entry=results.get(key);
    if(!entry||entry.expires<Date.now())throw Error('搜索结果已过期，请重新搜索');
    if(output==null||output==='')output=temporaryDirectory;
    if(typeof output!=='string'||!output.trim()||!path.isAbsolute(output))throw Error('请选择下载目录（绝对路径）');
    if([...jobs.values()].filter(j=>['queued','resolving','downloading','checking'].includes(j.status)).length>=50)throw Error('下载队列已满，请等待现有任务完成');
    output=path.resolve(output);await fs.mkdir(output,{recursive:true});
    const song=entry.song,j={id:crypto.randomUUID(),key,source:song.source,title:String(song.name||'未知歌名'),artist:String(song.artist||'未知歌手'),album:String(song.album||''),cover:String(song.cover||''),output,status:'queued',receivedBytes:0,totalBytes:null,preview:song.source==='apple',createdAt:new Date().toISOString()};
    jobs.set(j.id,j);while(jobs.size>200){const old=[...jobs.values()].find(x=>['completed','failed','cancelled'].includes(x.status));if(!old)break;jobs.delete(old.id)}
    const controller=new AbortController();controllers.set(j.id,controller);try{await persist()}catch(error){controllers.delete(j.id);jobs.delete(j.id);throw error}
    downloads.run(()=>transfer(j,entry,AbortSignal.any([controller.signal,AbortSignal.timeout(10*60*1000)]))).catch(()=>{});
    return snapshot(j);
  }
  async function cancel(id){await load();const j=jobs.get(id);if(!j)throw Error('下载任务不存在');if(controllers.has(id)){j.status='cancelled';controllers.get(id).abort();await persist()}return snapshot(j)}
  function track(id){if(previews.has(id))return previews.get(id).track;return [...jobs.values()].find(j=>j.track?.id===id&&j.status==='completed')?.track}
  return {sources,search,preview,stream,list,enqueue,cancel,track,load,temporaryDirectory,settled:async()=>{while(downloads.snapshot().active||downloads.snapshot().queued)await new Promise(resolve=>setTimeout(resolve,5));await writes}};
}
module.exports={createDownloadService,safeMediaURL,probe};
