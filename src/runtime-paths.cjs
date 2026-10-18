const path=require('node:path');

function createPaths({root=path.resolve(__dirname,'..'),packaged=false,resourcesPath=root,userData=path.join(root,'data')}={}){
  const dataRoot=packaged?userData:path.join(root,'data');
  return {
    packaged,root,dataRoot,
    data:(...parts)=>path.join(dataRoot,...parts),
    resource:(...parts)=>path.join(packaged?resourcesPath:root,...parts),
    tool:(name,...parts)=>path.join(packaged&&name==='llama-cuda'?dataRoot:packaged?resourcesPath:root,'tools',name,...parts),
  };
}
let paths=createPaths();
function configure(options){
  paths=createPaths(options);
  if(paths.packaged){
    process.env.PATH=paths.tool('ffmpeg','bin')+path.delimiter+(process.env.PATH||'');
  }
  return paths;
}
module.exports={createPaths,configure,data:(...parts)=>paths.data(...parts),resource:(...parts)=>paths.resource(...parts),tool:(...parts)=>paths.tool(...parts),get packaged(){return paths.packaged}};
