import { useState, useMemo, useEffect } from "react";
import { Search, Download, Eye, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { C, STAGE_STYLES, STAGES } from "../constants/design.js";
import { fmt$, clip } from "../utils/index.js";
import { Badge, Btn, Inp, Sel } from "../components/Primitives.jsx";

const PER_PAGE = 13;

// ── Record Detail Modal ───────────────────────────────────────
export function RecordModal({ record, onClose }) {
  if (!record) return null;
  const fields = [
    ["ID",                `#${record.id}`],
    ["Cliente",           record.nome_cliente],
    ["CPF / CNPJ",        record.cpf_cnpj],
    ["Telefone",          record.telefone],
    ["Empregador",        record.empregador],
    ["Matriz",            record.nome_matriz],
    ["Promotora",         record.nome_promotora],
    ["Ponto de Venda",    record.ponto_venda],
    ["Situação",          record.situacao],
    ["Atividade",         record.atividade],
    ["Motivo / Pendência", record.motivo_recusa || "—"],
    ["Data Digitação",    record.data_digitacao],
    ["Data Movimentação", record.data_movimentacao],
  ];

  return (
    <div style={{ position:"absolute", inset:0, background:"rgba(28,31,36,0.4)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:200, backdropFilter:"blur(4px)" }}>
      <div style={{ background:C.surf, borderRadius:14, width:480, maxHeight:560,
        overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:C.s3 }}>

        {/* Header */}
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${C.bdl}`,
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.txt }}>Detalhe do Contrato</div>
            <div style={{ fontSize:10, color:C.txs, marginTop:1 }}>
              {record.nome_cliente} · #{record.id}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Badge stage={record.estagio} />
            <button onClick={onClose} style={{ width:24, height:24, borderRadius:"50%",
              border:`1px solid ${C.bdr}`, background:C.bg, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={11} color={C.txs} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"14px 18px", overflowY:"auto" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {fields.map(([label, value]) => (
              <div key={label} style={{ padding:"8px 10px", background:C.bg, borderRadius:7 }}>
                <div style={{ fontSize:9, color:C.txm, textTransform:"uppercase",
                  letterSpacing:"0.05em", marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:11, fontWeight:600, color:C.txt }}>{value || "—"}</div>
              </div>
            ))}
          </div>
          {record.valor_liberado > 0 && (
            <div style={{ marginTop:11, padding:"11px 14px", background:C.prl, borderRadius:9,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.prt }}>Valor Liberado</span>
              <span style={{ fontSize:17, fontWeight:700, color:C.pri }}>
                {fmt$(record.valor_liberado)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Records Page ──────────────────────────────────────────────
export function RecordsPage({ data, initialStage, onStageReset }) {
  const [query,       setQuery]       = useState("");
  const [filterStage, setFilterStage] = useState(initialStage || "");
  const [filterPromo, setFilterPromo] = useState("");
  const [filterMat,   setFilterMat]   = useState("");
  const [filterSit,   setFilterSit]   = useState("");
  const [page,        setPage]        = useState(1);
  const [sortCol,     setSortCol]     = useState("id");
  const [sortDir,     setSortDir]     = useState("asc");
  const [selected,    setSelected]    = useState(null);

  useEffect(() => { setFilterStage(initialStage || ""); }, [initialStage]);

  const promotoras = useMemo(() => [...new Set(data.map(r => r.nome_promotora))].sort(), [data]);
  const matrizes   = useMemo(() => [...new Set(data.map(r => r.nome_matriz))].sort(), [data]);
  const situacoes  = useMemo(() => [...new Set(data.map(r => r.situacao))].sort(), [data]);

  const filtered = useMemo(() => {
    return data
      .filter(r => {
        if (filterStage && r.estagio          !== filterStage) return false;
        if (filterPromo && r.nome_promotora   !== filterPromo) return false;
        if (filterMat   && r.nome_matriz       !== filterMat)   return false;
        if (filterSit   && r.situacao          !== filterSit)   return false;
        if (query) {
          const ql = query.toLowerCase();
          return [r.nome_cliente, r.cpf_cnpj, r.empregador, r.situacao, r.atividade, r.motivo_recusa]
            .some(v => v && String(v).toLowerCase().includes(ql));
        }
        return true;
      })
      .sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (sortCol === "valor_liberado") { va = +va; vb = +vb; }
        else { va = String(va || "").toLowerCase(); vb = String(vb || "").toLowerCase(); }
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [data, query, filterStage, filterPromo, filterMat, filterSit, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageRows   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const clearFilters = () => {
    setQuery(""); setFilterStage(""); setFilterPromo(""); setFilterMat(""); setFilterSit(""); setPage(1);
    if (onStageReset) onStageReset();
  };

  const exportCSV = () => {
    const header = "ID,Cliente,CPF,Matriz,Promotora,PDV,Estágio,Situação,Atividade,Motivo,Empregador,Digitação,Movimentação,Valor Lib.";
    const rows = filtered.map(r =>
      [r.id,r.nome_cliente,r.cpf_cnpj,r.nome_matriz,r.nome_promotora,r.ponto_venda,r.estagio,
       r.situacao,r.atividade,r.motivo_recusa||"",r.empregador,r.data_digitacao,r.data_movimentacao,r.valor_liberado].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "contratos_filtrados.csv"; a.click();
  };

  const COLUMNS = [
    { key:"id",              label:"#",         width:42 },
    { key:"nome_cliente",    label:"Cliente",   width:145 },
    { key:"nome_matriz",     label:"Matriz",    width:110 },
    { key:"nome_promotora",  label:"Promotora", width:110 },
    { key:"estagio",         label:"Estágio",   width:112 },
    { key:"situacao",        label:"Situação",  width:100 },
    { key:"data_digitacao",  label:"Digitação", width:88  },
    { key:"valor_liberado",  label:"Valor Lib.",width:100 },
    { key:"_eye",            label:"",          width:38  },
  ];

  const SortIcon = ({ col }) => sortCol !== col
    ? <ChevronDown size={9}  color={C.txm} />
    : sortDir === "asc"
      ? <ChevronUp   size={9} color={C.pri} />
      : <ChevronDown size={9} color={C.pri} />;

  const hasFilters = filterStage || filterPromo || filterMat || filterSit || query;

  return (
    <div style={{ padding:"14px 20px", height:"100%", display:"flex", flexDirection:"column",
      overflow:"hidden", position:"relative" }}>

      {selected && <RecordModal record={selected} onClose={() => setSelected(null)} />}

      {/* ── Filters bar ───── */}
      <div style={{ display:"flex", gap:7, marginBottom:10, flexWrap:"wrap", alignItems:"center", flexShrink:0 }}>
        <div style={{ flex:"1 1 190px" }}>
          <Inp icon={Search} placeholder="Buscar por cliente, CPF, atividade…"
            value={query} onChange={v => { setQuery(v); setPage(1); }} />
        </div>
        <Sel value={filterStage} onChange={v => { setFilterStage(v); setPage(1); }} options={STAGES}     placeholder="Estágio"  />
        <Sel value={filterPromo} onChange={v => { setFilterPromo(v); setPage(1); }} options={promotoras} placeholder="Promotora"/>
        <Sel value={filterMat}   onChange={v => { setFilterMat(v);   setPage(1); }} options={matrizes}   placeholder="Matriz"   />
        <Sel value={filterSit}   onChange={v => { setFilterSit(v);   setPage(1); }} options={situacoes}  placeholder="Situação" />
        {hasFilters && <Btn variant="ghost" size="sm" icon={X} onClick={clearFilters}>Limpar</Btn>}
        <Btn variant="out" size="sm" icon={Download} onClick={exportCSV}>Exportar</Btn>
      </div>

      <div style={{ fontSize:10, color:C.txs, marginBottom:8, flexShrink:0 }}>
        {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== data.length ? ` (de ${data.length} total)` : ""}
      </div>

      {/* ── Table ──────────── */}
      <div style={{ flex:1, overflow:"hidden", background:C.surf, borderRadius:10,
        boxShadow:C.s1, border:`1px solid ${C.bdr}`, display:"flex", flexDirection:"column" }}>

        <div style={{ flex:1, overflowY:"auto", overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ background:C.bg }}>
                {COLUMNS.map(c => (
                  <th key={c.key} onClick={() => c.key !== "_eye" && toggleSort(c.key)}
                    style={{ padding:"8px 12px", textAlign:"left", fontWeight:600, color:C.txs,
                      fontSize:9, letterSpacing:"0.04em", textTransform:"uppercase",
                      borderBottom:`1px solid ${C.bdr}`, cursor: c.key !== "_eye" ? "pointer" : "default",
                      userSelect:"none", minWidth:c.width, whiteSpace:"nowrap",
                      position:"sticky", top:0, background:C.bg }}>
                    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                      {c.label}
                      {c.key !== "_eye" && <SortIcon col={c.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={{ padding:"28px", textAlign:"center",
                    color:C.txm, fontSize:12 }}>Nenhum registro encontrado</td>
                </tr>
              ) : pageRows.map(r => <DataRow key={r.id} r={r} onSelect={setSelected} />)}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"9px 13px", borderTop:`1px solid ${C.bdl}`, flexShrink:0 }}>
            <span style={{ fontSize:10, color:C.txs }}>
              Pág. {page} de {totalPages} · {filtered.length} registros
            </span>
            <div style={{ display:"flex", gap:5 }}>
              <Btn variant="out" size="sm" icon={ChevronLeft}
                onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Ant.</Btn>
              <Btn variant="out" size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>
                Próx. <ChevronRight size={10} />
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: table row with hover state ─────────────────
function DataRow({ r, onSelect }) {
  const [hov, setHov] = useState(false);
  return (
    <tr onClick={() => onSelect(r)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ cursor:"pointer", borderBottom:`1px solid ${C.bdl}`,
        background: hov ? C.alt : "transparent", transition:"background .1s" }}>
      <td style={{ padding:"8px 12px", color:C.txm, fontSize:10 }}>#{r.id}</td>
      <td style={{ padding:"8px 12px" }}>
        <div style={{ fontWeight:600, color:C.txt, fontSize:11 }}>{clip(r.nome_cliente, 16)}</div>
        <div style={{ fontSize:9, color:C.txm, marginTop:1 }}>{r.cpf_cnpj}</div>
      </td>
      <td style={{ padding:"8px 12px", color:C.txs, fontSize:10 }}>{clip(r.nome_matriz, 14)}</td>
      <td style={{ padding:"8px 12px", color:C.txs, fontSize:10 }}>{clip(r.nome_promotora, 14)}</td>
      <td style={{ padding:"8px 12px" }}><Badge stage={r.estagio} /></td>
      <td style={{ padding:"8px 12px", color:C.txs, fontSize:10 }}>{clip(r.situacao, 13)}</td>
      <td style={{ padding:"8px 12px", color:C.txs, fontSize:10, whiteSpace:"nowrap" }}>{r.data_digitacao}</td>
      <td style={{ padding:"8px 12px", fontWeight:600, fontSize:11, whiteSpace:"nowrap",
        color: r.valor_liberado > 0 ? C.pri : C.txm }}>
        {r.valor_liberado > 0 ? fmt$(r.valor_liberado) : "—"}
      </td>
      <td style={{ padding:"8px 12px" }}>
        <div style={{ width:24, height:24, borderRadius:6, border:`1px solid ${C.bdr}`,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Eye size={11} color={C.txs} />
        </div>
      </td>
    </tr>
  );
}
