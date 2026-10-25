const {test}=require('node:test'),assert=require('node:assert/strict');
const {retryCandidateLyrics}=require('../src/metadata.cjs');
function fixture(){return {id:'t',title:'Song',artist:'Artist',album:'Album',duration:180,path:'song.mp3',metadataResult:{searchStatus:'unsuitable',candidates:[{id:'1',source:'qq',title:'Song',artist:'Artist',album:'Album',duration:180,lyrics:'',lyricStatus:'获取失败',song:{id:'1'}},{id:'2',source:'netease',title:'Song',artist:'Artist',duration:180,lyrics:'other existing lyrics',song:{id:'2'}}],errors:[{phase:'lyrics',source:'qq',id:'1',error:'old'},{phase:'lyrics',source:'netease',id:'3',error:'keep'}]}}}
test('retry fetches one candidate and refreshes eligibility without moving the gallery order',async()=>{
 const track=fixture(),other=JSON.stringify(track.metadataResult.candidates[1].lyrics),calls=[];
 const result=await retryCandidateLyrics(track,'qq','1',{lyrics:async(source,song)=>{calls.push([source,song.id]);return {lyrics:'[00:10.00]This is the correct song lyrics'}}});
 assert.deepEqual(calls,[['qq','1']]);assert.equal(result.lyricStatus,'已获取');assert.deepEqual(track.metadataResult.candidates.map(c=>c.id),['1','2']);assert.equal(JSON.stringify(track.metadataResult.candidates[1].lyrics),other);assert.equal(track.metadataResult.errors.length,1);assert.equal(track.metadataResult.errors[0].error,'keep');
});
test('failed and empty lyric retries remain retryable without duplicate errors',async()=>{
 const track=fixture(),providers={lyrics:async()=>{throw Error('network timeout')}};
 await retryCandidateLyrics(track,'qq','1',providers);await retryCandidateLyrics(track,'qq','1',providers);assert.equal(track.metadataResult.errors.filter(e=>e.id==='1').length,1);assert.equal(track.metadataResult.candidates[0].lyricStatus,'获取失败');
 const empty=await retryCandidateLyrics(track,'qq','1',{lyrics:async()=>({lyrics:''})});assert.equal(empty.lyricStatus,'没有歌词正文');assert.equal(track.metadataResult.errors.filter(e=>e.id==='1').length,0);
 await assert.rejects(retryCandidateLyrics(track,'qq','unknown',providers));
});

test('persisted candidates retry by provider ID without their stripped raw song object',async()=>{
 for(const source of ['qq','netease']){const track=fixture(),candidate=track.metadataResult.candidates[0];candidate.source=source;candidate.id=source==='qq'?'003testMID':'123456';delete candidate.song;let calls=0;
 const result=await retryCandidateLyrics(track,source,candidate.id,{lyrics:async(provider,song)=>{calls++;assert.equal(provider,source);assert.equal(song.id,candidate.id);assert.equal(song.source,source);assert.equal(song.name,'Song');return {lyrics:'restored valid lyrics'}}});assert.equal(calls,1);assert.equal(result.lyricStatus,'已获取');assert.equal(track.metadataResult.candidates[0].lyrics,'restored valid lyrics');}
});
