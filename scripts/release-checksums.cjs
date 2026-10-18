const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
  const dir=path.resolve(__dirname,'../dist'),names=(await fs.readdir(dir)).filter(n=>/^MusicManager-.*\.(exe|zip)$/.test(n)).sort();
  if(!names.some(n=>n.endsWith('.exe'))||!names.some(n=>n.endsWith('.zip')))throw Error('Installer and ZIP are required');
  const lines=[];
  for(const name of names){const hash=crypto.createHash('sha256');for await(const chunk of require('node:fs').createReadStream(path.join(dir,name)))hash.update(chunk);lines.push(`${hash.digest('hex')}  ${name}`)}
  await fs.writeFile(path.join(dir,'SHA256SUMS.txt'),lines.join('\n')+'\n');
})().catch(error=>{console.error(error);process.exitCode=1});
