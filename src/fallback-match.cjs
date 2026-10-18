const {normalize}=require('./core.cjs');
function matchesOriginal(track,candidate){
  const lyrics=normalize((track.originalMetadata||track).lyrics),duration=Number(track.duration),other=Number(candidate.duration);
  return lyrics.length>=8&&normalize(candidate.lyrics)===lyrics&&duration>0&&other>0&&Number.isFinite(duration)&&Number.isFinite(other)&&Math.abs(duration-other)<1;
}
function fallbackCandidate(track,candidates){
  const unreliable=track.asrIssues?.length||['核验失败','需要复核','无法判断'].includes(track.status)||['error','partial'].includes(track.asrStatus)||(track.score!=null&&track.score<.7);
  if(!unreliable&&candidates.some(c=>c.assessment?.suitable&&!c.assessment?.fallback))return null;
  return [...candidates].filter(c=>matchesOriginal(track,c)).sort((a,b)=>(b.score||0)-(a.score||0)||Math.abs(track.duration-a.duration)-Math.abs(track.duration-b.duration))[0]||null;
}
module.exports={matchesOriginal,fallbackCandidate};
