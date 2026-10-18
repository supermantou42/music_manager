const {parseLRC}=require('./ui/lyrics.js');
const scripts=Object.entries({latin:/\p{Script=Latin}/u,han:/\p{Script=Han}/u,kana:/[\p{Script=Hiragana}\p{Script=Katakana}]/u,hangul:/\p{Script=Hangul}/u,cyrillic:/\p{Script=Cyrillic}/u,arabic:/\p{Script=Arabic}/u});
function script(text){const counts={latin:0,han:0,kana:0,hangul:0,cyrillic:0,arabic:0};for(const char of text){for(const [name,pattern]of scripts)if(pattern.test(char)){counts[name]++;break}}const total=Object.values(counts).reduce((a,b)=>a+b,0);if(counts.kana&&(counts.kana+counts.han)/total>=.85)return 'japanese';const best=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];return total&&counts[best]/total>=.85?best:null}
// Only offer alternate scoring text when bilingual structure provides evidence.
// Preserve actual lyrics, timestamps and playback text outside this calculation.
function bilingualVariants(lyrics,transcript,normalize,start=0){
 const target=script(transcript);if(!target)return [];
 const timed=parseLRC(lyrics).filter(l=>l.time>=start&&normalize(l.text).length),lines=timed.length?timed:String(lyrics||'').split(/\r?\n/).map(text=>({text})).filter(l=>normalize(l.text).length);
 const variants=[];
 const inline=(text)=>{let parts=text.split(/\s*[\/／|｜]\s*/);if(parts.length!==2){const match=text.match(/^(.+?)\s*[（(]([^()（）]+)[）)]\s*$/);if(match)parts=[match[1],match[2]]}if(parts.length!==2||parts.some(p=>normalize(p).length<2))return null;const types=parts.map(script);return types[0]&&types[1]&&types[0]!==types[1]&&types.includes(target)?parts[types.indexOf(target)]:null};
 const groups=new Map();for(const line of lines){const key=line.time===undefined?'line:'+groups.size:Math.round(line.time*100);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(line.text)}
 let removed=0,pairs=0,inlinePairs=0;const kept=[];
 for(const group of groups.values()){const types=group.map(script),matching=group.filter((_,i)=>types[i]===target);if(group.length===2&&matching.length===1&&types.every(Boolean)&&types[0]!==types[1]){kept.push(matching[0]);removed++;pairs++}else for(const text of group){const chosen=inline(text);kept.push(chosen||text);if(chosen){removed++;inlinePairs++}}}
 if(pairs||inlinePairs)variants.push({lyrics:kept.join('\n'),mode:pairs?'shared-timestamps':'inline-translation',removedTranslationLines:removed,languageScript:target});
 // Without timestamps, require a sustained alternating structure. Mixed timed
 // verses are never treated as translations merely because their scripts differ.
 if(!timed.length&&lines.length>=4){let paired=0;const filtered=[];for(let i=0;i<lines.length;i++){const a=script(lines[i].text),b=script(lines[i+1]?.text||'');if(a&&b&&a!==b&&(a===target||b===target)){filtered.push(a===target?lines[i].text:lines[i+1].text);paired++;i++}else filtered.push(lines[i].text)}if(paired>=2&&paired*2/lines.length>=.8)variants.push({lyrics:filtered.join('\n'),mode:'alternating-untimed',removedTranslationLines:paired,languageScript:target})}
 return variants;
}
module.exports={bilingualVariants};
