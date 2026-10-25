const fs=require('node:fs/promises'),path=require('node:path');
const {createDownloadService}=require('../../src/music-downloads.cjs');
(async()=>{
  const root=path.resolve(__dirname,'../../validation/online-music');await fs.mkdir(root,{recursive:true});
  const service=createDownloadService({stateFile:path.join(root,'downloads.json')});
  const sources=process.argv.includes('--all')?service.sources().map(s=>s.id):['jamendo','kuwo','qq','netease'];
  const result=await service.search(process.env.MUSIC_VERIFY_QUERY||'piano',sources);
  await fs.writeFile(path.join(root,'search-report.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result.groups.map(g=>({source:g.source,count:g.songs.length,error:g.error})),null,2));
  if(process.argv.includes('--download')){
    const song=result.songs.find(s=>s.source==='jamendo');if(!song)throw Error('No Jamendo result available for download verification');
    await service.enqueue(song.key,path.join(root,'audio'));await service.settled();
    const [job]=await service.list();console.log(JSON.stringify({status:job.status,preview:job.preview,path:job.path,audioInfo:job.audioInfo,error:job.error},null,2));
    if(job.status!=='completed')throw Error('Live audio download failed');
  }
})().catch(error=>{console.error(error);process.exitCode=1});
