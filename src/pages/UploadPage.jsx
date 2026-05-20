import { useState, useRef, useCallback } from "react";
import { Upload, CheckCircle, XCircle, AlertCircle, Zap } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { C } from "../constants/design.js";
import { COLUMN_VARIANTS, mapColumns, getMissingColumns, rowToRecord } from "../utils/index.js";
import { Card, Btn, Inp } from "../components/Primitives.jsx";
import { clip } from "../utils/index.js";

export function UploadPage({ onImport, onLoadDemo }) {
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [preview, setPreview] = useState(null); // { rows, headers, mapped, missing }
  const inputRef = useRef();

  const processRows = useCallback((rows) => {
    if (!rows.length) { setLoading(false); setError("Arquivo vazio."); return; }
    const headers = Object.keys(rows[0]);
    const mapped  = mapColumns(headers);
    const missing = getMissingColumns(mapped);
    setLoading(false);
    setPreview({ rows, headers, mapped, missing });
  }, []);

  const parseFile = useCallback((file) => {
    if (!file) return;
    setLoading(true); setError("");
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (r) => processRows(r.data),
        error:    (e) => { setLoading(false); setError("Erro ao ler CSV: " + e.message); },
      });
    } else if (["xlsx", "xls"].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const wb = XLSX.read(ev.target.result, { type: "array" });
          processRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }));
        } catch (e) { setLoading(false); setError("Erro ao ler Excel: " + e.message); }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setLoading(false); setError("Formato não suportado. Use .xlsx, .xls ou .csv");
    }
  }, [processRows]);

  const confirmImport = useCallback(() => {
    if (!preview) return;
    const records = preview.rows.map((row, i) => rowToRecord(row, preview.mapped, i));
    onImport(records);
    setPreview(null);
  }, [preview, onImport]);

  // ── Preview screen ──────────────────────────────────────────
  if (preview) return (
    <div style={{ padding:"18px 22px", overflowY:"auto", height:"100%" }}>
      <div style={{ marginBottom:14 }}>
        <h2 style={{ margin:0, fontSize:14, fontWeight:700, color:C.txt }}>Pré-visualização da Importação</h2>
        <p style={{ margin:"3px 0 0", fontSize:11, color:C.txs }}>
          {preview.rows.length} registros encontrados
        </p>
      </div>

      {preview.missing.length > 0 && (
        <div style={{ background:"#FEF9C3", border:"1px solid #FDE68A", borderRadius:9,
          padding:"9px 13px", marginBottom:12, display:"flex", gap:8, alignItems:"flex-start" }}>
          <AlertCircle size={13} color="#D97706" style={{ marginTop:1, flexShrink:0 }} />
          <div style={{ fontSize:11, color:"#92400E" }}>
            <b>Colunas não mapeadas:</b> {preview.missing.join(", ")}
          </div>
        </div>
      )}

      <Card title="Mapeamento de colunas" style={{ marginBottom:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
          {Object.entries(COLUMN_VARIANTS).map(([k]) => (
            <div key={k} style={{ display:"flex", alignItems:"center", gap:5,
              padding:"5px 8px", borderRadius:6, background:C.bg }}>
              {preview.mapped[k]
                ? <CheckCircle size={11} color="#22C55E" />
                : <XCircle    size={11} color="#EF4444" />}
              <span style={{ fontSize:9, color:C.txs }}>
                {k.replace(/_/g, " ")}
                {preview.mapped[k] && <span style={{ color:C.txm }}> ← {clip(preview.mapped[k], 13)}</span>}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Amostra — primeiros 5 registros" style={{ marginBottom:14 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>
                {preview.headers.slice(0, 7).map(h => (
                  <th key={h} style={{ padding:"6px 10px", background:C.bg,
                    borderBottom:`1px solid ${C.bdr}`, color:C.txs, fontWeight:600,
                    textAlign:"left", whiteSpace:"nowrap" }}>{clip(h, 13)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {preview.headers.slice(0, 7).map(h => (
                    <td key={h} style={{ padding:"6px 10px", borderBottom:`1px solid ${C.bdl}`,
                      color:C.txt, whiteSpace:"nowrap" }}>{clip(String(row[h] || "—"), 18)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div style={{ display:"flex", gap:8 }}>
        <Btn variant="out" onClick={() => setPreview(null)}>← Voltar</Btn>
        <Btn icon={CheckCircle} onClick={confirmImport}>
          Importar {preview.rows.length} registros
        </Btn>
      </div>
    </div>
  );

  // ── Upload screen ───────────────────────────────────────────
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      height:"100%", background:C.bg }}>
      <div style={{ width:460 }}>
        <div style={{ textAlign:"center", marginBottom:26 }}>
          <div style={{ width:54, height:54, borderRadius:13, background:C.prl,
            display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
            <Upload size={22} color={C.pri} />
          </div>
          <h2 style={{ margin:"0 0 6px", fontSize:19, fontWeight:700, color:C.txt,
            letterSpacing:"-0.02em" }}>Importar Planilha</h2>
          <p style={{ margin:0, fontSize:12, color:C.txs }}>
            Upload da planilha de contratos para iniciar a análise
          </p>
        </div>

        {error && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:9,
            padding:"10px 13px", marginBottom:13, display:"flex", gap:7, alignItems:"center" }}>
            <XCircle size={13} color="#EF4444" />
            <span style={{ fontSize:11, color:"#991B1B" }}>{error}</span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragEnter={() => setDrag(true)} onDragLeave={() => setDrag(false)}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); setDrag(false); parseFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current.click()}
          style={{ border:`2px dashed ${drag ? C.pri : C.bdr}`, borderRadius:12,
            padding:"32px 20px", textAlign:"center", cursor:"pointer",
            background: drag ? C.prl : C.surf, transition:"all .15s" }}>
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
            onChange={e => parseFile(e.target.files[0])} style={{ display:"none" }} />
          {loading ? (
            <div style={{ color:C.txs, fontSize:12 }}>Processando arquivo…</div>
          ) : (
            <>
              <Upload size={22} color={drag ? C.pri : C.txm}
                style={{ display:"block", margin:"0 auto 10px" }} />
              <div style={{ fontSize:13, fontWeight:600, color: drag ? C.pri : C.txt }}>
                {drag ? "Solte o arquivo aqui" : "Clique ou arraste sua planilha"}
              </div>
              <div style={{ fontSize:10, color:C.txm, marginTop:4 }}>
                Suporte para .xlsx, .xls e .csv
              </div>
            </>
          )}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, margin:"14px 0" }}>
          <div style={{ flex:1, height:1, background:C.bdr }} />
          <span style={{ fontSize:10, color:C.txm }}>ou</span>
          <div style={{ flex:1, height:1, background:C.bdr }} />
        </div>

        <Btn variant="out" onClick={onLoadDemo} style={{ width:"100%" }} icon={Zap}>
          Carregar dados de demonstração (75 contratos)
        </Btn>

        <div style={{ marginTop:14, padding:"12px 14px", background:C.alt,
          borderRadius:9, border:`1px solid ${C.bdl}` }}>
          <div style={{ fontSize:9, fontWeight:600, color:C.txs, marginBottom:7,
            textTransform:"uppercase", letterSpacing:"0.06em" }}>Colunas esperadas</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {Object.keys(COLUMN_VARIANTS).map(k => (
              <span key={k} style={{ fontSize:9, padding:"2px 7px", borderRadius:999,
                background:C.prl, color:C.prt, fontWeight:500 }}>
                {k.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
