const {compare}=require('./core.cjs');
function asrState(t){if(t.asrStatus)return t.asrStatus;if(t.status==='核验失败'||t.asrIssues?.length)return 'error';return t.transcript?.trim()||t.transcriptSegments?.length?'completed':'unrecognized'}
function lyricsQualified(t){return asrState(t)==='completed'&&!t.asrError&&!t.asrIssues?.length&&compare(t.lyrics,t.transcript,t.transcriptSegments).score>=.8}
function selectASR(items,type,force=false){const eligible=force?items:type==='analyze'?items.filter(t=>asrState(t)!=='completed'):['organize','search'].includes(type)?items.filter(t=>!lyricsQualified(t)):items;return {items:eligible,skipped:items.length-eligible.length}}
function recoverASR(t){if(['queued','recognizing'].includes(t.asrStatus)){t.asrStatus='error';t.asrError='上次识别被中断，可重新提交';t.asrProgress=null;delete t.asrQueuedPrevious}}
module.exports={lyricsQualified,asrState,selectASR,recoverASR};
