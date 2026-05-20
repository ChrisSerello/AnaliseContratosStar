import { useState } from "react";
import {
  LayoutDashboard, Upload, Table2, GitBranch, Settings, Bell, User, XCircle, TrendingUp,
} from "lucide-react";
import { C } from "../constants/design.js";
import { Btn } from "./Primitives.jsx";

// ── Sidebar ───────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",    Icon: LayoutDashboard },
  { id: "import",    label: "Importação",   Icon: Upload },
  { id: "records",   label: "Registros",    Icon: Table2 },
  { id: "stages",    label: "Estágios",     Icon: GitBranch },
  { id: "conversao", label: "Conversão", Icon: TrendingUp, accent2: true },
  { id: "recusados", label: "Recusados + IA", Icon: XCircle, accent: true },
  { id: "settings",  label: "Configurações", Icon: Settings },
];

export function Sidebar({ page, setPage, hasData }) {
  return (
    <div style={{ width:210, height:"100%", background:C.surf, borderRight:`1px solid ${C.bdr}`,
      display:"flex", flexDirection:"column", flexShrink:0 }}>

      {/* Brand */}
      <div style={{ padding:"14px 14px 11px", borderBottom:`1px solid ${C.bdl}`,
        display:"flex", alignItems:"center", gap:9 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:C.pri,
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          {/* spreadsheet icon */}
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:C.txt, letterSpacing:"-0.02em" }}>
            STARCARD
          </div>
          <div style={{ fontSize:9, color:C.txm, letterSpacing:"0.05em", textTransform:"uppercase", marginTop:1 }}>
            Análise de Contratos
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding:"10px 8px", flex:1 }}>
        {NAV_ITEMS.map(({ id, label, Icon, accent, accent2 }) => {
          const active   = page === id;
          const disabled = !hasData && !["import","settings"].includes(id);
          return (
            <NavItem key={id} id={id} label={label} Icon={Icon} accent={accent} accent2={accent2}
              active={active} disabled={disabled} onClick={() => !disabled && setPage(id)} />
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding:"10px 8px", borderTop:`1px solid ${C.bdl}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px" }}>
          <div style={{ width:26, height:26, borderRadius:"50%", background:C.prl,
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <User size={12} color={C.pri} />
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:C.txt }}>Operador</div>
            <div style={{ fontSize:9, color:C.txm }}>Administrador</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NavItem({ id, label, Icon, active, disabled, accent, accent2, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:7,
        marginBottom:1, cursor: disabled ? "not-allowed" : "pointer",
        background: active ? (accent ? "#FEF2F2" : accent2 ? "#F0FDF4" : C.prl) : hov && !disabled ? C.bg : "transparent",
        color: active ? (accent ? "#EF4444" : accent2 ? "#16A34A" : C.pri) : disabled ? C.txm : C.txs,
        fontWeight: active ? 600 : 400, fontSize:12, transition:"all .1s" }}>
      <Icon size={14} color={active ? (accent ? "#EF4444" : accent2 ? "#16A34A" : C.pri) : disabled ? C.txm : C.txs} />
      {label}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────
const PAGE_META = {
  dashboard: { title: "Dashboard",     sub: "Visão geral e análise dos contratos" },
  import:    { title: "Importação",    sub: "Upload e mapeamento de planilha" },
  records:   { title: "Registros",     sub: "Todos os contratos importados" },
  stages:    { title: "Estágios",      sub: "Distribuição operacional por etapa" },
  conversao: { title: "Conversão de Recusados", sub: "Kanban, fila priorizada e planos de contato" },
  recusados: { title: "Recusados + IA", sub: "Diagnóstico com IA por contrato e análise gerencial" },
  settings:  { title: "Configurações", sub: "Regras de classificação de estágios" },
};

export function Header({ page, hasData, onNewImport }) {
  const meta = PAGE_META[page] || { title: "", sub: "" };
  return (
    <div style={{ height:52, background:C.surf, borderBottom:`1px solid ${C.bdr}`,
      padding:"0 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
      <div>
        <h1 style={{ margin:0, fontSize:14, fontWeight:700, color:C.txt, letterSpacing:"-0.02em" }}>
          {meta.title}
        </h1>
        <p style={{ margin:0, fontSize:10, color:C.txs, marginTop:1 }}>{meta.sub}</p>
      </div>
      <div style={{ display:"flex", gap:7, alignItems:"center" }}>
        {hasData && page !== "import" && (
          <Btn variant="out" size="sm" icon={Upload} onClick={onNewImport}>Nova Importação</Btn>
        )}
        <div style={{ width:28, height:28, borderRadius:7, border:`1px solid ${C.bdr}`,
          display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Bell size={12} color={C.txs} />
        </div>
      </div>
    </div>
  );
}
