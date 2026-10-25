const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createExporter}=require('../src/export-service.cjs');
async function setup(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'music-export-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const source=path.join(root,'source.mp3');await fs.writeFile(source,'audio');const tracks=[{id:'1',title:'Song',artist:'Artist',album:'Album',path:source,duration:180,lyrics:'[00:10.00]This is the song lyrics'}],calls=[];const trash=path.join(root,'mock-recycle-bin');const service=createExporter({trash:async file=>{await fs.mkdir(trash,{recursive:true});await fs.rename(file,path.join(trash,path.basename(file)))},command:async(exe,args)=>{calls.push(args);await fs.copyFile(source,args.at(-1))}});return {root,trash,tracks,calls,service,output:path.join(root,'out')}}
async function files(dir){const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);result.push(...e.isDirectory()?await files(file):[file])}return result}
test('single mode produces only tagged audio and separate mode produces audio plus LRC',async t=>{
 const {root,tracks,calls,service,output}=await setup(t);const results=await service.execute({ids:['1'],output},tracks);assert.equal(results[0].status,'已复制');assert.equal((await files(output)).length,1);assert(calls[0].includes('lyrics='+tracks[0].lyrics));assert.equal(service.snapshot().percent,100);
 const other=path.join(root,'separate');await service.execute({ids:['1'],output:other,mode:'separate'},tracks);const names=await files(other);assert.equal(names.length,2);assert.equal(await fs.readFile(names.find(n=>n.endsWith('.lrc')),'utf8'),tracks[0].lyrics);assert(calls[1].includes('lyrics='));assert(calls[1].includes('unsyncedlyrics='));
});
test('nonempty clearing requires confirmed unchanged plan and moves prior contents through the recycle adapter',async t=>{
 const {tracks,service,output,trash}=await setup(t);await fs.mkdir(output);await fs.writeFile(path.join(output,'keep.txt'),'recoverable');const body={ids:['1'],output,clear:true};const plan=await service.plan(body,tracks);assert(plan.warning);await assert.rejects(service.execute(body,tracks),/确认/);await fs.writeFile(path.join(output,'new.txt'),'new');await assert.rejects(service.execute({...body,confirmationToken:plan.confirmationToken},tracks),/变化/);const updated=await service.plan(body,tracks);await service.execute({...body,confirmationToken:updated.confirmationToken},tracks);assert.equal(await fs.readFile(path.join(trash,'keep.txt'),'utf8'),'recoverable');assert.equal((await files(output)).length,1);
});
test('source directories and invalid modes are rejected, failed tagging leaves no partial music',async t=>{
 const {root,tracks,service,output}=await setup(t);await assert.rejects(service.plan({ids:['1'],output:root,clear:true},tracks),/源文件/);await assert.rejects(service.execute({ids:['1'],output,mode:'legacy'},tracks),/模式/);const failing=createExporter({command:async()=>{throw Error('cannot tag')}});const result=await failing.execute({ids:['1'],output},tracks);assert.equal(result[0].status,'失败');assert.equal((await files(output)).length,0);assert.equal(failing.snapshot().failed,1);
});

test('recycle failure aborts export without falling back to deletion',async t=>{
 const {tracks,output}=await setup(t);await fs.mkdir(output);const file=path.join(output,'keep.txt');await fs.writeFile(file,'keep');let commands=0;
 const service=createExporter({trash:async()=>{throw Error('recycle unavailable')},command:async()=>{commands++}}),body={ids:['1'],output,clear:true};const plan=await service.plan(body,tracks);await assert.rejects(service.execute({...body,confirmationToken:plan.confirmationToken},tracks),/回收站失败/);assert.equal(await fs.readFile(file,'utf8'),'keep');assert.equal(commands,0);assert.equal(service.snapshot().status,'failed');
});

test('custom flat and layered naming is shared with preview and confirmation scope',async t=>{
 const {tracks,service,output}=await setup(t);const layout={directories:[],filename:'{artist} - {title} [{format}]'};const preview=service.preview({ids:['1'],layout,mode:'separate'},tracks);assert.equal(preview.levels,0);assert.equal(preview.examples[0].path,'Artist - Song [mp3].mp3');assert.equal(preview.examples[0].lrc,'Artist - Song [mp3].lrc');
 const result=await service.execute({ids:['1'],output,layout,mode:'separate'},tracks);assert.equal(path.dirname(result[0].path),output);assert.equal(path.basename(result[0].path),'Artist - Song [mp3].mp3');
 const plan=await service.plan({ids:['1'],output,layout,clear:true},tracks);await assert.rejects(service.execute({ids:['1'],output,layout:{directories:['{artist}'],filename:'{title}'},clear:true,confirmationToken:plan.confirmationToken},tracks),/变化/);
 const tools=require('../ui/export-layout.js');assert.throws(()=>tools.validate({directories:['../outside'],filename:'{title}'}));assert.throws(()=>tools.validate({directories:[],filename:'{unknown}'}));assert.throws(()=>tools.validate({directories:Array(6).fill('{artist}'),filename:'{title}'}));assert.equal(tools.parts({...tracks[0],title:'CON'},layout).filename,'Artist - CON [mp3]');assert.equal(tools.parts({...tracks[0],title:'CON'},{directories:[],filename:'{title}'}).filename,'_CON');
});

test('export errors show ffmpeg diagnostics instead of long command and lyric arguments',async t=>{
 const {tracks,output}=await setup(t);const service=createExporter({command:async()=>{const error=Error('Command failed ffmpeg '+ 'lyrics'.repeat(2000));error.stderr='Unsupported codec id in stream 1';throw error}});const [result]=await service.execute({ids:['1'],output},tracks);assert.equal(result.error,'Unsupported codec id in stream 1');
});
