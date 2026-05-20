import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { C } from "../constants/design.js";
import { fmt$, fmtN, clip } from "../utils/index.js";
import { calcScore, calcBatchStats } from "../utils/recuperabilidade.js";

// ── Persistência ──────────────────────────────────────────────
const LS_CONV = "contractiq_conversao_v1";
function loadConv() {
  try { return JSON.parse(localStorage.getItem(LS_CONV) || "{}"); } catch { return {}; }
}
function saveConv(d) {
  try { localStorage.setItem(LS_CONV, JSON.stringify(d)); } catch {}
}

// ── Colunas do Kanban ─────────────────────────────────────────
const COLS_KANBAN = [
  { id:"fila",      label:"Fila de Contato",   color:"#6366F1", bg:"#EEF2FF", dt:"#818CF8" },
  { id:"contato",   label:"Em Contato",         color:"#F97316", bg:"#FFF7ED", dt:"#FB923C" },
  { id:"proposta",  label:"Proposta Enviada",   color:"#EAB308", bg:"#FEF9C3", dt:"#FACC15" },
  { id:"recuperado",label:"Recuperado ✓",       color:"#22C55E", bg:"#F0FDF4", dt:"#4ADE80" },
  { id:"descartado",label:"Descartado",         color:"#94A3B8", bg:"#F8FAFC", dt:"#CBD5E1" },
];

// ── Tooltip chart ─────────────────────────────────────────────
function ChTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:7,
      padding:"7px 10px", boxShadow:C.s2, fontSize:11 }}>
      {label && <div style={{ fontWeight:600, color:C.txt, marginBottom:2 }}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.fill||C.pri, fontWeight:600 }}>{p.value}</div>
      ))}
    </div>
  );
}

// ── Score badge ───────────────────────────────────────────────
function ScoreBadge({ score, cor, nivel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <div style={{ position:"relative", width:36, height:36, flexShrink:0 }}>
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke={C.bdr} strokeWidth="3"/>
          <circle cx="18" cy="18" r="15" fill="none" stroke={cor} strokeWidth="3"
            strokeDasharray={`${(score/100)*94.2} 94.2`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
            style={{ transition:"stroke-dasharray .6s ease" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          fontSize:9, fontWeight:700, color:cor }}>{score}</div>
      </div>
      <div>
        <div style={{ fontSize:9, fontWeight:600, color:cor }}>{nivel}</div>
        <div style={{ fontSize:8, color:C.txm }}>recuperabilidade</div>
      </div>
    </div>
  );
}

// ── Modal de detalhe / script ──────────────────────────────────
function DetailModal({ record, scoreData, colId, onMove, onClose }) {
  const [copied, setCopied] = useState(false);
  const script = scoreData.script.join("\n\n");

  const copyScript = () => {
    navigator.clipboard?.writeText(script).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div onClick={e => e.target===e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(28,31,36,0.5)", display:"flex",
        alignItems:"center", justifyContent:"center", zIndex:300,
        backdropFilter:"blur(5px)", padding:16 }}>
      <div style={{ background:C.surf, borderRadius:14, width:"100%", maxWidth:560,
        maxHeight:"92vh", overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:C.s3 }}>

        {/* Header */}
        <div style={{ padding:"13px 16px", borderBottom:`1px solid ${C.bdl}`,
          display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, marginRight:12 }}>
            <div style={{ fontSize:13, fontWeight:700, color:C.txt }}>
              Plano de Conversão
            </div>
            <div style={{ fontSize:10, color:C.txs, marginTop:1 }}>
              {record.nome_cliente} · {clip(record.motivo_recusa, 32)}
            </div>
          </div>
          <ScoreBadge score={scoreData.score} cor={scoreData.cor} nivel={scoreData.nivel} />
          <button onClick={onClose} style={{ marginLeft:12, width:26, height:26,
            borderRadius:"50%", border:`1px solid ${C.bdr}`, background:C.bg,
            cursor:"pointer", fontSize:16, color:C.txs, flexShrink:0 }}>×</button>
        </div>

        <div style={{ overflowY:"auto", padding:"14px 16px", flex:1 }}>

          {/* Dados rápidos */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6, marginBottom:13 }}>
            {[
              ["Empregador",   clip(record.empregador,18)],
              ["Promotora",    clip(record.nome_promotora,18)],
              ["Valor",        record.valor_liberado>0 ? fmt$(record.valor_liberado) : "—"],
              ["Digitação",    record.data_digitacao||"—"],
              ["Prazo ação",   scoreData.prazo],
              ["Categoria",    scoreData.categoria],
            ].map(([l,v]) => (
              <div key={l} style={{ padding:"7px 9px", background:C.bg, borderRadius:7 }}>
                <div style={{ fontSize:8, color:C.txm, textTransform:"uppercase",
                  letterSpacing:"0.05em", marginBottom:2 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:600, color:C.txt }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Diagnóstico */}
          <div style={{ padding:"10px 12px", background:"#F8FAFC", borderRadius:9,
            borderLeft:`3px solid ${scoreData.cor}`, marginBottom:13 }}>
            <div style={{ fontSize:9, fontWeight:600, color:C.txs, textTransform:"uppercase",
              letterSpacing:"0.05em", marginBottom:4 }}>Diagnóstico</div>
            <div style={{ fontSize:12, color:C.txs, lineHeight:1.6 }}>{scoreData.resumo}</div>
          </div>

          {/* Ações */}
          <div style={{ marginBottom:13 }}>
            <div style={{ fontSize:10, fontWeight:600, color:C.txt, marginBottom:7,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>✅ Ações Recomendadas</div>
            {scoreData.acoes.map((a, i) => (
              <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start",
                padding:"8px 10px", background:C.prl, borderRadius:8, marginBottom:5 }}>
                <div style={{ width:20, height:20, borderRadius:"50%", background:C.pri,
                  color:"#fff", fontSize:10, fontWeight:700, display:"flex",
                  alignItems:"center", justifyContent:"center", flexShrink:0 }}>{i+1}</div>
                <span style={{ fontSize:11, color:C.txt, lineHeight:1.5 }}>{a}</span>
              </div>
            ))}
          </div>

          {/* Script */}
          <div style={{ marginBottom:13 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              marginBottom:7 }}>
              <div style={{ fontSize:10, fontWeight:600, color:C.txt,
                textTransform:"uppercase", letterSpacing:"0.05em" }}>💬 Script de Abordagem</div>
              <button onClick={copyScript}
                style={{ padding:"4px 10px", borderRadius:6, border:`1px solid ${C.bdr}`,
                  background:copied?"#F0FDF4":C.surf, fontSize:10, cursor:"pointer",
                  color:copied?"#14532D":C.txs, fontWeight:copied?600:400,
                  transition:"all .15s" }}>
                {copied ? "✓ Copiado!" : "📋 Copiar"}
              </button>
            </div>
            <div style={{ background:"#1C1F24", borderRadius:10, padding:"12px 14px" }}>
              {scoreData.script.map((linha, i) => (
                <div key={i} style={{ fontSize:12, color:"#F1F5F9", lineHeight:1.65,
                  marginBottom: i < scoreData.script.length-1 ? 10 : 0,
                  paddingBottom: i < scoreData.script.length-1 ? 10 : 0,
                  borderBottom: i < scoreData.script.length-1 ? "1px solid #374151" : "none" }}>
                  {linha}
                </div>
              ))}
            </div>
          </div>

          {/* Mover no kanban */}
          <div>
            <div style={{ fontSize:10, fontWeight:600, color:C.txt, marginBottom:7,
              textTransform:"uppercase", letterSpacing:"0.05em" }}>Mover para etapa</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {COLS_KANBAN.filter(c => c.id !== colId).map(col => (
                <button key={col.id} onClick={() => { onMove(record.id, col.id); onClose(); }}
                  style={{ padding:"6px 12px", borderRadius:7, border:`1px solid ${col.dt}`,
                    background:col.bg, color:col.color, fontSize:11, fontWeight:600,
                    cursor:"pointer", transition:"all .12s" }}>
                  → {col.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Card kanban ────────────────────────────────────────────────
function KanbanCard({ record, scoreData, colId, onOpen }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onOpen}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:C.surf, borderRadius:9, padding:"10px 11px", marginBottom:7,
        boxShadow: hov ? C.s2 : C.s1, border:`1px solid ${hov ? scoreData.cor+"66" : C.bdr}`,
        cursor:"pointer", transition:"all .15s",
        transform: hov ? "translateY(-1px)" : "none" }}>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:7 }}>
        <div style={{ flex:1, marginRight:8 }}>
          <div style={{ fontSize:11, fontWeight:600, color:C.txt, marginBottom:2 }}>
            {clip(record.nome_cliente, 18)}
          </div>
          <div style={{ fontSize:9, color:C.txm }}>{record.cpf_cnpj}</div>
        </div>
        {/* Mini score circle */}
        <div style={{ width:28, height:28, borderRadius:"50%", flexShrink:0,
          background:scoreData.cor+"18", border:`2px solid ${scoreData.cor}`,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:9, fontWeight:700, color:scoreData.cor }}>{scoreData.score}</span>
        </div>
      </div>

      <div style={{ fontSize:9, color:C.txs, marginBottom:6, lineHeight:1.4 }}>
        {clip(record.motivo_recusa, 32)}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:8, padding:"2px 6px", borderRadius:999,
          background:scoreData.cor+"18", color:scoreData.cor, fontWeight:600 }}>
          {scoreData.categoria}
        </span>
        {record.valor_liberado > 0 && (
          <span style={{ fontSize:9, fontWeight:600, color:"#9333EA" }}>
            {fmt$(record.valor_liberado)}
          </span>
        )}
      </div>

      {scoreData.prazo !== "Indefinido" && (
        <div style={{ marginTop:6, paddingTop:6, borderTop:`1px solid ${C.bdl}`,
          fontSize:8, color:C.txm, display:"flex", alignItems:"center", gap:4 }}>
          <span>⏱</span> Ação em {scoreData.prazo}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export function ConversaoPage({ data }) {
  const recusados = useMemo(() => data.filter(r => r.estagio === "Recusado"), [data]);
  const [conv,       setConv]       = useState(loadConv);
  const [detalhe,    setDetalhe]    = useState(null); // { record, scoreData, colId }
  const [filtroCat,  setFiltroCat]  = useState("");
  const [filtroNivel,setFiltroNivel]= useState("");
  const [abaVis,     setAbaVis]     = useState("kanban"); // kanban | fila | painel

  useEffect(() => { saveConv(conv); }, [conv]);

  const moveCard = (id, novaCol) => setConv(c => ({ ...c, [id]: novaCol }));

  // Scored records
  const scored = useMemo(() => {
    return recusados.map(r => ({ r, s: calcScore(r) }));
  }, [recusados]);

  // Batch stats
  const batch = useMemo(() => calcBatchStats(recusados), [recusados]);

  // Agrupar por coluna kanban
  const byCol = useMemo(() => {
    const m = Object.fromEntries(COLS_KANBAN.map(c => [c.id, []]));
    scored.forEach(({ r, s }) => {
      const col = conv[r.id] || "fila";
      if (!m[col]) m[col] = [];
      m[col].push({ r, s });
    });
    // ordenar por score desc dentro de cada coluna
    Object.values(m).forEach(arr => arr.sort((a,b) => b.s.score - a.s.score));
    return m;
  }, [scored, conv]);

  // Fila priorizada (somente "fila" + filtros)
  const fila = useMemo(() => {
    return (byCol.fila || []).filter(({ r, s }) => {
      if (filtroCat   && s.categoria !== filtroCat)   return false;
      if (filtroNivel && s.nivel     !== filtroNivel)  return false;
      return true;
    });
  }, [byCol, filtroCat, filtroNivel]);

  const cats   = useMemo(() => [...new Set(scored.map(x=>x.s.categoria))].sort(), [scored]);
  const niveis = ["Alta","Média","Baixa"];

  // Dados overview
  const catStats = useMemo(() => {
    const m = {};
    scored.forEach(({ s }) => { m[s.categoria] = (m[s.categoria]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([n,v])=>({n,v}));
  }, [scored]);

  const CAT_COLORS = { Alta:"#22C55E", Média:"#F97316", Baixa:"#EF4444" };

  if (recusados.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
        justifyContent:"center", height:"100%", gap:10 }}>
        <div style={{ fontSize:32 }}>✅</div>
        <div style={{ fontSize:13, fontWeight:600, color:C.txt }}>Sem contratos recusados</div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {detalhe && (
        <DetailModal
          record={detalhe.r}
          scoreData={detalhe.s}
          colId={detalhe.colId}
          onMove={moveCard}
          onClose={() => setDetalhe(null)}
        />
      )}

      {/* ── KPIs topo ──────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8,
        padding:"11px 14px", borderBottom:`1px solid ${C.bdr}`,
        flexShrink:0, background:C.surf }}>
        {[
          ["Total Recusados",     fmtN(recusados.length),         "#EF4444"],
          ["Recuperabilidade Alta",fmtN(batch.alta.length),       "#22C55E"],
          ["Recuperab. Média",    fmtN(batch.media.length),       "#F97316"],
          ["Valor Recuperável",   fmt$(batch.valorRecuperavel),   "#9333EA"],
          ["Em Contato",          fmtN((byCol.contato||[]).length),"#6366F1"],
          ["Recuperados",         fmtN((byCol.recuperado||[]).length),"#22C55E"],
        ].map(([l,v,ac]) => (
          <div key={l} style={{ background:C.bg, borderRadius:9, padding:"10px 12px",
            border:`1px solid ${C.bdr}` }}>
            <div style={{ fontSize:17, fontWeight:700, color:ac,
              letterSpacing:"-0.02em", lineHeight:1, marginBottom:3 }}>{v}</div>
            <div style={{ fontSize:9, color:C.txs }}>{l}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ───────────────────────────────────────── */}
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
        borderBottom:`1px solid ${C.bdr}`, flexShrink:0, background:C.surf }}>
        <div style={{ display:"flex", gap:2, background:C.bg, borderRadius:8, padding:3 }}>
          {[
            ["kanban", "🎯 Kanban de Conversão"],
            ["fila",   "⚡ Fila Priorizada"],
            ["painel", "📊 Painel de Recuperação"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setAbaVis(id)}
              style={{ padding:"5px 12px", borderRadius:6, border:"none", fontSize:11,
                fontWeight: abaVis===id ? 600 : 400,
                background: abaVis===id ? C.surf : "transparent",
                color:       abaVis===id ? C.txt  : C.txs,
                cursor:"pointer", boxShadow: abaVis===id ? C.s1 : "none",
                transition:"all .12s" }}>
              {label}
            </button>
          ))}
        </div>

        {abaVis === "fila" && (
          <>
            <select value={filtroCat} onChange={e=>setFiltroCat(e.target.value)}
              style={{ padding:"5px 9px", borderRadius:7, border:`1px solid ${C.bdr}`,
                background:C.bg, fontSize:11, color:filtroCat?C.txt:C.txm, outline:"none" }}>
              <option value="">Todas as categorias</option>
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroNivel} onChange={e=>setFiltroNivel(e.target.value)}
              style={{ padding:"5px 9px", borderRadius:7, border:`1px solid ${C.bdr}`,
                background:C.bg, fontSize:11, color:filtroNivel?C.txt:C.txm, outline:"none" }}>
              <option value="">Todos os níveis</option>
              {niveis.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {(filtroCat||filtroNivel) && (
              <button onClick={()=>{setFiltroCat("");setFiltroNivel("");}}
                style={{ padding:"5px 9px", borderRadius:7, border:`1px solid ${C.bdr}`,
                  background:C.surf, fontSize:10, cursor:"pointer", color:C.txs }}>✕</button>
            )}
          </>
        )}
      </div>

      {/* ── ABA: KANBAN ────────────────────────────────── */}
      {abaVis === "kanban" && (
        <div style={{ flex:1, overflowX:"auto", overflowY:"hidden",
          display:"flex", gap:10, padding:"12px 14px" }}>
          {COLS_KANBAN.map(col => {
            const cards = byCol[col.id] || [];
            const totV  = cards.reduce((a,{r})=>a+(r.valor_liberado||0),0);
            return (
              <div key={col.id} style={{ width:220, flexShrink:0, display:"flex",
                flexDirection:"column", height:"100%" }}>
                {/* Coluna header */}
                <div style={{ padding:"8px 10px", borderRadius:"9px 9px 0 0",
                  background:col.bg, border:`1px solid ${col.dt}44`,
                  borderBottom:"none", marginBottom:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:11, fontWeight:700, color:col.color }}>{col.label}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:col.color }}>{cards.length}</span>
                  </div>
                  {totV > 0 && (
                    <div style={{ fontSize:9, color:col.color, opacity:.7, marginTop:2 }}>
                      {fmt$(totV)} em jogo
                    </div>
                  )}
                </div>
                {/* Cards */}
                <div style={{ flex:1, overflowY:"auto", background:col.bg+"88",
                  border:`1px solid ${col.dt}44`, borderRadius:"0 0 9px 9px",
                  padding:"8px 8px 4px" }}>
                  {cards.length === 0 ? (
                    <div style={{ textAlign:"center", padding:"20px 8px",
                      color:col.color, opacity:.5, fontSize:11 }}>
                      Vazio
                    </div>
                  ) : cards.map(({ r, s }) => (
                    <KanbanCard key={r.id} record={r} scoreData={s} colId={col.id}
                      onOpen={() => setDetalhe({ r, s, colId:col.id })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ABA: FILA PRIORIZADA ───────────────────────── */}
      {abaVis === "fila" && (
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
          <div style={{ marginBottom:10, fontSize:11, color:C.txs }}>
            {fila.length} contrato{fila.length!==1?"s":""} na fila · ordenados por score de recuperabilidade
          </div>
          <div style={{ background:C.surf, borderRadius:10, boxShadow:C.s1,
            border:`1px solid ${C.bdr}`, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:C.bg }}>
                  {["Score","Cliente","Motivo","Empregador","Promotora","Valor","Prazo Ação","Ação"].map(h=>(
                    <th key={h} style={{ padding:"8px 11px", textAlign:"left", fontWeight:600,
                      color:C.txs, fontSize:9, textTransform:"uppercase", letterSpacing:"0.04em",
                      borderBottom:`1px solid ${C.bdr}`, whiteSpace:"nowrap",
                      position:"sticky", top:0, background:C.bg }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fila.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding:"24px", textAlign:"center", color:C.txm }}>
                    Fila vazia — todos os contatos foram movidos para outras etapas
                  </td></tr>
                ) : fila.map(({ r, s }) => (
                  <FilaRow key={r.id} r={r} s={s}
                    onAbrir={() => setDetalhe({ r, s, colId:"fila" })}
                    onMover={col => moveCard(r.id, col)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ABA: PAINEL ────────────────────────────────── */}
      {abaVis === "painel" && (
        <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>

          {/* Funil de conversão */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)",
            gap:0, marginBottom:14, background:C.surf, borderRadius:10,
            boxShadow:C.s1, border:`1px solid ${C.bdr}`, overflow:"hidden" }}>
            {COLS_KANBAN.map((col, i) => {
              const cnt = (byCol[col.id]||[]).length;
              const pct = recusados.length ? Math.round(cnt/recusados.length*100) : 0;
              return (
                <div key={col.id} style={{ padding:"14px 12px", textAlign:"center",
                  borderRight: i<4 ? `1px solid ${C.bdr}` : "none",
                  background: col.bg + "44" }}>
                  <div style={{ fontSize:22, fontWeight:700, color:col.color,
                    letterSpacing:"-0.02em", marginBottom:3 }}>{cnt}</div>
                  <div style={{ fontSize:10, fontWeight:600, color:col.color,
                    marginBottom:2 }}>{col.label}</div>
                  <div style={{ fontSize:9, color:C.txm }}>{pct}%</div>
                  {/* mini barra */}
                  <div style={{ height:4, background:C.bdr, borderRadius:999, marginTop:7 }}>
                    <div style={{ height:"100%", width:pct+"%",
                      background:col.dt, borderRadius:999,
                      transition:"width .6s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2 gráficos */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            {/* Distribuição por nível */}
            <div style={{ background:C.surf, borderRadius:10, boxShadow:C.s1,
              border:`1px solid ${C.bdr}`, padding:"12px 14px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.txt, marginBottom:10 }}>
                Distribuição por Recuperabilidade
              </div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                {[["Alta","#22C55E"],[" Média","#F97316"],["Baixa","#EF4444"]].map(([n,c])=>{
                  const cnt2 = scored.filter(x=>x.s.nivel.trim()===n.trim()).length;
                  const p2 = scored.length ? Math.round(cnt2/scored.length*100) : 0;
                  return (
                    <div key={n} style={{ flex:1, padding:"10px", background:c+"12",
                      borderRadius:8, border:`1px solid ${c}33`, textAlign:"center" }}>
                      <div style={{ fontSize:18, fontWeight:700, color:c }}>{cnt2}</div>
                      <div style={{ fontSize:9, color:c, fontWeight:600 }}>{n.trim()}</div>
                      <div style={{ fontSize:8, color:C.txm }}>{p2}%</div>
                    </div>
                  );
                })}
              </div>
              {/* barra empilhada */}
              <div style={{ height:8, borderRadius:999, overflow:"hidden", display:"flex", gap:1 }}>
                {[["Alta","#22C55E"],["Média","#F97316"],["Baixa","#EF4444"]].map(([n,c])=>{
                  const cnt2 = scored.filter(x=>x.s.nivel===n).length;
                  const p2 = scored.length ? (cnt2/scored.length*100) : 0;
                  return <div key={n} style={{ width:p2+"%", background:c, transition:"width .6s" }}/>;
                })}
              </div>
            </div>

            {/* Categorias */}
            <div style={{ background:C.surf, borderRadius:10, boxShadow:C.s1,
              border:`1px solid ${C.bdr}`, padding:"12px 14px" }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.txt, marginBottom:8 }}>
                Por Categoria de Recusa
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={catStats} layout="vertical"
                  margin={{ left:80, right:10, top:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false}/>
                  <XAxis type="number" tick={{ fontSize:9,fill:C.txm }} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="n" tick={{ fontSize:9,fill:C.txs }}
                    axisLine={false} tickLine={false} width={76}/>
                  <Tooltip content={<ChTip/>}/>
                  <Bar dataKey="v" radius={[0,4,4,0]}>
                    {catStats.map((_,i)=>(
                      <Cell key={i} fill={["#22C55E","#F97316","#EF4444","#6366F1","#22D3EE","#A78BFA"][i%6]}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 para contato hoje */}
          <div style={{ background:C.surf, borderRadius:10, boxShadow:C.s1,
            border:`1px solid ${C.bdr}`, overflow:"hidden" }}>
            <div style={{ padding:"10px 13px", borderBottom:`1px solid ${C.bdl}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, fontWeight:600, color:C.txt }}>
                ⚡ Prioridades de Hoje — Melhores chances de conversão
              </span>
              <span style={{ fontSize:9, color:C.txm }}>Score ≥ 65 · Em aberto</span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <tbody>
                {(byCol.fila||[]).filter(x=>x.s.score>=65).slice(0,8).map(({ r, s }) => (
                  <PrioRow key={r.id} r={r} s={s}
                    onAbrir={() => setDetalhe({ r, s, colId:"fila" })}
                    onContato={() => moveCard(r.id, "contato")} />
                ))}
                {(byCol.fila||[]).filter(x=>x.s.score>=65).length===0 && (
                  <tr><td colSpan={7} style={{ padding:"20px", textAlign:"center", color:C.txm, fontSize:11 }}>
                    Todos os prioritários já foram trabalhados 🎉
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Linhas da fila ─────────────────────────────────────────────
function FilaRow({ r, s, onAbrir, onMover }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderBottom:`1px solid ${C.bdl}`, background:hov?C.alt:"transparent",
        transition:"background .1s" }}>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:24, height:24, borderRadius:"50%", flexShrink:0,
            background:s.cor+"18", border:`2px solid ${s.cor}`,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:8, fontWeight:700, color:s.cor }}>{s.score}</span>
          </div>
          <span style={{ fontSize:9, fontWeight:600, color:s.cor }}>{s.nivel}</span>
        </div>
      </td>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ fontWeight:600, color:C.txt }}>{clip(r.nome_cliente,16)}</div>
        <div style={{ fontSize:9, color:C.txm }}>{r.cpf_cnpj}</div>
      </td>
      <td style={{ padding:"8px 11px" }}>
        <span style={{ fontSize:9, padding:"2px 7px", borderRadius:999,
          background:"#FEF2F2", color:"#991B1B", fontWeight:600 }}>
          {clip(r.motivo_recusa,22)}
        </span>
      </td>
      <td style={{ padding:"8px 11px", color:C.txs, fontSize:10 }}>{clip(r.empregador,14)}</td>
      <td style={{ padding:"8px 11px", color:C.txs, fontSize:10 }}>{clip(r.nome_promotora,13)}</td>
      <td style={{ padding:"8px 11px", fontWeight:600, color:"#9333EA", fontSize:11, whiteSpace:"nowrap" }}>
        {r.valor_liberado>0 ? fmt$(r.valor_liberado) : "—"}
      </td>
      <td style={{ padding:"8px 11px", fontSize:10, color:C.txs, whiteSpace:"nowrap" }}>⏱ {s.prazo}</td>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={onAbrir}
            style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.bdr}`,
              background:C.surf, fontSize:9, cursor:"pointer", color:C.txs }}>Ver plano</button>
          <button onClick={() => onMover("contato")}
            style={{ padding:"4px 8px", borderRadius:6, border:"none",
              background:C.pri, fontSize:9, fontWeight:600, cursor:"pointer", color:"#fff" }}>
            📞 Contatar
          </button>
        </div>
      </td>
    </tr>
  );
}

function PrioRow({ r, s, onAbrir, onContato }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ borderBottom:`1px solid ${C.bdl}`, background:hov?C.alt:"transparent",
        transition:"background .1s" }}>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0,
          background:s.cor+"18", border:`2.5px solid ${s.cor}`,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ fontSize:10, fontWeight:700, color:s.cor }}>{s.score}</span>
        </div>
      </td>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ fontWeight:600, color:C.txt }}>{clip(r.nome_cliente,16)}</div>
        <div style={{ fontSize:9, color:C.txm }}>{r.telefone||r.cpf_cnpj}</div>
      </td>
      <td style={{ padding:"8px 11px" }}>
        <span style={{ fontSize:9, padding:"2px 7px", borderRadius:999,
          background:s.cor+"18", color:s.cor, fontWeight:600 }}>{s.categoria}</span>
      </td>
      <td style={{ padding:"8px 11px", color:C.txs, fontSize:10 }}>{clip(r.motivo_recusa,24)}</td>
      <td style={{ padding:"8px 11px", fontWeight:600, color:"#9333EA", fontSize:11 }}>
        {r.valor_liberado>0 ? fmt$(r.valor_liberado) : "—"}
      </td>
      <td style={{ padding:"8px 11px", fontSize:10, color:C.txs }}>⏱ {s.prazo}</td>
      <td style={{ padding:"8px 11px" }}>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={onAbrir}
            style={{ padding:"4px 8px", borderRadius:6, border:`1px solid ${C.bdr}`,
              background:C.surf, fontSize:9, cursor:"pointer", color:C.txs }}>Plano</button>
          <button onClick={onContato}
            style={{ padding:"4px 8px", borderRadius:6, border:"none",
              background:"#22C55E", fontSize:9, fontWeight:600, cursor:"pointer", color:"#fff" }}>
            ✓ Iniciar
          </button>
        </div>
      </td>
    </tr>
  );
}
