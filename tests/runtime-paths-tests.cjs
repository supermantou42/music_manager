const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {createPaths}=require('../src/runtime-paths.cjs');

test('installed runtime separates writable state from bundled binaries',()=>{
  const root=path.resolve('application/app.asar'),resourcesPath=path.resolve('application'),userData=path.resolve('user-profile/MusicManager');
  const paths=createPaths({root,resourcesPath,userData,packaged:true});
  assert.equal(paths.data('library.json'),path.join(userData,'library.json'));
  assert.equal(paths.resource('metadata-bridge','metadata-bridge.exe'),path.join(resourcesPath,'metadata-bridge','metadata-bridge.exe'));
  assert.equal(paths.tool('mpv','mpv.exe'),path.join(resourcesPath,'tools','mpv','mpv.exe'));
  assert.equal(paths.tool('ffmpeg','bin'),path.join(resourcesPath,'tools','ffmpeg','bin'));
  assert.equal(paths.tool('llama-cuda','llama-server.exe'),path.join(userData,'tools','llama-cuda','llama-server.exe'));
});

test('development keeps existing library and tool locations',()=>{
  const root=path.resolve('workspace'),paths=createPaths({root});
  assert.equal(paths.data('library.json'),path.join(root,'data','library.json'));
  assert.equal(paths.tool('mpv','mpv.exe'),path.join(root,'tools','mpv','mpv.exe'));
});
