import { useState } from "react";
import { C, STAGE_STYLES } from "../constants/design.js";

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ stage }) {
  const s = STAGE_STYLES[stage] || { bg: "#F3F4F6", tx: "#374151", dt: "#9CA3AF" };
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px",
      borderRadius:999, fontSize:10, fontWeight:600, background:s.bg, color:s.tx, whiteSpace:"nowrap",
      letterSpacing:"0.01em" }}>
      <span style={{ width:5, height:5, borderRadius:"50%", background:s.dt, flexShrink:0 }} />
      {stage}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
export function Kpi({ icon: Icon, label, value, accent, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:C.surf, borderRadius:10, padding:"15px 16px",
        boxShadow: hov && onClick ? C.s2 : C.s1, border:`1px solid ${C.bdr}`,
        cursor: onClick ? "pointer" : "default",
        transition:"all .15s", transform: hov && onClick ? "translateY(-1px)" : "none" }}>
      <div style={{ width:28, height:28, borderRadius:7, background:C.prl,
        display:"flex", alignItems:"center", justifyContent:"center", marginBottom:10 }}>
        <Icon size={13} color={C.pri} />
      </div>
      <div style={{ fontSize:20, fontWeight:700, color: accent || C.txt,
        lineHeight:1, marginBottom:3, letterSpacing:"-0.02em" }}>{value}</div>
      <div style={{ fontSize:10, color:C.txs }}>{label}</div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, title, action, style: cs }) {
  return (
    <div style={{ background:C.surf, borderRadius:10, boxShadow:C.s1, border:`1px solid ${C.bdr}`, ...cs }}>
      {title && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"12px 16px", borderBottom:`1px solid ${C.bdl}` }}>
          <span style={{ fontSize:11, fontWeight:600, color:C.txt, letterSpacing:"-0.01em" }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{ padding:"14px 16px" }}>{children}</div>
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────
export function Btn({ children, variant = "pri", onClick, size = "md", icon: Icon, disabled }) {
  const [hov, setHov] = useState(false);
  const sm = size === "sm", out = variant === "out", gh = variant === "ghost";
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:5,
        padding: sm ? "5px 10px" : "8px 15px",
        borderRadius:7, fontSize: sm ? 10 : 12, fontWeight:600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
        transition:"all .12s",
        border: out ? `1px solid ${C.bdr}` : "none",
        background: gh ? "transparent" : out ? (hov ? C.alt : C.surf) : (hov ? C.prh : C.pri),
        color: gh || out ? C.txt : "#fff" }}>
      {Icon && <Icon size={12} />}
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────
export function Inp({ placeholder, value, onChange, icon: Icon }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
      {Icon && <Icon size={12} color={C.txm}
        style={{ position:"absolute", left:9, pointerEvents:"none" }} />}
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{ width:"100%",
          padding: `7px ${Icon ? "28px" : "11px"} 7px ${Icon ? "28px" : "11px"}`,
          borderRadius:7, border:`1px solid ${foc ? C.pri : C.bdr}`,
          background:C.surf, fontSize:11, color:C.txt, outline:"none",
          boxShadow: foc ? `0 0 0 3px ${C.prl}` : "none", transition:"all .12s" }} />
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────
export function Sel({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position:"relative" }}>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ appearance:"none", padding:"7px 26px 7px 10px", borderRadius:7, fontSize:11,
          border:`1px solid ${C.bdr}`, background:C.surf,
          color: value ? C.txt : C.txm, cursor:"pointer", outline:"none" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {/* chevron */}
      <svg viewBox="0 0 24 24" width={10} height={10}
        style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", fill:"none", stroke:C.txm, strokeWidth:2.5 }}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

// ── Chart Tooltip ─────────────────────────────────────────────
export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.surf, border:`1px solid ${C.bdr}`, borderRadius:7,
      padding:"8px 11px", boxShadow:C.s2, fontSize:11 }}>
      {label && <div style={{ fontWeight:600, color:C.txt, marginBottom:3 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color:C.txs }}>
          <span style={{ color: p.fill || p.stroke || C.pri, fontWeight:600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
