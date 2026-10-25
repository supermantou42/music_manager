(()=>{
  const panel=element('section',undefined,'detail-popup online-music-panel');
  panel.id='onlineMusicPanel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','onlineMusicHeading');
  panel.innerHTML=`<div class="popup-head"><div><h2 id="onlineMusicHeading">在线搜歌</h2><p class="hint">搜索各平台歌曲，默认下载到临时目录，可加入当前处理列表统一导出；搜索结果可直接在线试听。</p></div><button id="onlineClose" aria-label="关闭在线搜歌">✕</button></div>
    <form id="onlineSearchForm" class="online-search-form"><input id="onlineQuery" maxlength="200" placeholder="输入歌名、歌手或关键词" aria-label="在线歌曲搜索关键词"><button id="onlineSearch" class="primary" type="submit">搜索歌曲</button></form>
    <div id="onlineSources" class="online-sources" role="group" aria-label="音乐源"></div>
    <div class="online-folder"><label for="onlineOutput">下载目录</label><input id="onlineOutput" placeholder="默认使用应用临时目录" aria-label="下载目录"><button id="onlineChooseFolder">选择目录</button></div>
    <div class="online-toolbar"><div role="tablist" aria-label="在线音乐内容"><button id="onlineResultsTab" role="tab" aria-selected="true">搜索结果</button><button id="onlineDownloadsTab" role="tab" aria-selected="false">下载记录</button></div><span id="onlineCount"></span><button id="onlineDownloadSelected" class="primary" disabled>下载所选</button></div>
    <p id="onlineMessage" class="hint" role="status" aria-live="polite">选择音乐源后搜索。部分歌曲需要平台账号权益，试听片段会单独标记。</p>
    <div id="onlineSearchWait" class="search-wait" hidden><span class="search-wait-spinner" aria-hidden="true"></span><strong>正在搜索各音乐源…</strong><progress aria-label="搜索中"></progress></div>
    <div id="onlineResults" class="online-scroll" role="tabpanel"><div class="online-empty">输入关键词，发现想收藏的音乐。</div></div>
    <div id="onlineDownloads" class="online-scroll" role="tabpanel" hidden></div>`;
  const backdrop=element('div',undefined,'online-backdrop');backdrop.hidden=true;
  document.body.append(backdrop,panel);dialogIds.unshift(panel.id);modalObserver.observe(panel,{attributes:true,attributeFilter:['hidden']});
  const openButton=element('button','⌕ 在线搜歌','nav-item');openButton.id='openOnlineMusic';
  document.querySelector('.app-sidebar .sidebar-divider').before(openButton);
  const node=id=>panel.querySelector('#'+id),activeStates=new Set(['queued','resolving','downloading','checking']);
  const states={queued:'排队中',resolving:'获取音频地址',downloading:'下载中',checking:'检查音频',completed:'已下载',failed:'下载失败',cancelled:'已取消'};
  let lastJobsSignature='',sources=[],songs=[],jobs=[],selectedKeys=new Set(),searching=false,submitting=false,polling=false,timer=null,initialized=false,tab='results',auditionRequest=0;
  function prefs(){return initialized?{sources:[...node('onlineSources').querySelectorAll('input:checked')].map(n=>n.value),output:node('onlineOutput').value,query:node('onlineQuery').value,tab}:window.onlineMusicPreferences||null}
  window.onlineMusic={preferences:prefs};
  const sourceName=id=>sources.find(s=>s.id===id)?.name||id;
  const duration=seconds=>`${Math.floor((seconds||0)/60)}:${String(Math.round(seconds||0)%60).padStart(2,'0')}`;
  const bytes=n=>(n/1024/1024).toFixed(1)+' MB';
  function notify(text){node('onlineMessage').textContent=text}
  function refreshLocks(){node('onlineSearch').disabled=searching;node('onlineQuery').disabled=searching;for(const input of node('onlineSources').querySelectorAll('input'))input.disabled=searching;node('onlineDownloadSelected').disabled=submitting||searching||!selectedKeys.size;node('onlineDownloadSelected').textContent=selectedKeys.size?`下载所选（${selectedKeys.size}）`:'下载所选';node('onlineSearchWait').hidden=!searching;node('onlineCount').textContent=tab==='results'?`${songs.length} 个结果 · 已选 ${selectedKeys.size}`:`${jobs.filter(j=>activeStates.has(j.status)).length} 个进行中 · ${jobs.length} 条记录`}
  function save(){scheduleWorkspaceSave()}
  function selectTab(value){tab=value;node('onlineResults').hidden=value!=='results';node('onlineDownloads').hidden=value!=='downloads';node('onlineResultsTab').setAttribute('aria-selected',String(value==='results'));node('onlineDownloadsTab').setAttribute('aria-selected',String(value==='downloads'));node('onlineDownloadSelected').hidden=value!=='results';refreshLocks();save()}
  function renderResults(){
    const container=node('onlineResults');container.replaceChildren();
    if(!songs.length){container.append(element('div',searching?'正在等待平台返回结果…':'没有搜索结果，请调整关键词或音乐源。','online-empty'));refreshLocks();return}
    const table=element('table',undefined,'online-result-table'),head=element('thead'),header=element('tr');
    const allCell=element('th'),all=element('input');all.type='checkbox';all.setAttribute('aria-label','选择全部搜索结果');all.checked=songs.every(s=>selectedKeys.has(s.key));all.indeterminate=!!selectedKeys.size&&!all.checked;all.onchange=()=>{selectedKeys=all.checked?new Set(songs.map(s=>s.key)):new Set();renderResults()};allCell.append(all);header.append(allCell,...['歌曲 / 歌手 / 专辑','来源','时长','平台音质','操作'].map(text=>element('th',text)));head.append(header);table.append(head);const body=element('tbody');
    for(const song of songs){
      const row=element('tr'),checkCell=element('td'),check=element('input');check.type='checkbox';check.checked=selectedKeys.has(song.key);check.setAttribute('aria-label','选择 '+song.title);check.onchange=()=>{check.checked?selectedKeys.add(song.key):selectedKeys.delete(song.key);all.checked=songs.every(s=>selectedKeys.has(s.key));all.indeterminate=!!selectedKeys.size&&!all.checked;refreshLocks()};checkCell.append(check);
      const identity=element('td'),metadata=element('div',undefined,'online-song'),text=element('div');text.append(element('strong',song.title),element('small',[song.artist,song.album].filter(Boolean).join(' · ')));metadata.append(image(song.cover),text);identity.append(metadata);
      const origin=element('td',sourceName(song.source));if(song.preview)origin.append(badge('仅试听','warn'));else if(song.isVIP)origin.append(badge('需账号权益','warn'));
      const action=element('td'),download=element('button',song.preview?'下载试听':'下载');download.dataset.downloadKey=song.key;download.onclick=()=>submit([song]);const listen=element('button','▶ 试听');listen.dataset.playTrack='online:'+song.key;listen.dataset.playIconOnly='true';listen.setAttribute('aria-label','在线试听 '+song.title);listen.onclick=async()=>{const audition=++auditionRequest;listen.disabled=true;listen.dataset.loading="true";try{if(playing?.track.id==='online:'+song.key)await togglePlaybackPause('mpvPause');else{listen.textContent='加载中…';const track=await api('music/preview',{key:song.key});if(audition!==auditionRequest)return;await playTrack(track,null,null,false);notify(track.preview?'正在播放平台试听片段。':'正在在线试听：'+song.title)}}catch(error){notify('试听失败：'+error.message)}finally{delete listen.dataset.loading;listen.disabled=false;listen.textContent='▶';syncPlaybackButtons()}};action.append(listen,download);
      row.append(checkCell,identity,origin,element('td',duration(song.duration)),element('td',song.bitrate?song.bitrate+' kbps':'—'),action);body.append(row);
    }
    table.append(body);container.append(table);syncPlaybackButtons();refreshResultActions();refreshLocks();
  }
  function refreshResultActions(){for(const button of panel.querySelectorAll('[data-download-key]')){const latest=jobs.find(j=>j.key===button.dataset.downloadKey);button.disabled=submitting||!!latest&&activeStates.has(latest.status);button.textContent=latest&&activeStates.has(latest.status)?states[latest.status]:latest?.status==='completed'?'再次下载':songs.find(s=>s.key===button.dataset.downloadKey)?.preview?'下载试听':'下载'}}
  function renderDownloads(){
    const container=node('onlineDownloads'),scroll=container.scrollTop;container.replaceChildren();
    if(!jobs.length)container.append(element('div','暂无下载记录。','online-empty'));
    for(const job of jobs){
      const row=element('article',undefined,'online-download-row'),info=element('div',undefined,'online-download-info');info.append(element('strong',job.title+' · '+job.artist),element('small',sourceName(job.source)+' · '+(states[job.status]||job.status)+(job.preview?' · 试听片段':'')));
      const progress=element('progress');progress.max=job.totalBytes||1;if(job.totalBytes)progress.value=Math.min(job.receivedBytes,job.totalBytes);else if(!activeStates.has(job.status))progress.value=job.status==='completed'?1:0;progress.setAttribute('aria-label',job.title+'下载进度');info.append(progress,element('small',job.totalBytes?bytes(job.receivedBytes)+' / '+bytes(job.totalBytes):bytes(job.receivedBytes||0)));
      if(job.audioInfo)info.append(element('small',job.audioInfo.ext.toUpperCase()+' · '+duration(job.audioInfo.duration)+' · '+(job.audioInfo.bitrate||'—')+' kbps'));
      if(job.path){const location=element('small',job.path,'online-download-path');location.title=job.path;info.append(location)}if(job.error)info.append(element('small',job.error,'online-error'));
      const controls=element('div',undefined,'online-download-actions');
      if(activeStates.has(job.status)){const cancel=element('button','取消');cancel.onclick=async()=>{cancel.disabled=true;try{await api('music/cancel',{id:job.id});await poll()}catch(e){notify(e.message);cancel.disabled=false}};controls.append(cancel)}
      if(['failed','cancelled'].includes(job.status)){const retry=element('button','重试');retry.onclick=()=>submit([{key:job.key}],job.output);controls.append(retry)}
      if(job.status==='completed'&&job.track){const play=element('button','▶');play.dataset.playTrack=job.track.id;play.dataset.playIconOnly='true';play.setAttribute('aria-label','试听 '+job.title);play.onclick=async()=>{try{if(playing?.track.id===job.track.id)await togglePlaybackPause('mpvPause');else await playTrack(job.track,null,null,false);renderDownloads()}catch(e){notify(e.message)}};controls.append(play);const added=tracks.some(t=>t.path===job.path),add=element('button',added?'已加入处理列表':'加入处理列表');add.disabled=added;add.onclick=async()=>{add.disabled=true;try{const result=await api('music/import',{id:job.id});await syncState();checked.add(result.track.id);render();notify(result.alreadyAdded?'歌曲已在当前处理列表中。':'已加入当前处理列表并勾选，可核验后统一导出。');renderDownloads()}catch(error){notify(error.message);add.disabled=false}};controls.append(add)}
      row.append(image(job.cover),info,controls);container.append(row);
    }
    container.scrollTop=scroll;syncPlaybackButtons();refreshResultActions();refreshLocks();
  }
  async function poll(){if(polling)return;polling=true;try{const response=await fetch('/api/music/downloads');if(!response.ok)throw Error('读取下载记录失败');jobs=await response.json();const signature=JSON.stringify(jobs);if(signature!==lastJobsSignature){lastJobsSignature=signature;renderDownloads()}}catch(error){if(!panel.hidden)notify(error.message)}finally{polling=false;clearTimeout(timer);if(!panel.hidden)timer=setTimeout(poll,1000)}}
  async function submit(items,output=node('onlineOutput').value){
    if(submitting)return;submitting=true;refreshLocks();refreshResultActions();
    let count=0;try{for(const item of items){await api('music/download',{key:item.key,output});count++}notify(`已加入 ${count} 首下载；两路并行，已有文件不会覆盖。`);selectTab('downloads');await poll()}catch(error){notify((count?`已加入 ${count} 首；`:'')+error.message)}finally{submitting=false;refreshLocks();refreshResultActions()}
  }
  async function initialize(){if(initialized)return;const response=await fetch('/api/music/sources');if(!response.ok)throw Error('读取音乐源失败');sources=await response.json();if(!Array.isArray(sources))throw Error('音乐源返回无效');const saved=window.onlineMusicPreferences||{};for(const source of sources){const label=element('label'),input=element('input');input.type='checkbox';input.value=source.id;input.checked=Array.isArray(saved.sources)?saved.sources.includes(source.id):!!source.default;input.onchange=save;label.append(input,document.createTextNode(source.name+(source.preview?' · 试听':'')));label.title=source.note||'';node('onlineSources').append(label)}node('onlineOutput').value=saved.output||'';node('onlineQuery').value=saved.query||'';initialized=true;selectTab(saved.tab==='downloads'?'downloads':'results')}
  openButton.onclick=async()=>{if(topDialog())return;panel.hidden=false;backdrop.hidden=false;scheduleLayout();window.dispatchEvent(new Event('music-dialog-change'));try{await initialize();await poll();node('onlineQuery').focus()}catch(error){notify(error.message)}};
  function close(){panel.hidden=true;backdrop.hidden=true;clearTimeout(timer);save();scheduleLayout();window.dispatchEvent(new Event('music-dialog-change'));openButton.focus()}
  backdrop.onclick=close;node('onlineClose').onclick=close;
  node('onlineResultsTab').onclick=()=>selectTab('results');node('onlineDownloadsTab').onclick=()=>selectTab('downloads');
  node('onlineDownloadSelected').onclick=()=>submit(songs.filter(s=>selectedKeys.has(s.key)));
  node('onlineOutput').onchange=save;node('onlineQuery').onchange=save;
  node('onlineChooseFolder').onclick=async()=>{if(!window.desktop?.folder){notify('浏览器模式请填写完整下载目录路径。');node('onlineOutput').focus();return}try{const folder=await window.desktop.folder();if(folder){node('onlineOutput').value=folder;save()}}catch(e){notify(e.message)}};
  node('onlineQuery').addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.isComposing||event.keyCode===229||event.repeat))event.preventDefault()});
  node('onlineSearchForm').onsubmit=async event=>{event.preventDefault();if(searching||event.isComposing)return;const query=node('onlineQuery').value.trim(),ids=[...node('onlineSources').querySelectorAll('input:checked')].map(n=>n.value);if(!query||!ids.length){notify('请输入关键词，并至少选择一个音乐源。');return}searching=true;refreshLocks();notify('正在搜索，可关闭窗口，下载任务会继续。');try{const result=await api('music/search',{query,sources:ids});songs=result.songs;selectedKeys.clear();renderResults();selectTab('results');notify(result.groups.map(g=>sourceName(g.source)+'：'+(g.error?g.error:g.songs.length+' 首')).join('；'))}catch(error){notify('搜索失败：'+error.message)}finally{searching=false;refreshLocks();save()}};
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close()}if(event.key==='Tab'){const controls=[...panel.querySelectorAll('button,input,[tabindex]')].filter(n=>!n.disabled&&!n.closest('[hidden]'));const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}});
})();
