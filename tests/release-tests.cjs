const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {checkRelease}=require('../scripts/check-release.cjs');
test('clean builders can download Electron while local builds reuse an installed runtime',async()=>{
  const file=path.resolve(__dirname,'../electron-builder.config.cjs');
  const source=await fs.readFile(file,'utf8');
  function load(exists){
    const module={exports:{}};
    const localRequire=name=>name==='node:fs'?{existsSync:()=>exists}:require(name);
    new Function('require','module','__dirname',source)(localRequire,module,path.dirname(file));
    return module.exports;
  }
  assert.equal(load(false).electronDist,undefined);
  assert.equal(load(true).electronDist,path.resolve(__dirname,'../node_modules/electron/dist'));
});
test('release tags must match package and lockfile versions',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'music-manager-version-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const version='0.2.0-beta.1';
  await fs.writeFile(path.join(root,'package.json'),JSON.stringify({version}));
  await fs.writeFile(path.join(root,'package-lock.json'),JSON.stringify({version,packages:{'':{version}}}));
  assert.equal(checkRelease('v'+version,root),version);
  for(const tag of ['v0.2.0','0.2.0-beta.1','v0.2.0-beta.01','v00.2.0','v0.2.0-beta.'])assert.throws(()=>checkRelease(tag,root));
  await fs.writeFile(path.join(root,'package-lock.json'),JSON.stringify({version:'0.1.0',packages:{'':{version}}}));
  assert.throws(()=>checkRelease('v'+version,root));
});
