const path=require('node:path'),fs=require('node:fs');
const localElectron=path.join(__dirname,'node_modules','electron','dist');
module.exports={
  appId:'io.github.supermantou42.musicmanager',
  productName:'MusicManager',
  executableName:'MusicManager',
  asar:true,
  electronDist:fs.existsSync(localElectron)?localElectron:undefined,
  directories:{output:'dist'},
  files:['src/**','ui/**','package.json','LICENSE','THIRD_PARTY_NOTICES.md','!node_modules/**'],
  extraResources:[
    {from:'metadata-bridge',to:'metadata-bridge',filter:['**/*','!*.exe','!*.ps1']},
    {from:'metadata-bridge/metadata-bridge.exe',to:'metadata-bridge/metadata-bridge.exe'},
    {from:'tools/mpv',to:'tools/mpv',filter:['*.exe','*.dll','doc/**','LICENSE.*']},
    {from:'tools/ffmpeg',to:'tools/ffmpeg',filter:['bin/ffmpeg.exe','bin/ffprobe.exe','LICENSE','README.txt']},
    {from:'scripts/install-asr-gpu.ps1',to:'scripts/install-asr-gpu.ps1'},
    {from:'docs/releasing.md',to:'RELEASING.md'},
    {from:'docs/asr.md',to:'asr.md'},
    {from:'build/runtime-notices.md',to:'RUNTIME-NOTICES.md'},
  ],
  win:{target:[{target:'nsis',arch:['x64']},{target:'zip',arch:['x64']}],artifactName:'MusicManager-${version}-win-${arch}.${ext}'},
  nsis:{oneClick:false,perMachine:false,allowToChangeInstallationDirectory:true,deleteAppDataOnUninstall:false,artifactName:'MusicManager-${version}-Setup-${arch}.${ext}'},
  publish:null,
};
