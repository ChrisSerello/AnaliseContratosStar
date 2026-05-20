// ── ContractIQ · Utilities ───────────────────────────────────

// ── Formatters ───────────────────────────────────────────────
export const fmt$ = (v) => {
  const n = parseFloat(String(v || 0).replace(/[^\d.,]/g, "").replace(",", "."));
  if (!n || isNaN(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(n);
};

export const fmtN = (v) =>
  v != null ? new Intl.NumberFormat("pt-BR").format(v) : "—";

export const clip = (s, n = 20) =>
  s && s.length > n ? s.slice(0, n) + "…" : s || "—";

// ── String normalizer (strips accents, lowercase) ────────────
export const nrm = (s) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ── Stage Classifier ─────────────────────────────────────────
export function stageOf(record) {
  const s = nrm(record.situacao || "");
  const a = nrm(record.atividade || "");
  const m = nrm(record.motivo_recusa || "");

  if (/cancel|recus|negad|rejeit/.test(s + a)) return "Recusado";
  if (/liber|pago|pagament|desembolsa/.test(s + a)) return "Liberado";
  if (/finaliz|conclu|encerr|arquiv/.test(s + a)) return "Finalizado";
  if (/aprov|contrat/.test(s + a)) return "Aprovado";
  if (/pend/.test(s) || m.length > 3 || /pend|aguard/.test(a)) return "Pendente";
  if (/anali|verific|confer/.test(s + a)) return "Em Análise";
  return "Digitado";
}

// ── Column Mapper ────────────────────────────────────────────
// Each key maps to an array of column name variants (normalized).
export const COLUMN_VARIANTS = {
  nome_matriz:       ["nome matriz", "nomematriz", "matriz", "nome_matriz"],
  nome_promotora:    ["nome da promotora", "promotora", "nome_promotora", "nome promotora"],
  ponto_venda:       ["ponto de venda", "pdv", "loja", "ponto_venda"],
  situacao:          ["situacao", "situação", "status"],
  atividade:         ["atividade", "etapa", "fase"],
  motivo_recusa:     ["motivo da recusa", "motivo de recusa", "pendencia", "pendência", "motivo recusa", "motivo_recusa", "motivo", "Motivo Recusa/Pendência"],
  empregador:        ["empregador", "empresa", "orgao", "orgão", "órgão"],
  nome_cliente:      ["nome cliente", "cliente", "nome do cliente", "nome_cliente"],
  cpf_cnpj:          ["cpf/cnpj", "cpf", "cnpj", "documento", "cpf_cnpj"],
  telefone:          ["telefone celular", "celular", "telefone", "fone"],
  data_digitacao:    ["data digitacao", "data digitação", "data de digitação", "dt_digitacao", "data_digitacao"],
  data_movimentacao: ["data movimentacao", "data movimentação", "dt_movimentacao", "data_movimentacao"],
  valor_liberado:    ["valor liberado", "valor", "vl_liberado", "montante", "valor_liberado"],
};

/**
 * Given a list of raw column headers, returns a map of
 * { canonical_key: original_header_name }
 */
export function mapColumns(headers) {
  const mapped = {};
  headers.forEach((h) => {
    const hn = nrm(h);
    for (const [key, variants] of Object.entries(COLUMN_VARIANTS)) {
      if (variants.some((v) => nrm(v) === hn) || hn === key) {
        mapped[key] = h;
        break;
      }
    }
  });
  return mapped;
}

/** Returns canonical keys not present in a mapping result */
export function getMissingColumns(mapped) {
  return Object.keys(COLUMN_VARIANTS).filter((k) => !mapped[k]);
}

/** Transforms a raw row object into a normalised contract record */
export function rowToRecord(row, mapped, index) {
  const get = (k) => (mapped[k] ? row[mapped[k]] || "" : "");
  const situacao   = get("situacao");
  const atividade  = get("atividade");
  const motivo     = get("motivo_recusa");
  const valor      = parseFloat(String(get("valor_liberado")).replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
  const dtD        = get("data_digitacao");
  const dtM        = get("data_movimentacao");

  const parseDate = (str) => {
    // handles DD/MM/YYYY or YYYY-MM-DD
    if (!str) return new Date();
    const [a, b, c] = str.includes("/") ? str.split("/").reverse() : str.split("-");
    return new Date(`${a}-${b}-${c}`);
  };

  return {
    id: index + 1,
    nome_matriz:       get("nome_matriz"),
    nome_promotora:    get("nome_promotora"),
    ponto_venda:       get("ponto_venda"),
    situacao,
    atividade,
    motivo_recusa:     motivo,
    empregador:        get("empregador"),
    nome_cliente:      get("nome_cliente"),
    cpf_cnpj:          get("cpf_cnpj"),
    telefone:          get("telefone"),
    data_digitacao:    dtD,
    data_movimentacao: dtM,
    valor_liberado:    valor,
    estagio:           stageOf({ situacao, atividade, motivo_recusa: motivo }),
    _dtD:              parseDate(dtD),
    _dtM:              parseDate(dtM),
  };
}
