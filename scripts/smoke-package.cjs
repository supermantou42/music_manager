const path=require('node:path'),fs=require('node:fs/promises'),{spawn}=require('node:child_process'),os=require('node:os');
(async()=>{
  const workspace=await fs.mkdtemp(path.join(os.tmpdir(),'music-manager-package-'));
  const dir=path.join(workspace,'new-profile');
  const exe=path.resolve(__dirname,'../dist/win-unpacked/MusicManager.exe');
  const env={...process.env,MUSIC_MANAGER_DATA_DIR:dir};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(exe,['--smoke-test'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='';for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output=(output+chunk).slice(-8000)});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{child.kill();reject(Error('Packaged application startup timed out: '+output))},120000);child.once('error',e=>{clearTimeout(timer);reject(e)});child.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Packaged smoke test exit '+code+': '+output))})});
  console.log(await fs.readFile(path.join(dir,'release-smoke.json'),'utf8'));
})().catch(e=>{console.error(e);process.exitCode=1});
