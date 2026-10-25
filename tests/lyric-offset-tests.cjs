const {test}=require('node:test'),assert=require('node:assert/strict');
const {shiftLyrics}=require('../src/lyric-offset.cjs'),{setCandidateOffset,retryCandidateLyrics}=require('../src/metadata.cjs');
test('lyric shifts include existing LRC offset, preserve text and clamp negative times',()=>{
 assert.equal(shiftLyrics('[offset:1000]\n[00:10.00]Hello\n[00:01.00]World',2),'\n[00:11.00]Hello\n[00:02.00]World');assert.equal(shiftLyrics('[00:02.50]words',-10),'[00:00.00]words');assert.throws(()=>shiftLyrics('text',Infinity));assert.throws(()=>shiftLyrics('text',601));
});
test('candidate offset uses its original timeline, persists in export and survives lyric retry',async()=>{
 const c={id:'c',source:'qq',title:'Song',artist:'Artist',duration:180,lyrics:'[00:10.00]This is a full lyric line',score:.9},t={id:'t',title:'Song',artist:'Artist',duration:180,path:'song.mp3',metadataMatch:{id:'c',source:'qq'},metadataResult:{candidates:[c]}};
 setCandidateOffset(t,'qq','c',5);assert.match(t.lyrics,/00:15.00/);setCandidateOffset(t,'qq','c',2);assert.match(t.metadataResult.candidates[0].lyrics,/00:12.00/);assert.match(require('../src/export-metadata.cjs').resolveExport(t).track.lyrics,/00:12.00/);
 await retryCandidateLyrics(t,'qq','c',{lyrics:async()=>({lyrics:'[00:20.00]This is a full lyric line'})});assert.match(t.metadataResult.candidates[0].lyrics,/00:22.00/);setCandidateOffset(t,'qq','c',0);assert.match(t.lyrics,/00:20.00/);
});

test('original lyric offsets stay independent of accepted candidate lyrics and export correctly',()=>{
 const t={id:'t',duration:180,title:'Song',artist:'Artist',lyrics:'[00:20.00]accepted candidate lyrics',metadataMatch:{source:'qq',id:'c'},originalMetadata:{lyrics:'[00:10.00]original lyric text'},candidateExportMode:'original'};
 setCandidateOffset(t,'original','t',3);assert.match(t.originalMetadata.lyrics,/00:13.00/);assert.match(t.lyrics,/00:20.00/);assert.match(require('../src/export-metadata.cjs').resolveExport(t).track.lyrics,/00:13.00/);setCandidateOffset(t,'original','t',0);assert.match(t.originalMetadata.lyrics,/00:10.00/);
});
