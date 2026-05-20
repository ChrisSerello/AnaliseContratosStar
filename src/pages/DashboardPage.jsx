import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Hash, AlertCircle, XCircle, CheckCircle, DollarSign, TrendingUp, Calendar,
} from "lucide-react";
import { C, STAGE_STYLES, STAGES, PIE_COLORS } from "../constants/design.js";
import { fmt$, fmtN, clip } from "../utils/index.js";
import { Kpi, Card, ChartTooltip } from "../components/Primitives.jsx";

export function DashboardPage({ data, onStageClick }) {
  const stats = useMemo(() => {
    const total = data.length;
    const bySt  = Object.fromEntries(STAGES.map(s => [s, 0]));
    data.forEach(r => { bySt[r.estagio] = (bySt[r.estagio] || 0) + 1; });

    const totalValor = data.reduce((a, r) => a + (r.valor_liberado || 0), 0);
    const withValor  = data.filter(r => r.valor_liberado > 0);
    const ticket     = withValor.length ? totalValor / withValor.length : 0;
    const lastMov    = data.reduce((m, r) => r._dtM > m ? r._dtM : m, new Date(0));

    // Charts data
    const stageChart = STAGES.map(s => ({ n: s, v: bySt[s] || 0, c: STAGE_STYLES[s]?.dt }));

    const sitMap = {};
    data.forEach(r => { sitMap[r.situacao] = (sitMap[r.situacao] || 0) + 1; });
    const sitChart = Object.entries(sitMap).map(([k, v]) => ({ n: k, v }));

    const prMap = {};
    data.forEach(r => { prMap[r.nome_promotora] = (prMap[r.nome_promotora] || 0) + 1; });
    const promoChart = Object.entries(prMap).sort((a,b) => b[1]-a[1]).map(([k,v]) => ({ n:k, v }));

    const evMap = {};
    data.forEach(r => {
      const d = r._dtD instanceof Date && !isNaN(r._dtD) ? r._dtD : new Date();
      const k = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}`;
      evMap[k] = (evMap[k] || 0) + 1;
    });
    const evolutionChart = Object.entries(evMap).sort().slice(-10).map(([k,v]) => ({ n:k, v }));

    const mMap = {};
    data.forEach(r => { if (r.motivo_recusa) mMap[r.motivo_recusa] = (mMap[r.motivo_recusa]||0)+1; });
    const motivosChart = Object.entries(mMap).sort((a,b)=>b[1]-a[1]).slice(0,5)
      .map(([k,v]) => ({ n: clip(k, 22), v }));

    const maMap = {};
    data.forEach(r => { maMap[r.nome_matriz] = (maMap[r.nome_matriz]||0)+1; });
    const matrizChart = Object.entries(maMap).sort((a,b)=>b[1]-a[1]).map(([k,v]) => ({ n:k, v }));

    const pdMap = {};
    data.forEach(r => { pdMap[r.ponto_venda] = (pdMap[r.ponto_venda]||0)+1; });
    const pdvChart = Object.entries(pdMap).sort((a,b)=>b[1]-a[1]).map(([k,v]) => ({ n:k, v }));

    return {
      total, bySt, totalValor, ticket, lastMov,
      pend:  bySt["Pendente"]  || 0,
      rec:   bySt["Recusado"]  || 0,
      apr:  (bySt["Aprovado"]  || 0) + (bySt["Liberado"] || 0) + (bySt["Finalizado"] || 0),
      stageChart, sitChart, promoChart, evolutionChart, motivosChart, matrizChart, pdvChart,
    };
  }, [data]);

  return (
    <div style={{ padding:"16px 20px", overflowY:"auto", height:"100%" }}>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:8, marginBottom:14 }}>
        <Kpi icon={Hash}         label="Total"          value={fmtN(stats.total)} />
        <Kpi icon={AlertCircle}  label="Pendentes"      value={fmtN(stats.pend)}  accent="#EA580C" onClick={() => onStageClick("Pendente")} />
        <Kpi icon={XCircle}      label="Recusados"      value={fmtN(stats.rec)}   accent="#EF4444" onClick={() => onStageClick("Recusado")} />
        <Kpi icon={CheckCircle}  label="Aprov. + Lib."  value={fmtN(stats.apr)}   accent="#22C55E" onClick={() => onStageClick("Aprovado")} />
        <Kpi icon={DollarSign}   label="Total Liberado" value={fmt$(stats.totalValor)} />
        <Kpi icon={TrendingUp}   label="Ticket Médio"   value={fmt$(stats.ticket)} />
        <Kpi icon={Calendar}     label="Última Movim."  value={stats.lastMov > new Date(0) ? stats.lastMov.toLocaleDateString("pt-BR") : "—"} />
      </div>

      {/* ── Stage pills ──────────────────────────────────── */}
      <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
        {STAGES.map(stage => {
          const cnt = stats.bySt[stage] || 0;
          const pct = stats.total ? Math.round(cnt / stats.total * 100) : 0;
          const sc  = STAGE_STYLES[stage];
          return <StagePill key={stage} stage={stage} count={cnt} pct={pct} sc={sc} onClick={() => onStageClick(stage)} />;
        })}
      </div>

      {/* ── Row 1: stage bar + situation pie ─────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <Card title="Distribuição por Estágio">
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={stats.stageChart} layout="vertical" margin={{ left:62, right:14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false} />
              <XAxis type="number" tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="n" tick={{ fontSize:9, fill:C.txs }} axisLine={false} tickLine={false} width={58} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="v" radius={[0,4,4,0]}>
                {stats.stageChart.map((e,i) => <Cell key={i} fill={e.c || C.pri} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Por Situação">
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={stats.sitChart} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                dataKey="v" paddingAngle={2} nameKey="n">
                {stats.sitChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"3px 8px", marginTop:4 }}>
            {stats.sitChart.map((e, i) => (
              <span key={e.n} style={{ fontSize:9, color:C.txs, display:"flex", alignItems:"center", gap:3 }}>
                <span style={{ width:7, height:7, borderRadius:2, background:PIE_COLORS[i%PIE_COLORS.length], display:"inline-block" }} />
                {e.n} ({e.v})
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Row 2: evolution + promotora ─────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10 }}>
        <Card title="Evolução por Data de Digitação">
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={stats.evolutionChart} margin={{ top:4, right:10, left:-22, bottom:0 }}>
              <defs>
                <linearGradient id="evGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.pri} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={C.pri} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} vertical={false} />
              <XAxis dataKey="n" tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="v" stroke={C.pri} strokeWidth={2} fill="url(#evGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Por Promotora">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={stats.promoChart} layout="vertical" margin={{ left:72, right:10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false} />
              <XAxis type="number" tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="n" tick={{ fontSize:9, fill:C.txs }} axisLine={false} tickLine={false} width={68} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="v" fill={C.prm} radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Row 3: motivos + matrizes ─────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
        <Card title="Motivos de Recusa / Pendência">
          {stats.motivosChart.length ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={stats.motivosChart} layout="vertical" margin={{ left:108, right:14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false} />
                <XAxis type="number" tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="n" tick={{ fontSize:9, fill:C.txs }} axisLine={false} tickLine={false} width={104} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="v" fill="#F87171" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign:"center", padding:"24px 0", color:C.txm, fontSize:11 }}>
              Sem motivos registrados
            </div>
          )}
        </Card>

        <Card title="Ranking de Matrizes">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.matrizChart} layout="vertical" margin={{ left:76, right:14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} horizontal={false} />
              <XAxis type="number" tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="n" tick={{ fontSize:9, fill:C.txs }} axisLine={false} tickLine={false} width={72} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="v" fill="#818CF8" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── PDV bar ──────────────────────────────────────── */}
      <Card title="Por Ponto de Venda">
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={stats.pdvChart} margin={{ top:4, right:14, left:0, bottom:16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.bdl} vertical={false} />
            <XAxis dataKey="n" tick={{ fontSize:9, fill:C.txs }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
            <YAxis tick={{ fontSize:9, fill:C.txm }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="v" fill="#22D3EE" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

    </div>
  );
}

// ── Sub-component: Stage Pill ─────────────────────────────────
function StagePill({ stage, count, pct, sc, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flex:"1 1 90px", background:sc.bg, borderRadius:9, padding:"10px 13px",
        cursor:"pointer", border:`1px solid ${sc.dt}22`, transition:"all .13s",
        transform: hov ? "translateY(-1px)" : "none", boxShadow: hov ? C.s2 : "none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5 }}>
        <span style={{ width:6, height:6, borderRadius:"50%", background:sc.dt }} />
        <span style={{ fontSize:9, fontWeight:600, color:sc.tx }}>{stage}</span>
      </div>
      <div style={{ fontSize:18, fontWeight:700, color:sc.tx }}>{count}</div>
      <div style={{ fontSize:8, color:sc.tx, opacity:.7, marginTop:1 }}>{pct}% total</div>
    </div>
  );
}
