const {spawn}=require('node:child_process');
function bridge(request,timeout=25000,{signal}={}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(Error('请求已取消'));
    const child=spawn(require('./runtime-paths.cjs').resource('metadata-bridge','metadata-bridge.exe'),[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let output='',settled=false;
    const timer=setTimeout(()=>{child.kill();finish(Error('供应商请求超时'))},timeout);
    const abort=()=>{child.kill();finish(Error('请求已取消'))};
    function finish(error,value){if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value)}
    signal?.addEventListener('abort',abort,{once:true});
    child.stdout.setEncoding('utf8');child.stderr.resume();
    child.on('error',()=>finish(Error('元信息适配程序不可用，请运行 npm run build:metadata')));
    child.stdout.on('data',chunk=>{output+=chunk;if(output.length>4e6){child.kill();finish(Error('供应商响应过大'))}});
    child.stdin.on('error',()=>{});
    child.on('close',code=>{if(settled)return;try{const value=JSON.parse(output);if(value?.error)throw Error(value.error);if(code)throw Error('供应商程序退出：'+code);finish(null,value)}catch(error){finish(Error(error.message||'供应商返回无效响应'))}});
    child.stdin.end(JSON.stringify(request));
  });
}
module.exports={bridge};
