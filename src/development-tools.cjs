function registerDevelopmentTools({app,ipcMain,Menu,win,trusted}){
 const development=()=>{if(app.isPackaged)throw Error('正式版本不提供调试操作')};
 ipcMain.handle('dev:available',event=>{trusted(event);return !app.isPackaged});
 ipcMain.handle('dev:menu',event=>{trusted(event);development();return new Promise(resolve=>{const menu=Menu.buildFromTemplate([
  {label:'重新加载界面',click:()=>resolve('reload')},
  {label:'打开 / 关闭开发者工具',click:()=>resolve('devtools')},
  {type:'separator'},
  {label:'重启客户端',click:()=>resolve('restart')}
 ]);menu.popup({window:win,callback:()=>resolve(null)})})});
 ipcMain.handle('dev:action',(event,action)=>{trusted(event);development();if(action==='reload')win.webContents.reload();else if(action==='devtools')win.webContents.toggleDevTools();else if(action==='restart'){app.relaunch();app.quit()}else throw Error('未知调试操作');return true});
}
module.exports={registerDevelopmentTools};
