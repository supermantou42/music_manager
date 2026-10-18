const fs=require('node:fs'),path=require('node:path');
function checkRelease(tag,root=path.resolve(__dirname,'..')){
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
  if(!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?$/.test(tag||''))throw Error('Expected a release tag such as v0.1.1 or v0.2.0-beta.1');
  if(tag!==`v${pkg.version}`||pkg.version!==lock.version||pkg.version!==lock.packages[''].version)throw Error('Tag, package.json and package-lock.json versions must match');
  return pkg.version;
}
module.exports={checkRelease};
if(require.main===module){const version=checkRelease(process.argv[2]||process.env.GITHUB_REF_NAME||`v${require('../package.json').version}`);console.log('Release version: '+version)}
