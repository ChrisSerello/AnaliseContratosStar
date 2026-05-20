import { useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { C, STAGE_STYLES, STAGES } from "../constants/design.js";
import { fmt$, clip } from "../utils/index.js";
import { Card, Btn } from "../components/Primitives.jsx";

// ── Stages Page ───────────────────────────────────────────────
export function StagesPage({ data, onFilterClick }) {
  const byStage = useMemo(() => {
    const m = Object.fromEntries(STAGES.map(s => [s, []]));
    data.forEach(r => { if (m[r.estagio]) m[r.estagio].push(r); });
    return m;
  }, [data]);

  return (
    <div style={{ padding:"14px 20px", overflowY:"auto", height:"100%" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:10 }}>
        {STAGES.map(stage => {
          const records = byStage[stage] || [];
          const sc      = STAGE_STYLES[stage];
          const total   = records.reduce((s, r) => s + (r.valor_liberado || 0), 0);
          return (
            <StageCard key={stage} stage={stage} sc={sc} records={records}
              totalValor={total} onViewAll={() => onFilterClick(stage)} />
          );
        })}
      </div>
    </div>
  );
}

function StageCard({ stage, sc, records, totalValor, onViewAll }) {
  return (
    <div style={{ background:C.surf, borderRadius:10, boxShadow:C.s1,
      border:`1px solid ${C.bdr}`, overflow:"hidden" }}>
      {/* Stage header */}
      <div style={{ background:sc.bg, padding:"11px 15px",
        borderBottom:`1px solid ${sc.dt}22`,
        display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:sc.dt }} />
          <span style={{ fontSize:12, fontWeight:700, color:sc.tx }}>{stage}</span>
        </div>
        <span style={{ fontSize:18, fontWeight:700, color:sc.tx }}>{records.length}</span>
      </div>

      {/* Content */}
      <div style={{ padding:"10px 15px" }}>
        {totalValor > 0 && (
          <div style={{ fontSize:10, color:C.txs, marginBottom:8 }}>
            Total: <b style={{ color:C.txt }}>{fmt$(totalValor)}</b>
          </div>
        )}
        {records.slice(0, 4).map(r => (
          <div key={r.id} style={{ padding:"5px 0", borderBottom:`1px solid ${C.bdl}`,
            display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:600, color:C.txt }}>{clip(r.nome_cliente, 18)}</div>
              <div style={{ fontSize:9, color:C.txm }}>{r.situacao} · {r.data_digitacao}</div>
            </div>
            {r.valor_liberado > 0 && (
              <span style={{ fontSize:10, fontWeight:600, color:C.pri }}>{fmt$(r.valor_liberado)}</span>
            )}
          </div>
        ))}
        {records.length > 4 && (
          <button onClick={onViewAll} style={{ width:"100%", marginTop:8, padding:"6px",
            borderRadius:6, border:`1px solid ${C.bdr}`, background:"transparent",
            cursor:"pointer", fontSize:10, color:C.txs, transition:"all .12s" }}
            onMouseEnter={e => { e.currentTarget.style.background = C.bg; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
            Ver todos ({records.length}) →
          </button>
        )}
        {records.length === 0 && (
          <div style={{ textAlign:"center", padding:"16px 0", color:C.txm, fontSize:11 }}>
            Nenhum contrato neste estágio
          </div>
        )}
      </div>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────
const DEFAULT_RULES = {
  "Recusado":    "cancel, recus, negad, rejeit",
  "Liberado":    "liber, pago, pagament, desembolsa",
  "Finalizado":  "finaliz, conclu, encerr, arquiv",
  "Aprovado":    "aprov, contrat",
  "Pendente":    "pend, aguard",
  "Em Análise":  "anali, verific, confer",
  "Digitado":    "(fallback automático — tudo restante)",
};

export function SettingsPage() {
  return (
    <div style={{ padding:"14px 20px", overflowY:"auto", height:"100%" }}>
      <Card title="Regras de Classificação de Estágios">
        <p style={{ margin:"0 0 13px", fontSize:11, color:C.txs }}>
          Configure as palavras-chave que determinam cada estágio. O sistema verifica os campos{" "}
          <b>Situação</b>, <b>Atividade</b> e <b>Motivo</b> (após normalização de acentos).
        </p>

        {STAGES.map(stage => {
          const sc = STAGE_STYLES[stage];
          return (
            <div key={stage} style={{ marginBottom:8, padding:"9px 12px", background:sc.bg,
              borderRadius:8, display:"flex", alignItems:"center", gap:9 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:sc.dt, flexShrink:0 }} />
              <span style={{ fontSize:11, fontWeight:600, color:sc.tx, width:88, flexShrink:0 }}>
                {stage}
              </span>
              <input
                defaultValue={DEFAULT_RULES[stage]}
                disabled={stage === "Digitado"}
                style={{ flex:1, padding:"5px 9px", borderRadius:6, border:`1px solid ${C.bdr}`,
                  background: stage === "Digitado" ? C.bg : C.surf,
                  fontSize:10, color:C.txt, outline:"none",
                  cursor: stage === "Digitado" ? "not-allowed" : "text",
                  opacity: stage === "Digitado" ? .6 : 1 }}
              />
            </div>
          );
        })}

        <div style={{ marginTop:12 }}>
          <Btn icon={CheckCircle}>Salvar Configurações</Btn>
        </div>
      </Card>

      <Card title="Sobre o Sistema" style={{ marginTop:10 }}>
        <div style={{ fontSize:11, color:C.txs, lineHeight:1.7 }}>
          <b style={{ color:C.txt }}>STARCARD</b> — Análise de contratos e propostas via importação de planilha.<br/>
          Versão 1.0 · Desenvolvido com React + Recharts + SheetJS + PapaParse.<br/><br/>
          <b style={{ color:C.txt }}>Campos obrigatórios:</b>{" "}
          Nome Matriz, Nome Promotora, Ponto de Venda, Situação, Atividade, Motivo da Recusa,
          Empregador, Nome Cliente, CPF/CNPJ, Telefone, Data Digitação, Data Movimentação, Valor Liberado.
        </div>
      </Card>
    </div>
  );
}
