const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let win = null;
let motor = null;
let stats = { status:"PARADO", whatsapp:"DESCONHECIDO", planilha:"AGUARDANDO", processadas:0, ultimaLinha:"", ultimaMensagem:"" };

function baseDir(){ return process.env.PORTABLE_EXECUTABLE_DIR || (app.isPackaged ? path.dirname(process.execPath) : __dirname); }
function configPath(){ return path.join(baseDir(), "config.json"); }
function enginePath(){ return app.isPackaged ? path.join(app.getAppPath(),"engine","index.js") : path.join(__dirname,"engine","index.js"); }
function ensureConfig(){
  const target=configPath();
  if(!fs.existsSync(target)){
    const source=app.isPackaged ? path.join(process.resourcesPath,"config.default.json") : path.join(__dirname,"config.json");
    fs.copyFileSync(source,target);
  }
  return target;
}
function send(channel,data){ if(win && !win.isDestroyed()) win.webContents.send(channel,data); }
function parseLine(line,isErr=false){
  if(!line) return;
  stats.ultimaMensagem=line;
  if(line.includes("SISTEMA ATIVO")){ stats.status="ATIVO"; stats.whatsapp="CONECTADO"; }
  if(line.includes("Leia o QR Code")){ stats.status="AGUARDANDO QR"; stats.whatsapp="AGUARDANDO AUTENTICAÇÃO"; }
  if(line.includes("PLANILHA ATUALIZADA") || line.includes("VÍDEO REGISTRADO NA PLANILHA")){ stats.planilha="OK"; stats.processadas+=1; }
  if(line.startsWith("Linha:")) stats.ultimaLinha=line.replace("Linha:","").trim();
  if(line.includes("ERRO AO ENVIAR PARA PLANILHA") || line.includes("ERRO AO REGISTRAR VÍDEO")) stats.planilha="ERRO";
  if(line.includes("Falha na autenticação")) stats.whatsapp="ERRO DE AUTENTICAÇÃO";
  if(line.includes("WhatsApp desconectado")) stats.whatsapp="DESCONECTADO";
  if(isErr && stats.status==="PARADO") stats.status="ERRO";
  send("log",{line,isErr}); send("status",stats);
}
function iniciarMotor(){
  if(motor) return {ok:false,message:"Motor já está em execução."};
  ensureConfig();
  stats.status="INICIANDO"; stats.whatsapp="CONECTANDO"; stats.planilha="AGUARDANDO"; send("status",stats);
  const env={...process.env,CONFIG_PATH:configPath()};
  if(app.isPackaged) env.ELECTRON_RUN_AS_NODE="1";
  motor=spawn(process.execPath,[enginePath()],{cwd:baseDir(),env,windowsHide:true});
  motor.stdout.setEncoding("utf8"); motor.stderr.setEncoding("utf8");
  motor.stdout.on("data",d=>String(d).split(/\r?\n/).forEach(l=>parseLine(l,false)));
  motor.stderr.on("data",d=>String(d).split(/\r?\n/).forEach(l=>parseLine(l,true)));
  motor.on("exit",code=>{ parseLine(`Motor finalizado. Código: ${code}`,code!==0); motor=null; stats.status="PARADO"; if(stats.whatsapp!=="ERRO DE AUTENTICAÇÃO") stats.whatsapp="DESCONECTADO"; send("status",stats); });
  motor.on("error",err=>{ parseLine(`Erro ao iniciar motor: ${err.message}`,true); motor=null; stats.status="ERRO"; send("status",stats); });
  return {ok:true};
}
function pararMotor(){ if(!motor) return {ok:false,message:"Motor já está parado."}; try{motor.kill();}catch(_){} motor=null; stats.status="PARADO"; stats.whatsapp="DESCONECTADO"; send("status",stats); return {ok:true}; }
function createWindow(){
  win=new BrowserWindow({width:1100,height:760,minWidth:900,minHeight:650,title:"Automação Planilhas",webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false}});
  win.loadFile(path.join(__dirname,"renderer","index.html")); win.setMenuBarVisibility(false);
}
app.whenReady().then(()=>{
  ensureConfig(); createWindow();
  ipcMain.handle("motor:start",()=>iniciarMotor());
  ipcMain.handle("motor:stop",()=>pararMotor());
  ipcMain.handle("status:get",()=>stats);
  ipcMain.handle("config:get",()=>JSON.parse(fs.readFileSync(ensureConfig(),"utf8")));
  ipcMain.handle("config:save",(_,cfg)=>{fs.writeFileSync(ensureConfig(),JSON.stringify(cfg,null,2),"utf8"); return {ok:true,path:configPath()};});
  ipcMain.handle("config:open-folder",()=>{shell.showItemInFolder(configPath()); return {ok:true};});
});
app.on("before-quit",()=>{try{if(motor) motor.kill();}catch(_){}});
app.on("window-all-closed",()=>{if(process.platform!=="darwin") app.quit();});
