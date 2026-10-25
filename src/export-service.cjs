const {prepareOgg}=require('./ogg-export.cjs');
const layoutTools=require('../ui/export-layout.js');
const fs=require('node:fs/promises'),native=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {resolveExport}=require('./export-metadata.cjs'),{duplicateIndex}=require('./audio-info.cjs'),{prepareCover}=require('./cover-export.cjs');
const run=require('node:util').promisify(require('node:child_process').execFile);
const inside=(child,parent)=>{const relative=path.relative(parent,child);return relative===''||!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)};
async function realTarget(value){if(typeof value!=='string'||!value.trim()||!path.isAbsolute(value))throw Error('请选择完整的输出目录');const resolved=path.resolve(value);let parent=resolved,tail=[];while(true){try{return path.join(await fs.realpath(parent),...tail.reverse())}catch(e){if(e.code!=='ENOENT')throw e;const next=path.dirname(parent);if(next===parent)throw e;tail.push(path.basename(parent));parent=next}}}
function createExporter(options={}){
 const trash=options.trash|| (async file=>{if(!process.versions.electron)throw Error('移入回收站需要在桌面客户端执行');await require('electron').shell.trashItem(file)});
 const command=options.command||((exe,args)=>run(exe,args,{windowsHide:true,maxBuffer:16*1024*1024,timeout:120000})),plans=new Map();let progress=null,executing=false;
 async function inspect(body,tracks){
  const layout=layoutTools.validate(body.layout),output=await realTarget(body.output),mode=body.mode||'single';if(!['single','separate'].includes(mode))throw Error('无效导出模式');
  if(!Array.isArray(body.ids)||!body.ids.length||body.ids.some(id=>!tracks.some(t=>t.id===id)))throw Error('请选择有效歌曲');
  let entries=[];try{if(!(await fs.stat(output)).isDirectory())throw Error('目标不是目录');entries=await fs.readdir(output)}catch(e){if(e.code!=='ENOENT')throw e}
  for(const track of tracks){const source=await fs.realpath(track.path).catch(()=>path.resolve(track.path));if(inside(source,output))throw Error('输出目录不能包含资料库源文件，请选择独立目录')}
  if(body.clear){const roots=[path.parse(output).root,os.homedir(),process.cwd(),require('./runtime-paths.cjs').data(),require('./runtime-paths.cjs').resource()];for(const root of roots)if(inside(path.resolve(root),output))throw Error('不能清空磁盘根目录、用户目录或应用目录');for(const folder of ['src','ui','tools','node_modules','metadata-bridge','.git']){const protectedPath=path.resolve(__dirname,'..',folder);if(inside(output,protectedPath))throw Error('不能清空应用文件目录')}}
  const stats=await Promise.all(entries.sort().map(async name=>{const s=await fs.lstat(path.join(output,name));return [name,s.size,s.mtimeMs]}));
  const signature=crypto.createHash('sha256').update(JSON.stringify([output,mode,layout,!!body.clear,[...new Set(body.ids)].sort(),stats])).digest('hex');return {output,mode,layout,clear:!!body.clear,count:entries.length,signature,entries};
 }
 function relativeName(track,layout,groups,tracks){const parts=layoutTools.parts(track,layout),group=groups.get(track.id),multiple=track.duplicateChoice?.keep&&track.duplicateChoice.groupId===group?.groupId&&group.members.filter(m=>tracks.find(t=>t.id===m.id)?.duplicateChoice?.keep).length>1;return path.join(...parts.directories,parts.filename+(multiple?'_'+track.id.replace(/[^a-zA-Z0-9]/g,'').slice(0,12):'')+parts.extension)}
 function preview(body,tracks){const layout=layoutTools.validate(body.layout);if(!Array.isArray(body.ids))throw Error('请选择歌曲');const groups=duplicateIndex(tracks);return {levels:layout.directories.length,examples:body.ids.map(id=>tracks.find(t=>t.id===id)).filter(Boolean).slice(0,3).map(t=>{const resolved=resolveExport(t),track={...resolved.track,...resolved.overrides};return {id:t.id,path:relativeName(track,layout,groups,tracks),lrc:body.mode==='separate'&&track.lyrics?relativeName(track,layout,groups,tracks).replace(/\.[^\.\\/]+$/,'.lrc'):null}})}}
 async function plan(body,tracks){const value=await inspect(body,tracks),token=crypto.randomUUID();for(const [id,p]of plans)if(p.expires<Date.now())plans.delete(id);plans.set(token,{signature:value.signature,expires:Date.now()+5*60*1000});return {output:value.output,mode:value.mode,clear:value.clear,count:value.count,confirmationToken:token,warning:value.clear&&value.count?'目标目录非空：现有内容将移入系统回收站，再开始导出。':''}}
 async function execute(body,tracks){if(executing)throw Error('正在导出，请稍后');executing=true;try{return await runExport(body,tracks)}finally{executing=false}}
 async function runExport(body,tracks){if(progress?.status==='running')throw Error('正在导出，请稍后');
  const target=await inspect(body,tracks);if(target.clear&&target.count){const confirmed=plans.get(body.confirmationToken);if(!confirmed||confirmed.expires<Date.now()||confirmed.signature!==target.signature)throw Error('目标目录内容已变化或尚未确认清空，请重新确认');plans.delete(body.confirmationToken)}
  progress={id:crypto.randomUUID(),status:'running',total:body.ids.length,completed:0,failed:0,skipped:0,percent:0,current:'',phase:'准备导出',results:[],recycled:0};const state=progress,results=state.results,hashes=new Set(),groups=duplicateIndex(tracks);const update=(phase,fraction)=>{state.phase=phase;state.percent=Math.min(99,100*(state.completed+fraction)/state.total)};
  try{
   await fs.mkdir(target.output,{recursive:true});if(await realTarget(target.output)!==target.output)throw Error('输出目录位置已变化，请重新选择');
   if(target.clear&&target.count){state.phase='移入回收站';for(const name of target.entries){const file=path.resolve(target.output,name);if(path.dirname(file)!==target.output)throw Error('清空路径无效');try{await trash(file);state.recycled++}catch(error){throw Error('移入回收站失败，已停止导出：'+error.message)}}}
   for(const id of body.ids){const track=tracks.find(t=>t.id===id);state.current=track.title;let temporary,destination,coverFile,metadataFile,created=false;
    try{
     if(track.exportExcluded||track.duplicateChoice?.keep===false&&track.duplicateChoice.groupId===groups.get(id)?.groupId){results.push({id,status:'跳过已排除歌曲'});state.skipped++;continue}
     update('检查重复文件',0);const stat=await fs.stat(track.path),hash=crypto.createHash('sha256');let bytes=0;for await(const chunk of native.createReadStream(track.path)){hash.update(chunk);bytes+=chunk.length;update('检查重复文件',.2*bytes/Math.max(1,stat.size))}const digest=hash.digest('hex');if(hashes.has(digest)){results.push({id,status:'跳过重复文件'});state.skipped++;continue}hashes.add(digest);
     const resolved=resolveExport(track),out=resolved.track;destination=path.join(target.output,relativeName({...out,...resolved.overrides},target.layout,groups,tracks));if(!inside(destination,target.output))throw Error('导出文件超出目标目录');await fs.mkdir(path.dirname(destination),{recursive:true});if(!inside(await fs.realpath(path.dirname(destination)),target.output))throw Error('导出子目录指向目标以外的位置');
     await fs.copyFile(track.path,destination,native.constants.COPYFILE_EXCL);created=true;update('写入元信息',.35);const ext=path.extname(destination);temporary=destination+'.'+crypto.randomUUID()+ext;coverFile=temporary+'.cover';
     const cover=await prepareCover(resolved.overrides.cover,coverFile);if(['.ogg','.opus'].includes(ext.toLowerCase())){metadataFile=temporary+'.ffmetadata';const args=await prepareOgg(track.path,out,resolved.overrides,target.mode,cover,metadataFile);await command('ffmpeg',['-v','error','-i',track.path,...args,temporary])}else await command('ffmpeg',['-v','error','-i',track.path,...(cover.file?['-i',cover.file]:[]),'-c','copy',...cover.args,'-metadata','title='+String(out.title||''),'-metadata','artist='+String(out.artist||''),'-metadata','album='+String(out.album||''),'-metadata','lyrics='+(target.mode==='single'?String(out.lyrics||''):''),'-metadata','unsyncedlyrics=',...Object.entries(resolved.overrides).filter(([key])=>!['title','artist','album','lyrics','cover'].includes(key)).flatMap(([key,value])=>['-metadata',key+'='+value]),temporary]);await fs.rename(temporary,destination);
     update('保存歌词',.9);if(target.mode==='separate'&&out.lyrics){const lrc=destination.slice(0,-ext.length)+'.lrc';if(!inside(lrc,target.output))throw Error('歌词路径无效');await fs.writeFile(lrc,out.lyrics,{flag:'wx'})}
     results.push({id,status:'已复制',path:destination,metadataOrigin:resolved.origin,tagsWritten:true,tagError:null,mode:target.mode});
    }catch(error){if(created&&destination)await fs.unlink(destination).catch(()=>{});state.failed++;results.push({id,status:'失败',error:error.code==='EEXIST'?'目标已存在同名文件，请调整命名规则或输出目录':String(error.stderr||error.message||error).trim().slice(-1600)})}
    finally{if(temporary)await fs.unlink(temporary).catch(()=>{});if(coverFile)await fs.unlink(coverFile).catch(()=>{});if(metadataFile)await fs.unlink(metadataFile).catch(()=>{});state.completed++;update('导出中',0)}
   }
   state.status='completed';state.percent=100;state.phase='导出完成';state.current='';return results;
  }catch(error){state.status='failed';state.phase='导出失败';state.error=error.message;throw error}
 }
 return {plan,execute,preview,snapshot:()=>progress?structuredClone(progress):null};
}
module.exports={createExporter};
