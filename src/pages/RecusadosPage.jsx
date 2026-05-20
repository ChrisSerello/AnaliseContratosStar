import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie,
} from "recharts";
import { C } from "../constants/design.js";
import { fmt$, fmtN, clip } from "../utils/index.js";

// ── Paleta ────────────────────────────────────────────────────
const PC = ["#F87171","#FB923C","#FACC15","#818CF8","#22D3EE","#A78BFA","#34D399","#F472B6","#60A5FA","#4ADE80"];
const STATUS_MAP = {
  aberto:    { label:"Em Aberto",    bg:"#F3F4F6", tx:"#374151", dt:"#9CA3AF" },
  tratativa: { label:"Em Tratativa", bg:"#FEF9C3", tx:"#854D0E", dt:"#EAB308" },
  recuperado:{ label:"Recuperado",   bg:"#F0FDF4", tx:"#14532D", dt:"#22C55E" },
  descartado:{ label:"Descartado",   bg:"#FEF2F2", tx:"#991B1B", dt:"#EF4444" },
};

// ── LocalStorage helpers ──────────────────────────────────────
const LS_KEY = "contractiq_recusados_gestao";
function loadGestao() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveGestao(g) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(g)); } catch {}
}

// ── Tooltip customizado ───────────────────────────────────────
function ChTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:7,
      padding:"7px 10px", boxShadow:C.s2, fontSize:11 }}>
      {label && <div style={{ fontWeight:600, color:C.txt, marginBottom:2 }}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{ color: p.fill||p.stroke||C.pri, fontWeight:600 }}>{p.value}</div>
      ))}
    </div>
  );
}

// ── Modal de nota ─────────────────────────────────────────────
function NotaModal({ record, gestao, onSave, onClose }) {
  const cur = gestao[record.id] || { status:"aberto", nota:"" };
  const [status, setStatus] = useState(cur.status);
  const [nota,   setNota]   = useState(cur.nota);
  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{ position:"fixed",inset:0,background:"rgba(28,31,36,0.5)",display:"flex",
        alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)",padding:16 }}>
      <div style={{ background:C.surf,borderRadius:14,width:"100%",maxWidth:440,
        boxShadow:C.s3,overflow:"hidden" }}>
        <div style={{ padding:"13px 16px",borderBottom:`1px solid ${C.bdl}`,
          display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:13,fontWeight:700,color:C.txt }}>Gestão de Contrato</div>
            <div style={{ fontSize:10,color:C.txs,marginTop:1 }}>
              {clip(record.nome_cliente,20)} · {clip(record.motivo_recusa,28)}
            </div>
          </div>
          <button onClick={onClose} style={{ width:26,height:26,borderRadius:"50%",
            border:`1px solid ${C.bdr}`,background:C.bg,cursor:"pointer",fontSize:16,color:C.txs }}>×</button>
        </div>
        <div style={{ padding:"14px 16px" }}>
          <div style={{ fontSize:9,color:C.txm,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6 }}>
            Status do Contrato
          </div>
          <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" }}>
            {Object.entries(STATUS_MAP).map(([k,v]) => (
              <button key={k} onClick={() => setStatus(k)}
                style={{ padding:"6px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",
                  border:`1.5px solid ${status===k ? v.dt : C.bdr}`,
                  background:status===k ? v.bg : C.surf, color:status===k ? v.tx : C.txs,
                  transition:"all .12s" }}>
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize:9,color:C.txm,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6 }}>
            Observação / Tratativa
          </div>
          <textarea value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Descreva a tratativa, contato com o cliente, próximos passos…"
            rows={4}
            style={{ width:"100%",padding:"9px 11px",borderRadius:8,border:`1px solid ${C.bdr}`,
              background:C.bg,fontSize:11,color:C.txt,outline:"none",resize:"vertical",
              fontFamily:"inherit",lineHeight:1.55 }} />
          <div style={{ display:"flex",justifyContent:"flex-end",gap:8,marginTop:12 }}>
            <button onClick={onClose}
              style={{ padding:"7px 14px",borderRadius:7,border:`1px solid ${C.bdr}`,
                background:C.surf,fontSize:11,cursor:"pointer",color:C.txs }}>Cancelar</button>
            <button onClick={() => { onSave(record.id,{ status, nota, updated: new Date().toLocaleDateString("pt-BR") }); onClose(); }}
              style={{ padding:"7px 14px",borderRadius:7,border:"none",
                background:C.pri,fontSize:11,fontWeight:600,cursor:"pointer",color:"#fff" }}>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Painel de drill-down por motivo ───────────────────────────
function DrillDown({ motivo, recs, allRecs, gestao, onOpenNota }) {
  const tot = recs.length;
  const totV = recs.reduce((a,r) => a+(r.valor_liberado||0), 0);
  const recup = Object.values(gestao).filter(g => g.status==="recuperado").length;
  const trat  = Object.values(gestao).filter(g => g.status==="tratativa").length;

  // por promotora
  const prM = {};
  recs.forEach(r => { prM[r.nome_promotora] = (prM[r.nome_promotora]||0)+1; });
  const prCh = Object.entries(prM).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({n,v}));

  // por empregador
  const empM = {};
  recs.forEach(r => { empM[r.empregador] = (empM[r.empregador]||0)+1; });
  const empCh = Object.entries(empM).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([n,v])=>({n:clip(n,18),v}));

  // por ponto de venda
  const pdvM = {};
  recs.forEach(r => { pdvM[r.ponto_venda||"Não informado"] = (pdvM[r.ponto_venda||"Não informado"]||0)+1; });
  const pdvCh = Object.entries(pdvM).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({n,v}));

  // evolução mensal
  const evM = {};
  recs.forEach(r => {
    if (!r._dtD || isNaN(r._dtD)) return;
    const k = `${r._dtD.getFullYear()}/${String(r._dtD.getMonth()+1).padStart(2,"0")}`;
    evM[k] = (evM[k]||0)+1;
  });
  const evCh = Object.entries(evM).sort().slice(-9).map(([n,v])=>({n,v}));

  // % do total de recusados
  const pctTot = allRecs.length ? Math.round(tot/allRecs.length*100) : 0;

  return (
    <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
      {/* Título */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:9,color:C.txm,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4 }}>
          Motivo selecionado
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <span style={{ width:10,height:10,borderRadius:"50%",background:"#EF4444",flexShrink:0 }}/>
          <span style={{ fontSize:14,fontWeight:700,color:C.txt,letterSpacing:"-0.01em" }}>{motivo}</span>
        </div>
      </div>

      {/* KPIs do motivo */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
        {[
          ["Contratos",     fmtN(tot),          "#EF4444"],
          ["Valor em Risco",fmt$(totV),          "#9333EA"],
          ["% do Total",    pctTot+"%",          "#F97316"],
          ["Em Tratativa",  fmtN(trat),          "#EAB308"],
        ].map(([l,v,ac]) => (
          <div key={l} style={{ background:C.surf,borderRadius:9,padding:"11px 12px",
            boxShadow:C.s1,border:`1px solid ${C.bdr}` }}>
            <div style={{ fontSize:17,fontWeight:700,color:ac,letterSpacing:"-0.02em",marginBottom:2 }}>{v}</div>
            <div style={{ fontSize:9,color:C.txs }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Gráficos row 1 */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
        <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,border:`1px solid ${C.bdr}`,padding:"11px 13px" }}>
          <div style={{ fontSize:10,fontWeight:600,color:C.txt,marginBottom:9 }}>Por Promotora</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={prCh} layout="vertical" margin={{ left:60,right:8,top:0,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false}/>
              <XAxis type="number" tick={{ fontSize:9,fill:C.txm }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="n" tick={{ fontSize:9,fill:C.txs }} axisLine={false} tickLine={false} width={56}/>
              <Tooltip content={<ChTip/>}/>
              <Bar dataKey="v" radius={[0,4,4,0]}>
                {prCh.map((_,i)=><Cell key={i} fill={PC[i%PC.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,border:`1px solid ${C.bdr}`,padding:"11px 13px" }}>
          <div style={{ fontSize:10,fontWeight:600,color:C.txt,marginBottom:9 }}>Por Empregador</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={empCh} layout="vertical" margin={{ left:76,right:8,top:0,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false}/>
              <XAxis type="number" tick={{ fontSize:9,fill:C.txm }} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="n" tick={{ fontSize:9,fill:C.txs }} axisLine={false} tickLine={false} width={72}/>
              <Tooltip content={<ChTip/>}/>
              <Bar dataKey="v" fill="#818CF8" radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráficos row 2 */}
      <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:10,marginBottom:10 }}>
        <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,border:`1px solid ${C.bdr}`,padding:"11px 13px" }}>
          <div style={{ fontSize:10,fontWeight:600,color:C.txt,marginBottom:9 }}>Evolução Mensal</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={evCh} margin={{ top:4,right:8,left:-24,bottom:0 }}>
              <defs>
                <linearGradient id="evR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} vertical={false}/>
              <XAxis dataKey="n" tick={{ fontSize:9,fill:C.txm }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:9,fill:C.txm }} axisLine={false} tickLine={false}/>
              <Tooltip content={<ChTip/>}/>
              <Area type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2} fill="url(#evR)"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,border:`1px solid ${C.bdr}`,padding:"11px 13px" }}>
          <div style={{ fontSize:10,fontWeight:600,color:C.txt,marginBottom:9 }}>Por PDV</div>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={pdvCh} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                dataKey="v" nameKey="n" paddingAngle={2}>
                {pdvCh.map((_,i)=><Cell key={i} fill={PC[i%PC.length]}/>)}
              </Pie>
              <Tooltip content={<ChTip/>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de contratos deste motivo */}
      <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,border:`1px solid ${C.bdr}`,overflow:"hidden" }}>
        <div style={{ padding:"10px 13px",borderBottom:`1px solid ${C.bdl}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <span style={{ fontSize:11,fontWeight:600,color:C.txt }}>Contratos com este motivo</span>
          <span style={{ fontSize:10,color:C.txm }}>{tot} registro{tot!==1?"s":""}</span>
        </div>
        <div style={{ overflowX:"auto",maxHeight:240,overflowY:"auto" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {["#","Cliente","Empregador","Promotora","PDV","Valor","Status",""].map(h=>(
                  <th key={h} style={{ padding:"7px 10px",textAlign:"left",fontWeight:600,
                    color:C.txs,fontSize:9,textTransform:"uppercase",letterSpacing:"0.04em",
                    borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap",
                    position:"sticky",top:0,background:C.bg }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recs.map(r => {
                const g = gestao[r.id] || { status:"aberto" };
                const sv = STATUS_MAP[g.status] || STATUS_MAP.aberto;
                return (
                  <DrillRow key={r.id} r={r} g={g} sv={sv} onNota={() => onOpenNota(r)}/>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DrillRow({ r, g, sv, onNota }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderBottom:`1px solid ${C.bdl}`,background:hov?C.alt:"transparent",transition:"background .1s" }}>
      <td style={{ padding:"7px 10px",color:C.txm,fontSize:10 }}>#{r.id}</td>
      <td style={{ padding:"7px 10px" }}>
        <div style={{ fontWeight:600,color:C.txt,fontSize:11 }}>{clip(r.nome_cliente,16)}</div>
        <div style={{ fontSize:9,color:C.txm }}>{r.cpf_cnpj}</div>
      </td>
      <td style={{ padding:"7px 10px",color:C.txs,fontSize:10,whiteSpace:"nowrap" }}>{clip(r.empregador,14)}</td>
      <td style={{ padding:"7px 10px",color:C.txs,fontSize:10 }}>{clip(r.nome_promotora,13)}</td>
      <td style={{ padding:"7px 10px",color:C.txs,fontSize:10 }}>{clip(r.ponto_venda||"—",13)}</td>
      <td style={{ padding:"7px 10px",fontWeight:600,color:"#9333EA",fontSize:11,whiteSpace:"nowrap" }}>
        {r.valor_liberado>0 ? fmt$(r.valor_liberado) : "—"}
      </td>
      <td style={{ padding:"7px 10px" }}>
        <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",
          borderRadius:999,fontSize:9,fontWeight:600,background:sv.bg,color:sv.tx }}>
          <span style={{ width:5,height:5,borderRadius:"50%",background:sv.dt }}/>
          {sv.label}
        </span>
        {g.nota && <div style={{ fontSize:8,color:C.txm,marginTop:2,maxWidth:120,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{g.nota}</div>}
      </td>
      <td style={{ padding:"7px 10px" }}>
        <button onClick={onNota}
          style={{ padding:"4px 9px",borderRadius:6,border:`1px solid ${C.bdr}`,
            background:C.surf,fontSize:9,fontWeight:600,cursor:"pointer",color:C.txs,whiteSpace:"nowrap" }}>
          ✏️ Gerir
        </button>
      </td>
    </tr>
  );
}

// ── Exportar CSV ──────────────────────────────────────────────
function exportCSV(recs, gestao) {
  const header = "ID,Cliente,CPF,Empregador,Promotora,PDV,Motivo,Valor,Data,Status,Observação";
  const rows = recs.map(r => {
    const g = gestao[r.id] || {};
    return [
      r.id, `"${r.nome_cliente}"`, r.cpf_cnpj, `"${r.empregador}"`,
      `"${r.nome_promotora}"`, `"${r.ponto_venda||""}"`,
      `"${r.motivo_recusa}"`, r.valor_liberado||0,
      r.data_digitacao,
      STATUS_MAP[g.status||"aberto"]?.label||"Em Aberto",
      `"${(g.nota||"").replace(/"/g,"'")}"`
    ].join(",");
  });
  const blob = new Blob([[header,...rows].join("\n")], { type:"text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "recusados_gestao.csv";
  a.click();
}

// ── Página principal ──────────────────────────────────────────
export function RecusadosPage({ data }) {
  const recusados = useMemo(() => data.filter(r => r.estagio==="Recusado"), [data]);
  const [gestao,      setGestao]      = useState(loadGestao);
  const [motivoSel,   setMotivoSel]   = useState(null);
  const [notaRecord,  setNotaRecord]  = useState(null);
  const [filterPro,   setFilterPro]   = useState("");
  const [search,      setSearch]      = useState("");
  const [activeTab,   setActiveTab]   = useState("motivos"); // "motivos" | "gestao"

  // Persistir gestão
  useEffect(() => { saveGestao(gestao); }, [gestao]);

  const updateGestao = (id, data) => setGestao(g => ({ ...g, [id]: data }));

  // Filtragem global
  const recFiltrados = useMemo(() => recusados.filter(r => {
    if (filterPro && r.nome_promotora !== filterPro) return false;
    if (search) {
      const q = search.toLowerCase();
      return [r.nome_cliente,r.cpf_cnpj,r.motivo_recusa,r.empregador]
        .some(v => v && String(v).toLowerCase().includes(q));
    }
    return true;
  }), [recusados, filterPro, search]);

  // Motivos agrupados (sobre filtrados)
  const motivosData = useMemo(() => {
    const m = {};
    recFiltrados.forEach(r => {
      const mot = r.motivo_recusa || "Não informado";
      if (!m[mot]) m[mot] = { motivo:mot, recs:[], totV:0 };
      m[mot].recs.push(r);
      m[mot].totV += r.valor_liberado||0;
    });
    return Object.values(m).sort((a,b) => b.recs.length - a.recs.length);
  }, [recFiltrados]);

  // KPIs globais
  const stats = useMemo(() => {
    const tot  = recusados.length;
    const totV = recusados.reduce((a,r) => a+(r.valor_liberado||0), 0);
    const recup = Object.values(gestao).filter(g => g.status==="recuperado").length;
    const trat  = Object.values(gestao).filter(g => g.status==="tratativa").length;
    const comNota = Object.values(gestao).filter(g => g.nota && g.nota.trim()).length;

    // ranking motivos para overview chart
    const mM = {};
    recusados.forEach(r => { const k = r.motivo_recusa||"Não informado"; mM[k]=(mM[k]||0)+1; });
    const mCh = Object.entries(mM).sort((a,b)=>b[1]-a[1])
      .map(([n,v]) => ({ n:clip(n,22), v, full:n }));

    const promos = [...new Set(recusados.map(r=>r.nome_promotora).filter(Boolean))].sort();
    return { tot, totV, recup, trat, comNota, mCh, promos };
  }, [recusados, gestao]);

  // Dados da gestão para aba "Minha Gestão"
  const gestaoRows = useMemo(() => {
    return recusados.filter(r => gestao[r.id])
      .map(r => ({ ...r, _g: gestao[r.id] }))
      .sort((a,b) => {
        const ord = { tratativa:0, aberto:1, recuperado:2, descartado:3 };
        return (ord[a._g.status]||1) - (ord[b._g.status]||1);
      });
  }, [recusados, gestao]);

  if (recusados.length === 0) {
    return (
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",height:"100%",gap:10 }}>
        <div style={{ fontSize:32 }}>✅</div>
        <div style={{ fontSize:13,fontWeight:600,color:C.txt }}>Nenhum contrato recusado</div>
        <div style={{ fontSize:11,color:C.txs }}>Todos os contratos estão em outros estágios</div>
      </div>
    );
  }

  const motivoSelecionado = motivoSel
    ? motivosData.find(m => m.motivo === motivoSel)
    : null;

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>

      {/* Nota modal */}
      {notaRecord && (
        <NotaModal
          record={notaRecord}
          gestao={gestao}
          onSave={updateGestao}
          onClose={() => setNotaRecord(null)}
        />
      )}

      {/* ── KPIs topo ────────────────────────────────────── */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,padding:"12px 14px",
        borderBottom:`1px solid ${C.bdr}`,flexShrink:0,background:C.surf }}>
        {[
          ["Total Recusados",   fmtN(stats.tot),       "#EF4444"],
          ["Valor em Risco",    fmt$(stats.totV),       "#9333EA"],
          ["Motivos Distintos", fmtN(stats.mCh.length),"#F97316"],
          ["Em Tratativa",      fmtN(stats.trat),       "#EAB308"],
          ["Recuperados",       fmtN(stats.recup),      "#22C55E"],
        ].map(([l,v,ac]) => (
          <div key={l} style={{ background:C.bg,borderRadius:9,padding:"10px 12px",border:`1px solid ${C.bdr}` }}>
            <div style={{ fontSize:18,fontWeight:700,color:ac,letterSpacing:"-0.02em",lineHeight:1,marginBottom:3 }}>{v}</div>
            <div style={{ fontSize:9,color:C.txs }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros + Tabs ────────────────────────────────── */}
      <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 14px",
        borderBottom:`1px solid ${C.bdr}`,flexShrink:0,background:C.surf }}>
        {/* Tabs */}
        <div style={{ display:"flex",gap:2,background:C.bg,borderRadius:8,padding:3,marginRight:8 }}>
          {[["motivos","📊 Análise por Motivo"],["gestao","📋 Minha Gestão"]].map(([id,label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding:"5px 12px",borderRadius:6,border:"none",fontSize:11,fontWeight:activeTab===id?600:400,
                background:activeTab===id?C.surf:"transparent",
                color:activeTab===id?C.txt:C.txs,cursor:"pointer",
                boxShadow:activeTab===id?C.s1:"none",transition:"all .12s" }}>
              {label}
            </button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar cliente, CPF, motivo…"
          style={{ flex:1,padding:"6px 10px",borderRadius:7,border:`1px solid ${C.bdr}`,
            background:C.bg,fontSize:11,color:C.txt,outline:"none" }}/>
        <select value={filterPro} onChange={e=>setFilterPro(e.target.value)}
          style={{ padding:"6px 10px",borderRadius:7,border:`1px solid ${C.bdr}`,
            background:C.bg,fontSize:11,color:filterPro?C.txt:C.txm,outline:"none" }}>
          <option value="">Todas as promotoras</option>
          {stats.promos.map(p=><option key={p} value={p}>{p}</option>)}
        </select>
        {(search||filterPro) && (
          <button onClick={()=>{setSearch("");setFilterPro("");}}
            style={{ padding:"6px 10px",borderRadius:7,border:`1px solid ${C.bdr}`,
              background:C.surf,fontSize:10,cursor:"pointer",color:C.txs }}>✕</button>
        )}
        <button onClick={() => exportCSV(recFiltrados, gestao)}
          style={{ padding:"6px 12px",borderRadius:7,border:`1px solid ${C.bdr}`,
            background:C.surf,fontSize:10,fontWeight:600,cursor:"pointer",color:C.txs,
            whiteSpace:"nowrap" }}>
          ⬇ Exportar CSV
        </button>
      </div>

      {/* ── ABA: Análise por Motivo ───────────────────────── */}
      {activeTab === "motivos" && (
        <div style={{ flex:1,display:"flex",overflow:"hidden" }}>

          {/* Lista de motivos */}
          <div style={{ width:280,flexShrink:0,borderRight:`1px solid ${C.bdr}`,
            overflowY:"auto",background:C.surf }}>
            <div style={{ padding:"10px 12px",borderBottom:`1px solid ${C.bdl}` }}>
              <div style={{ fontSize:9,fontWeight:600,color:C.txm,textTransform:"uppercase",letterSpacing:"0.06em" }}>
                {motivosData.length} motivo{motivosData.length!==1?"s":""} · {recFiltrados.length} contratos
              </div>
            </div>
            {motivosData.map((m, idx) => {
              const active = motivoSel === m.motivo;
              const pct = recFiltrados.length ? Math.round(m.recs.length/recFiltrados.length*100) : 0;
              return (
                <div key={m.motivo} onClick={() => setMotivoSel(active ? null : m.motivo)}
                  style={{ padding:"11px 13px",borderBottom:`1px solid ${C.bdl}`,cursor:"pointer",
                    background:active?"#FEF2F2":"transparent",
                    borderLeft:active?"3px solid #EF4444":"3px solid transparent",
                    transition:"all .1s" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5 }}>
                    <div style={{ fontSize:11,fontWeight:active?600:400,
                      color:active?"#991B1B":C.txt,lineHeight:1.3,flex:1,marginRight:8 }}>
                      {m.motivo}
                    </div>
                    <span style={{ fontSize:13,fontWeight:700,color:active?"#EF4444":C.txs,flexShrink:0 }}>
                      {m.recs.length}
                    </span>
                  </div>
                  {/* barra de porcentagem */}
                  <div style={{ height:3,background:C.bdr,borderRadius:999,marginBottom:4 }}>
                    <div style={{ height:"100%",width:pct+"%",
                      background:active?"#EF4444":PC[idx%PC.length],borderRadius:999 }}/>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontSize:9,color:C.txm }}>{pct}% dos recusados</span>
                    {m.totV>0&&<span style={{ fontSize:9,color:"#9333EA",fontWeight:500 }}>{fmt$(m.totV)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drill-down ou overview */}
          {motivoSelecionado ? (
            <DrillDown
              motivo={motivoSelecionado.motivo}
              recs={motivoSelecionado.recs}
              allRecs={recFiltrados}
              gestao={gestao}
              onOpenNota={setNotaRecord}
            />
          ) : (
            /* Overview geral quando nenhum motivo selecionado */
            <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>
              <div style={{ fontSize:11,color:C.txs,marginBottom:12 }}>
                ← Selecione um motivo para ver a análise detalhada com gráficos
              </div>
              {/* Overview chart de todos os motivos */}
              <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,
                border:`1px solid ${C.bdr}`,padding:"13px 14px",marginBottom:10 }}>
                <div style={{ fontSize:11,fontWeight:600,color:C.txt,marginBottom:10 }}>
                  Ranking Geral de Motivos de Recusa
                </div>
                <ResponsiveContainer width="100%" height={Math.max(180, stats.mCh.length*26)}>
                  <BarChart data={stats.mCh} layout="vertical"
                    margin={{ left:130,right:16,top:0,bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false}/>
                    <XAxis type="number" tick={{ fontSize:9,fill:C.txm }} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="n" tick={{ fontSize:9,fill:C.txs }}
                      axisLine={false} tickLine={false} width={126}/>
                    <Tooltip content={<ChTip/>}/>
                    <Bar dataKey="v" radius={[0,4,4,0]}>
                      {stats.mCh.map((_,i)=><Cell key={i} fill={PC[i%PC.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA: Minha Gestão ────────────────────────────── */}
      {activeTab === "gestao" && (
        <div style={{ flex:1,overflowY:"auto",padding:"14px 16px" }}>

          {/* Status summary */}
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14 }}>
            {Object.entries(STATUS_MAP).map(([k,v]) => {
              const cnt = Object.values(gestao).filter(g=>g.status===k).length;
              return (
                <div key={k} style={{ padding:"11px 13px",background:v.bg,borderRadius:9,
                  border:`1px solid ${v.dt}33` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:3 }}>
                    <span style={{ width:7,height:7,borderRadius:"50%",background:v.dt }}/>
                    <span style={{ fontSize:9,fontWeight:600,color:v.tx,textTransform:"uppercase",
                      letterSpacing:"0.04em" }}>{v.label}</span>
                  </div>
                  <div style={{ fontSize:22,fontWeight:700,color:v.tx }}>{cnt}</div>
                </div>
              );
            })}
          </div>

          {gestaoRows.length === 0 ? (
            <div style={{ textAlign:"center",padding:"32px 0",color:C.txm }}>
              <div style={{ fontSize:24,marginBottom:8 }}>📋</div>
              <div style={{ fontSize:13,fontWeight:600,color:C.txt,marginBottom:4 }}>
                Nenhum contrato gerenciado ainda
              </div>
              <div style={{ fontSize:11 }}>
                Vá para "Análise por Motivo", clique em um contrato e use "✏️ Gerir" para adicionar status e observações
              </div>
            </div>
          ) : (
            <div style={{ background:C.surf,borderRadius:10,boxShadow:C.s1,
              border:`1px solid ${C.bdr}`,overflow:"hidden" }}>
              <div style={{ padding:"10px 13px",borderBottom:`1px solid ${C.bdl}`,
                display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:11,fontWeight:600,color:C.txt }}>
                  Contratos em gestão
                </span>
                <span style={{ fontSize:10,color:C.txm }}>{gestaoRows.length} registro{gestaoRows.length!==1?"s":""}</span>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
                  <thead>
                    <tr style={{ background:C.bg }}>
                      {["#","Cliente","Motivo da Recusa","Promotora","Valor","Status","Observação","Atualizado",""].map(h=>(
                        <th key={h} style={{ padding:"8px 11px",textAlign:"left",fontWeight:600,color:C.txs,
                          fontSize:9,textTransform:"uppercase",letterSpacing:"0.04em",
                          borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap",
                          position:"sticky",top:0,background:C.bg }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gestaoRows.map(r => {
                      const sv = STATUS_MAP[r._g.status] || STATUS_MAP.aberto;
                      return <GestaoRow key={r.id} r={r} sv={sv} onNota={()=>setNotaRecord(r)}/>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GestaoRow({ r, sv, onNota }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderBottom:`1px solid ${C.bdl}`,background:hov?C.alt:"transparent",transition:"background .1s" }}>
      <td style={{ padding:"8px 11px",color:C.txm,fontSize:10 }}>#{r.id}</td>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ fontWeight:600,color:C.txt,fontSize:11 }}>{clip(r.nome_cliente,16)}</div>
        <div style={{ fontSize:9,color:C.txm }}>{r.cpf_cnpj}</div>
      </td>
      <td style={{ padding:"8px 11px" }}>
        <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 7px",
          background:"#FEF2F2",borderRadius:999,fontSize:9,fontWeight:600,color:"#991B1B",
          maxWidth:180,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis" }}>
          <span style={{ width:5,height:5,borderRadius:"50%",background:"#EF4444",flexShrink:0 }}/>
          {clip(r.motivo_recusa,22)}
        </span>
      </td>
      <td style={{ padding:"8px 11px",color:C.txs,fontSize:10 }}>{clip(r.nome_promotora,13)}</td>
      <td style={{ padding:"8px 11px",fontWeight:600,color:"#9333EA",fontSize:11,whiteSpace:"nowrap" }}>
        {r.valor_liberado>0 ? fmt$(r.valor_liberado) : "—"}
      </td>
      <td style={{ padding:"8px 11px" }}>
        <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",
          borderRadius:999,fontSize:9,fontWeight:600,background:sv.bg,color:sv.tx }}>
          <span style={{ width:5,height:5,borderRadius:"50%",background:sv.dt }}/>
          {sv.label}
        </span>
      </td>
      <td style={{ padding:"8px 11px",color:C.txs,fontSize:10,maxWidth:180 }}>
        {r._g.nota
          ? <span style={{ display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {r._g.nota}
            </span>
          : <span style={{ color:C.txm }}>—</span>}
      </td>
      <td style={{ padding:"8px 11px",color:C.txm,fontSize:9,whiteSpace:"nowrap" }}>
        {r._g.updated||"—"}
      </td>
      <td style={{ padding:"8px 11px" }}>
        <button onClick={onNota}
          style={{ padding:"4px 9px",borderRadius:6,border:`1px solid ${C.bdr}`,
            background:C.surf,fontSize:9,fontWeight:600,cursor:"pointer",color:C.txs }}>
          ✏️ Editar
        </button>
      </td>
    </tr>
  );
}
