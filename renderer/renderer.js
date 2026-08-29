const $ = id => document.getElementById(id);
const log = $("log");
let currentConfig = null;

function addLog(line, isErr=false){
  if(!line) return;
  log.textContent += `\n${isErr ? "[ERRO] " : ""}${line}`;
  log.scrollTop = log.scrollHeight;
}

function statusClass(el, value){
  const v = String(value || "").toUpperCase();
  el.style.color = (v.includes("CONECTADO") || v === "OK" || v === "RODANDO" || v === "ATIVO") ? "#50ef7e" :
                   (v.includes("ERRO") || v.includes("DESCONECTADO")) ? "#ff6670" : "#ffd966";
}

function showStatus(s){
  const motor = s.status || "-";
  const whats = s.whatsapp || "-";
  const sheet = s.planilha || "-";
  $("statusMotor").textContent = motor;
  $("statusWhats").textContent = whats;
  $("statusSheet").textContent = sheet;
  $("summaryMotor").textContent = motor;
  $("count").textContent = s.processadas ?? 0;
  $("videoCount").textContent = s.videos ?? 0;
  $("lastUpdate").textContent = s.ultimaAtualizacao || "--";
  $("bottomStatus").textContent = motor === "RODANDO" ? "Sistema iniciado e monitorando..." : motor === "PARADO" ? "Sistema pronto para iniciar." : `Sistema: ${motor}`;

  statusClass($("statusMotor"), motor);
  statusClass($("statusWhats"), whats);
  statusClass($("statusSheet"), sheet);

  const n = s.ultimaNoticia || {};
  $("lastTitle").textContent = n.titulo || "Nenhuma notícia processada ainda";
  $("lastVehicle").textContent = n.veiculo || "--";
  $("lastDate").textContent = n.data || "--";
  $("lastSubject").textContent = n.assunto || "--";
  $("lastAnalysis").textContent = n.analise || "--";
  $("lastAuthor").textContent = n.autor || "--";
}

function renderGroups(c){
  const list = $("groupList");
  list.innerHTML = "";
  const groups = c.grupos || [];
  groups.forEach((id, idx) => {
    const item = document.createElement("div");
    item.className = "group-item";
    item.innerHTML = `<div class="group-badge">♟</div><div><strong>Grupo ${idx + 1}</strong><small>${id}</small></div><span class="pill">ATIVO</span>`;
    list.appendChild(item);
  });
  $("totalGroups").textContent = `Total: ${groups.length} grupo${groups.length === 1 ? "" : "s"}`;
}

async function loadConfig(){
  currentConfig = await window.api.getConfig();
  $("appsUrl").value = currentConfig.appsScriptUrl || "";
  $("aba").value = currentConfig.aba || "";
  $("chrome").value = currentConfig.chromePath || "";
  $("grupos").value = (currentConfig.grupos || []).join("\n");
  $("diag").checked = !!currentConfig.diagnosticoGrupos;
  renderGroups(currentConfig);
}

function switchView(viewId){
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active-view"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const view = document.getElementById(viewId);
  if(view) view.classList.add("active-view");
  const btn = document.querySelector(`.nav-btn[data-view="${viewId}"]`);
  if(btn) btn.classList.add("active");
}

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

$("start").onclick = async () => {
  const r = await window.api.start();
  if(r.message) addLog(r.message);
};
$("stop").onclick = async () => {
  const r = await window.api.stop();
  if(r.message) addLog(r.message);
};
$("openLog").onclick = () => switchView("logview");
$("openCfg").onclick = () => window.api.openConfigFolder();
$("saveCfg").onclick = async () => {
  const cfg = {
    appsScriptUrl: $("appsUrl").value.trim(),
    aba: $("aba").value.trim(),
    chromePath: $("chrome").value.trim(),
    diagnosticoGrupos: $("diag").checked,
    grupos: $("grupos").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean)
  };
  const r = await window.api.saveConfig(cfg);
  addLog(r.ok ? "Configurações salvas." : "Falha ao salvar configurações.", !r.ok);
  if(r.ok){ currentConfig = cfg; renderGroups(cfg); }
};
$("clearLog").onclick = () => { log.textContent = ""; };

window.api.onStatus(showStatus);
window.api.onLog(({line,isErr}) => addLog(line,isErr));

(async () => {
  showStatus(await window.api.getStatus());
  await loadConfig();
})();
