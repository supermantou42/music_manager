const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');

test('moved modules and entry points resolve within the reorganized repository',async()=>{
  const config=require('../package.json');
  await fs.access(path.join(root,config.main));
  await fs.access(path.join(root,'src/preload.cjs'));
  for(const dir of ['src','tests','scripts','scripts/verify']){
    for(const name of await fs.readdir(path.join(root,dir))){
      if(!name.endsWith('.cjs'))continue;
      const file=path.join(root,dir,name),resolve=createRequire(file).resolve;
      for(const match of (await fs.readFile(file,'utf8')).matchAll(/require\(['"](\.[^'"]+)['"]\)/g)){
        assert.doesNotThrow(()=>resolve(match[1]),`${dir}/${name}: ${match[1]}`);
      }
    }
  }
});

test('HTTP entry serves frontend assets and package version after source relocation',async t=>{
  const {start}=require('../src/server.cjs');
  const before=await fs.readFile(path.join(root,'data/library.json')).catch(()=>null);
  const server=await start();
  t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base),html=await response.text();
  assert.equal(response.status,200);
  assert.ok(!html.includes('__TOKEN__'));
  for(const name of ['app.js','desktop.js','metadata-editor.js','appearance.js','lyrics.js','comparison.js','library.js','style.css','desktop.css','icons.svg']){
    const asset=await fetch(`${base}/${name}`);
    assert.equal(asset.status,200,name);
    assert.ok((await asset.text()).length>0,name);
  }
  assert.equal((await (await fetch(base+'/api/app-info')).json()).version,require('../package.json').version);
  assert.deepEqual(await fs.readFile(path.join(root,'data/library.json')).catch(()=>null),before,'loading must preserve the existing library');
});
