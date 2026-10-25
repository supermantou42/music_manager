const fs=require('node:fs/promises'),crypto=require('node:crypto');
const {audioInfo}=require('./audio-info.cjs');
async function importDownload(job,tracks,inspect){
  if(!job||job.status!=='completed'||!job.path)throw Error('请先完成下载');
  const existing=tracks.find(t=>t.path===job.path);if(existing)return {track:existing,alreadyAdded:true};
  const stat=await fs.stat(job.path),data=await inspect(job.path);
  const stream=data.streams?.find(s=>s.codec_type==='audio');if(!stream)throw Error('下载文件没有有效音轨');
  const tags=Object.fromEntries(Object.entries({...stream.tags,...data.format?.tags}).map(([k,v])=>[k.toLowerCase(),v]));
  const lyrics=tags.lyrics||tags.unsyncedlyrics||'';
  const track={id:job.track?.id||crypto.randomUUID(),path:job.path,title:job.title||tags.title||'未知歌名',artist:job.artist||tags.artist||'未知歌手',album:job.album||tags.album||'',duration:Number(data.format?.duration)||job.audioInfo?.duration||0,audioInfo:audioInfo(data,job.path),fileSignature:{size:stat.size,mtimeMs:stat.mtimeMs},cover:job.cover||'',coverIndex:data.streams.find(s=>s.disposition?.attached_pic)?.index??null,lyrics,source:lyrics?'内嵌':'',status:lyrics?'待核验':'缺少歌词',transcript:'',score:null,musicDownload:{id:job.id,source:job.source,preview:!!job.preview}};
  tracks.push(track);return {track,alreadyAdded:false};
}
module.exports={importDownload};
