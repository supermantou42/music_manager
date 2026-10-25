const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),run=require('node:util').promisify(require('node:child_process').execFile);
const {prepareOgg}=require('../src/ogg-export.cjs'),{createExporter}=require('../src/export-service.cjs');
const command=(exe,args)=>run(exe,args,{windowsHide:true,timeout:20000});
const inspect=async file=>JSON.parse((await command('ffprobe',['-v','error','-show_streams','-of','json',file])).stdout);
test('OGG export retains Vorbis audio and picture metadata and separates lyrics correctly',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'music-ogg-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const raw=path.join(root,'raw.ogg'),png=path.join(root,'cover.png'),source=path.join(root,'source.ogg'),metadata=path.join(root,'tags.txt');
 await command('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=0.1','-c:a','libvorbis',raw]);await command('ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=16x16','-frames:v','1',png]);
 const lyrics='[ti:Test]\n[00:10.00]a=b; # hash \\\\ slash',track={id:'1',title:'Title',artist:'Artist',album:'Album',lyrics,path:source,duration:1};const args=await prepareOgg(raw,track,{},'single',{file:png},metadata);await command('ffmpeg',['-v','error','-i',raw,...args,source]);
 const service=createExporter(),[single]=await service.execute({ids:['1'],output:path.join(root,'single')},[track]);assert.equal(single.status,'已复制');const data=await inspect(single.path),audio=data.streams.find(s=>s.codec_type==='audio');assert.equal(audio.codec_name,'vorbis');assert.equal(audio.tags.lyrics,lyrics);assert(data.streams.some(s=>s.disposition?.attached_pic));
 const hash=async file=>(await command('ffmpeg',['-v','error','-i',file,'-map','0:a:0','-c:a','copy','-f','hash','pipe:1'])).stdout;assert.equal(await hash(source),await hash(single.path));
 const [separate]=await service.execute({ids:['1'],output:path.join(root,'separate'),mode:'separate'},[track]);assert.equal(separate.status,'已复制');assert.equal(await fs.readFile(separate.path.replace(/\.ogg$/,'.lrc'),'utf8'),lyrics);assert(!(await inspect(separate.path)).streams.find(s=>s.codec_type==='audio').tags.lyrics);
 const noCover={...track,manualOverrides:{cover:'none'}},[removed]=await service.execute({ids:['1'],output:path.join(root,'none')},[noCover]);assert.equal(removed.status,'已复制');assert(!(await inspect(removed.path)).streams.some(s=>s.disposition?.attached_pic));
});
