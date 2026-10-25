const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {importDownload}=require('../src/download-import.cjs');
test('completed downloads append to the current library once and retain exportable source paths',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'music-import-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,'song.mp3');await fs.writeFile(file,'audio');
 const tracks=[{id:'existing',path:'other.mp3'}],job={id:'job1',status:'completed',path:file,title:'Title',artist:'Artist',album:'Album',source:'qq',preview:true,lyrics:'same source lyrics',lyricStatus:'已获取',track:{id:'download:job1'}};
 const inspect=async()=>({streams:[{codec_type:'audio',codec_name:'mp3',bit_rate:'192000',tags:{lyrics:'test lyrics'}}],format:{duration:'180'}});
 await assert.rejects(importDownload({...job,status:'downloading'},tracks,inspect));
 const result=await importDownload(job,tracks,inspect);assert.equal(tracks.length,2);assert.equal(result.track.path,file);assert.equal(result.track.artist,'Artist');assert.equal(result.track.audioInfo.bitrate,192000);assert.equal(result.track.lyrics,'same source lyrics');assert.equal(result.track.originalMetadata.lyrics,'same source lyrics');assert.equal(result.track.source,'qq');assert.equal(result.track.musicDownload.preview,true);assert.equal(result.track.fileSignature.size,5);
 const again=await importDownload(job,tracks,inspect);assert.equal(again.alreadyAdded,true);assert.equal(tracks.length,2);assert.equal(tracks[0].id,'existing');
 const exported=await require('../src/server.cjs').exportTracks({ids:[result.track.id],output:path.join(root,'export')},tracks);assert.equal(exported[0].status,'已复制');assert.equal(await fs.readFile(exported[0].path,'utf8'),'audio');
});
