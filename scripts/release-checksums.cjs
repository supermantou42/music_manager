const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
  const dir=path.resolve(__dirname,'../dist'),version=require('../package.json').version,names=[`MusicManager-${version}-Setup-x64.exe`,`MusicManager-${version}-win-x64.zip`];
  for(const name of names)await fs.access(path.join(dir,name));
  const lines=[];
  for(const name of names){const hash=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(path.join(dir,name)))hash.update(chunk);lines.push(`${hash.digest('hex')}  ${name}`)}
  await fs.writeFile(path.join(dir,'SHA256SUMS.txt'),lines.join('\n')+'\n');
})().catch(error=>{console.error(error);process.exitCode=1});
