const fs=require('node:fs/promises'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(execFile);
module.exports=async function smoke({app,win,runtime}){
  const [ffmpeg,ffprobe,mpv]=await Promise.all([
    run(runtime.tool('ffmpeg','bin','ffmpeg.exe'),['-version'],{windowsHide:true,timeout:20000}),
    run(runtime.tool('ffmpeg','bin','ffprobe.exe'),['-version'],{windowsHide:true,timeout:20000}),
    run(runtime.tool('mpv','mpv.exe'),['--version'],{windowsHide:true,timeout:20000}),
  ]);
  await new Promise((resolve,reject)=>{
    const child=execFile(runtime.resource('metadata-bridge','metadata-bridge.exe'),[],{windowsHide:true,timeout:20000},(error,stdout)=>{
      if(error&&error.code!==1)return reject(error);
      try{if(JSON.parse(stdout).error!=='unsupported action/source')throw Error('Bridge response validation failed');resolve()}catch(e){reject(e)}
    });
    child.stdin.on('error',()=>{});child.stdin.end('{}');
  });
  const waveform=await require('./waveform.cjs').calculate(Buffer.alloc(400),10);
  const track={id:'release-smoke',lyrics:'sample lyric text',transcript:'sample lyric text',transcriptSegments:[{start:0,end:5,text:'sample lyric text'}]};
  if(!waveform.data||!await require('./lyric-score-cache.cjs').refreshScore(track)||track.score!==1)throw Error('Packaged worker validation failed');
  const ui=await win.webContents.executeJavaScript(`(async()=>({title:document.title,version:(await(await fetch('/api/app-info')).json()).version,native:typeof window.desktop?.player?.status==='function',debug:await window.desktop.development.available()}))()`);
  if(!app.isPackaged||!ui.native||ui.debug||ui.version!==app.getVersion())throw Error('Packaged UI or preload validation failed');
  await fs.mkdir(runtime.data(),{recursive:true});
  await fs.writeFile(runtime.data('release-smoke.json'),JSON.stringify({packaged:app.isPackaged,workers:true,bridge:true,...ui,ffmpeg:ffmpeg.stdout.split('\n')[0],ffprobe:ffprobe.stdout.split('\n')[0],mpv:mpv.stdout.split('\n')[0]},null,2));
};
