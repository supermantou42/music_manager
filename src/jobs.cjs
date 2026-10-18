const crypto=require('crypto');let job=null;
function running(){return job?.status==='running'}
function snapshot(){return job?structuredClone(job):null}
function cancel(){if(running())job.cancelRequested=true;return snapshot()}
function start(items,type,process,onChange=async()=>{},options={}){
 if(running())throw Error('已有批量任务正在运行');if(!items.length)throw Error('请先勾选歌曲');
 const concurrency=Math.max(1,Math.min(items.length,options.concurrency||1));
 job={id:crypto.randomUUID(),type,status:'running',total:items.length,requested:options.requested??items.length,skipped:options.skipped||0,completed:0,failed:0,current:null,currentProgress:null,active:[],concurrency,progress:0,cancelRequested:false,errors:[],startedAt:Date.now()};const current=job;
 setImmediate(async()=>{let cursor=0,persistence=Promise.resolve(),fatal=null;
  function update(){current.current=current.active[0]?{id:current.active[0].id,title:current.active[0].title}:null;current.currentProgress=current.active[0]?.progress||null;current.progress=100*(current.completed+current.active.reduce((sum,x)=>sum+Math.max(0,Math.min(1,x.progress?.fraction||0)),0))/current.total}
  async function worker(){while(cursor<items.length&&!current.cancelRequested&&!fatal){const item=items[cursor++],active={id:item.id,title:item.title,progress:null};current.active.push(active);update();try{await process(item,value=>{active.progress=value;update()})}catch(e){current.failed++;current.errors.push({id:item.id,title:item.title,error:e.message})}current.active.splice(current.active.indexOf(active),1);current.completed++;update();persistence=persistence.then(()=>onChange());try{await persistence}catch(e){fatal=e}}}
  try{await Promise.all(Array.from({length:concurrency},worker));current.status=fatal?'failed':current.cancelRequested?'cancelled':'completed';if(fatal)current.errors.push({error:fatal.message})}finally{current.current=null;current.currentProgress=null;current.active=[];current.finishedAt=Date.now();await onChange().catch(()=>{})}
 });return snapshot()
}
function completeSkipped(type,count){if(running())throw Error('已有批量任务正在运行');const now=Date.now();job={id:crypto.randomUUID(),type,status:'completed',total:0,requested:count,skipped:count,completed:0,failed:0,current:null,currentProgress:null,progress:100,cancelRequested:false,errors:[],startedAt:now,finishedAt:now};return snapshot()}
module.exports={start,running,snapshot,cancel,completeSkipped};
