import json,re,shutil
from pathlib import Path
from datetime import datetime
R=Path.cwd()
URL="https://script.google.com/macros/s/AKfycbz9zWPX0OgVa7obrmqm5WSu1fImaTiyWz0pR3wuc13xl-uCS5KYTF4rhbRitrv26PBh/exec"
FILES=["main.js","engine/index.js","preload.js","renderer/renderer.js","renderer/index.html","renderer/style.css","package.json","config.json"]
missing=[x for x in FILES if not (R/x).is_file()]
if missing: raise SystemExit("Execute na raiz do repositorio. Ausentes: "+", ".join(missing))
B=R/("backup-v1.1.3-"+datetime.now().strftime("%Y%m%d-%H%M%S")); B.mkdir()
for f in FILES:
 d=B/f; d.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(R/f,d)
def rd(f): return (R/f).read_text(encoding="utf-8")
def wr(f,s): (R/f).write_text(s,encoding="utf-8",newline="\n")
def req(s,a,b,label):
 n=s.count(a)
 if n!=1: raise RuntimeError(label+": esperado 1 trecho, encontrado "+str(n))
 return s.replace(a,b,1)

p="package.json"; d=json.loads(rd(p)); d["version"]="1.1.3"; wr(p,json.dumps(d,ensure_ascii=False,indent=2)+"\n")

p="main.js"; s=rd(p).replace('const axios = require("axios");\n',"").replace('  proxy: "DESCONHECIDO",\n',"")
old='function readConfig(){ return JSON.parse(fs.readFileSync(ensureConfig(), "utf8")); }\n'
new='function readConfig(){\n  const cfg=JSON.parse(fs.readFileSync(ensureConfig(),"utf8"));\n  if(!Array.isArray(cfg.grupos)) cfg.grupos=[];\n  const migrar=cfg.appsScriptUrl!=="'+URL+'" || Object.prototype.hasOwnProperty.call(cfg,"proxy");\n  cfg.appsScriptUrl="'+URL+'";\n  delete cfg.proxy;\n  if(migrar) fs.writeFileSync(ensureConfig(),JSON.stringify(cfg,null,2),"utf8");\n  return cfg;\n}\n'
s=req(s,old,new,"migração de config")
old='function proxyFromConfig(cfg){\n  const p = cfg?.proxy || {};\n  if(!p.ativo || !p.host || !Number(p.porta)) return undefined;\n  const proxy = { protocol:"http", host:String(p.host).trim(), port:Number(p.porta) };\n  if(String(p.usuario || "").trim()) proxy.auth = { username:String(p.usuario).trim(), password:String(p.senha || "") };\n  return proxy;\n}\n'
s=req(s,old,"","remoção de proxyFromConfig")
for pat in [r'  if\(line\.includes\("PROXY ATIVO"\)\).*?\n',r'  if\(line\.includes\("PROXY: DESATIVADO"\)\).*?\n',r'  if\(line\.includes\("PROXY COM AUTENTICAÇÃO CONFIGURADA"\)\).*?\n',r'  if\(line\.includes\("HTTP: 407"\).*?\n',r'  if\(line\.includes\("ERR_INVALID_AUTH_CREDENTIALS"\).*?\n']: s=re.sub(pat,"",s)
s=s.replace('stats.status="INICIANDO"; stats.whatsapp="CONECTANDO"; stats.planilha="AGUARDANDO"; stats.proxy=readConfig().proxy?.ativo ? "CONFIGURADO" : "DESATIVADO";','stats.status="INICIANDO"; stats.whatsapp="CONECTANDO"; stats.planilha="AGUARDANDO";')
s=re.sub(r'\nasync function testarProxy\(\)\{.*?\n\}\n\nfunction createWindow','\nfunction createWindow',s,flags=re.S)
s=s.replace('  ipcMain.handle("proxy:test",()=>testarProxy());\n',"")
wr(p,s)

p="engine/index.js"; s=rd(p)
s=re.sub(r'const PROXY = CONFIG\.proxy \|\| \{\};\nconst PROXY_ATIVO = Boolean\(PROXY\.ativo\);\nconst PROXY_HOST = String\(PROXY\.host \|\| ""\)\.trim\(\);\nconst PROXY_PORT = Number\(PROXY\.porta \|\| 0\);\nconst PROXY_USUARIO = String\(PROXY\.usuario \|\| ""\)\.trim\(\);\nconst PROXY_SENHA = String\(PROXY\.senha \|\| ""\);\n',"",s)
s=s.replace('const APPS_SCRIPT_URL = String(CONFIG.appsScriptUrl || "").trim();','const APPS_SCRIPT_URL = String(CONFIG.appsScriptUrl || "").trim() || "'+URL+'";')
s=re.sub(r'\nfunction obterProxyAxios\(\).*?\nfunction obterProxyArg\(\).*?\n','\n',s,flags=re.S)
s=re.sub(r'if \(PROXY_ATIVO && PROXY_HOST && PROXY_PORT\) \{.*?\n\} else console\.log\("PROXY: DESATIVADO"\);\n',"",s,flags=re.S)
s=s.replace('const chromeArgs = ["--no-sandbox","--disable-setuid-sandbox","--disable-gpu","--disable-dev-shm-usage"];\nconst proxyArg = obterProxyArg();\nif (proxyArg) chromeArgs.push(proxyArg);','const chromeArgs = ["--no-sandbox","--disable-setuid-sandbox","--disable-gpu","--disable-dev-shm-usage"];')
s=re.sub(r'if \(PROXY_USUARIO\) \{\n  clientOptions\.proxyAuthentication = \{ username:PROXY_USUARIO, password:PROXY_SENHA \};\n\}\n',"",s)
s=s.replace('  if (PROXY_USUARIO) console.log("Autenticação do proxy aplicada ao WhatsApp Web.");\n',"")
s=s.replace('  const cfg = { headers:{"Content-Type":"application/json"}, timeout:15000 };\n  const proxy = obterProxyAxios();\n  if (proxy) cfg.proxy = proxy;\n  const r = await axios.post(APPS_SCRIPT_URL, dados, cfg);','  const cfg = { headers:{"Content-Type":"application/json"}, timeout:20000, maxRedirects:5 };\n  const r = await axios.post(APPS_SCRIPT_URL, dados, cfg);')
wr(p,s)

p="preload.js"; wr(p,rd(p).replace('  testProxy: () => ipcRenderer.invoke("proxy:test"),\n',""))
p="renderer/renderer.js"; s=rd(p).replace(', proxy=s.proxy||"-"','').replace('; $("proxyStatus").textContent=proxy','').replace('; statusClass($("proxyStatus"),proxy)','')
s=s.replace('const proxy=currentConfig.proxy||{}; ', '')
s=re.sub(r'\s*\$\("proxyAtivo"\)\.checked=.*?;\n','\n',s)
s=re.sub(r'\n\$\("testProxy"\)\.onclick=.*?;\n','\n',s)
s=s.replace(',proxy:{ativo:$("proxyAtivo").checked,host:$("proxyHost").value.trim(),porta:Number($("proxyPorta").value)||0,usuario:$("proxyUsuario").value.trim(),senha:$("proxySenha").value}','')
s=s.replace('Configurações salvas. Proxy com autenticação disponível.','Configurações salvas. Conexão direta habilitada.')
wr(p,s)

p="renderer/index.html"; s=rd(p)
s=re.sub(r'<div class="metric-row"><span>Proxy</span><b id="proxyStatus">--</b></div>','',s)
s=re.sub(r'<div class="card-title config-subtitle">Proxy</div>.*?<label>IDs dos grupos','<label>IDs dos grupos',s,flags=re.S)
s=s.replace('Autenticação de proxy, teste de conectividade, status aprimorado e recuperação automática.','Conexão direta com WhatsApp, integração com Google Apps Script e recuperação automática.')
s=s.replace('v1.1.2','v1.1.3').replace('Versão 1.1.2','Versão 1.1.3'); wr(p,s)
p="renderer/style.css"; s=rd(p); s=re.sub(r'\.proxy-actions\{[^}]*\}\.proxy-actions \.control\{[^}]*\}\.proxy-actions \.muted\{[^}]*\}','',s); wr(p,s)

p="config.json"; c=json.loads(rd(p)); c["appsScriptUrl"]=URL; c.pop("proxy",None); c["grupos"]=c.get("grupos") if isinstance(c.get("grupos"),list) else []; wr(p,json.dumps(c,ensure_ascii=False,indent=2)+"\n")

checks={"main.js":["proxyFromConfig","proxy:test","testarProxy","stats.proxy"],"engine/index.js":["PROXY_ATIVO","obterProxyAxios","obterProxyArg","--proxy-server","proxyAuthentication"],"preload.js":["testProxy","proxy:test"],"renderer/renderer.js":["proxyStatus","proxyAtivo","testProxy"],"renderer/index.html":["proxyHost","proxyStatus","testProxy"],"renderer/style.css":["proxy-actions"]}
errors=[]
for f,terms in checks.items():
 for t in terms:
  if t.lower() in rd(f).lower(): errors.append(f+": ainda contém "+t)
c=json.loads(rd("config.json"))
if c.get("appsScriptUrl")!=URL or "proxy" in c: errors.append("config.json inválido")
if json.loads(rd("package.json")).get("version")!="1.1.3": errors.append("versão incorreta")
if errors: raise SystemExit("Falha na validação: "+"; ".join(errors)+"\nBackup: "+str(B))
print("Patch aplicado. Backup criado em",B)
print("Revise os arquivos alterados antes de enviar ao GitHub.")
