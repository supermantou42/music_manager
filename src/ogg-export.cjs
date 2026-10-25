const fs=require('node:fs/promises'),{execFile}=require('node:child_process'),run=require('node:util').promisify(execFile);
async function command(exe,args,binary=false){return run(exe,args,{windowsHide:true,timeout:120000,maxBuffer:24*1024*1024,...(binary?{encoding:'buffer'}:{})})}
function picture(bytes){const mime=Buffer.from('image/png'),description=Buffer.alloc(0),header=Buffer.alloc(4),dimensions=Buffer.alloc(16);if(bytes.length>=26){dimensions.writeUInt32BE(bytes.readUInt32BE(16),0);dimensions.writeUInt32BE(bytes.readUInt32BE(20),4);dimensions.writeUInt32BE(bytes[24]*({0:1,2:3,3:1,4:2,6:4}[bytes[25]]||3),8)}header.writeUInt32BE(3);const length=n=>{const b=Buffer.alloc(4);b.writeUInt32BE(n);return b};return Buffer.concat([header,length(mime.length),mime,length(description.length),description,dimensions,length(bytes.length),bytes]).toString('base64')}
function escape(value){return String(value).replace(/\\/g,'\\\\').replace(/[=;#]/g,m=>'\\'+m).replace(/\r\n|\r|\n/g,'\\\n')}
async function prepareOgg(source,track,overrides,mode,cover,metadataFile){
 const data=JSON.parse((await command('ffprobe',['-v','error','-show_streams','-show_format','-of','json',source])).stdout),audio=data.streams.find(s=>s.codec_type==='audio');if(!audio)throw Error('文件没有音轨');
 const tags={};for(const [key,value]of Object.entries({...data.format?.tags,...audio.tags}))tags[key.toLowerCase()]=String(value);
 for(const key of ['metadata_block_picture','coverart','coverartmime','lyrics','unsyncedlyrics'])delete tags[key];
 Object.assign(tags,{title:track.title||'',artist:track.artist||'',album:track.album||'',lyrics:mode==='single'?track.lyrics||'':''});for(const [key,value]of Object.entries(overrides))if(!['title','artist','album','lyrics','cover'].includes(key))tags[key]=String(value);
 if(overrides.cover!=='none'){
  const attached=data.streams.find(s=>s.disposition?.attached_pic);if(cover.file||attached){const input=cover.file||source,args=['-v','error','-i',input];if(!cover.file)args.push('-map','0:'+attached.index);args.push('-frames:v','1','-c:v','png','-f','image2pipe','pipe:1');const image=(await command('ffmpeg',args,true)).stdout;if(image.length>16*1024*1024)throw Error('封面超过16MB');tags.metadata_block_picture=picture(image)}
 }
 await fs.writeFile(metadataFile,';FFMETADATA1\n'+Object.entries(tags).map(([key,value])=>escape(key)+'='+escape(value)).join('\n')+'\n','utf8');
 return ['-f','ffmetadata','-i',metadataFile,'-map','0:a:0','-c:a','copy','-map_metadata','1:g','-map_metadata:s:a:0','1:g'];
}
module.exports={prepareOgg};
