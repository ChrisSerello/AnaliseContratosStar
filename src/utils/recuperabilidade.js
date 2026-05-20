// ─────────────────────────────────────────────────────────────────
// MOTOR DE RECUPERABILIDADE — 100% local, sem API
// Classifica cada recusado por potencial de conversão e gera plano
// ─────────────────────────────────────────────────────────────────

const nrm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// ── Regras por motivo de recusa ────────────────────────────────
const REGRAS = [
  {
    match: s => /document|doc incompleto|doc.*falta|falta.*doc|comprovante/.test(s),
    score: 90,
    nivel: "Alta",
    cor: "#22C55E",
    prazo: "1–3 dias",
    categoria: "Documental",
    resumo: "Recusa operacional — sem reflexo no perfil de crédito. Resolução rápida.",
    script: (r) => [
      `Oi ${r.nome_cliente?.split(" ")[0]}, tudo bem? Aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `Sua proposta de empréstimo estava quase aprovada! Só precisamos de um documento que ficou faltando.`,
      `Você consegue nos enviar agora por WhatsApp? Assim a gente já resubmete hoje mesmo.`,
    ],
    acoes: [
      "Ligar imediatamente — alta chance de fechamento no mesmo contato",
      "Solicitar documento específico por WhatsApp com foto de referência",
      "Resubmeter proposta assim que receber — sem nova análise de crédito",
      "Se não atender, tentar novamente em 2h e ao fim do dia",
    ],
  },
  {
    match: s => /renda insuf|renda baixa|renda nao|margem/.test(s),
    score: 55,
    nivel: "Média",
    cor: "#F97316",
    prazo: "7–15 dias",
    categoria: "Financeiro",
    resumo: "Cliente com interesse mas margem insuficiente. Propor valor menor ou aguardar abertura de margem.",
    script: (r) => [
      `Olá ${r.nome_cliente?.split(" ")[0]}! Aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `Não conseguimos aprovar o valor total que você pediu, mas tenho uma boa notícia: consigo te ajudar com um valor menor que cabe na sua margem disponível.`,
      `Posso fazer uma simulação rápida pra você? Leva só 2 minutinhos.`,
    ],
    acoes: [
      "Simular valor menor compatível com margem disponível",
      "Verificar se há contratos ativos para portabilidade que liberam margem",
      "Apresentar opção de prazo maior para reduzir parcela",
      "Reconsultar margem em 30 dias — pode ter abertura por reajuste salarial",
    ],
  },
  {
    match: s => /score|pontuacao|credito baixo/.test(s),
    score: 40,
    nivel: "Média",
    cor: "#F97316",
    prazo: "30–60 dias",
    categoria: "Score",
    resumo: "Score abaixo do mínimo. Ação de longo prazo — orientar melhoria e reagendar.",
    script: (r) => [
      `Olá ${r.nome_cliente?.split(" ")[0]}, aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `A gente tentou liberar seu empréstimo mas o sistema apontou um bloqueio no seu histórico de crédito.`,
      `Vou te passar o que você precisa fazer pra resolver isso e eu já agendo seu retorno para a gente tentar de novo daqui a 45 dias. Topa?`,
    ],
    acoes: [
      "Orientar consulta gratuita ao Serasa Score (serasa.com.br)",
      "Enviar checklist de ações para melhoria de score por WhatsApp",
      "Agendar retorno em 45–60 dias no calendário",
      "Oferecer produto alternativo sem consulta ao bureau enquanto isso",
    ],
  },
  {
    match: s => /cpf.*restricao|restricao.*cpf|spc|serasa|negativad|pendencia.*cadastral/.test(s),
    score: 25,
    nivel: "Baixa",
    cor: "#EF4444",
    prazo: "60–90 dias",
    categoria: "CPF Restrito",
    resumo: "Restrição ativa no CPF. Necessária regularização antes de nova tentativa.",
    script: (r) => [
      `Olá ${r.nome_cliente?.split(" ")[0]}, aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `Infelizmente seu CPF tem uma pendência que bloqueou a proposta. A boa notícia é que isso tem solução.`,
      `Posso te orientar como regularizar de graça pelo site do Serasa. Você tem uns 3 minutinhos agora?`,
    ],
    acoes: [
      "Orientar regularização via Serasa Consumidor (gratuito) ou Acordo Certo",
      "Solicitar comprovante de quitação após regularização",
      "Reagendar proposta para 15 dias após confirmação de limpeza do CPF",
      "Monitorar e entrar em contato proativamente quando CPF ficar limpo",
    ],
  },
  {
    match: s => /empregador nao conv|orgao nao conv|sem convenio|convenio/.test(s),
    score: 20,
    nivel: "Baixa",
    cor: "#EF4444",
    prazo: "Indefinido",
    categoria: "Sem Convênio",
    resumo: "Empregador sem convênio ativo. Depende de negociação comercial ou produto alternativo.",
    script: (r) => [
      `Olá ${r.nome_cliente?.split(" ")[0]}, aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `Infelizmente ainda não temos convênio com ${r.empregador || "seu empregador"}, mas tenho outras opções de crédito que podem te atender.`,
      `Posso te apresentar uma alternativa que não precisa de desconto em folha?`,
    ],
    acoes: [
      "Oferecer produto de crédito pessoal como alternativa imediata",
      "Registrar empregador para análise comercial de conveniamento",
      "Verificar se cliente tem outro vínculo (aposentadoria, pensão INSS)",
      "Acompanhar inclusão de convênio e notificar cliente quando disponível",
    ],
  },
  {
    match: s => /comprometimento|limite.*renda|renda.*limite|35%|30%/.test(s),
    score: 45,
    nivel: "Média",
    cor: "#F97316",
    prazo: "15–30 dias",
    categoria: "Margem Comprometida",
    resumo: "Margem consignável esgotada. Portabilidade ou redução de valor podem resolver.",
    script: (r) => [
      `Olá ${r.nome_cliente?.split(" ")[0]}, aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `Sua margem disponível já está sendo usada em outros contratos, mas posso fazer uma análise de portabilidade que pode te dar um valor maior com parcela menor.`,
      `Você já ouviu falar de portabilidade de crédito? Posso te explicar em 2 minutos.`,
    ],
    acoes: [
      "Analisar contratos ativos para identificar oportunidade de portabilidade",
      "Simular unificação de dívidas para reduzir parcela total e abrir margem",
      "Verificar prazo de término de contratos vigentes para nova abordagem",
      "Propor refinanciamento que libere margem para o novo crédito",
    ],
  },
  {
    match: s => /redigitad|redigit/.test(s),
    score: 70,
    nivel: "Alta",
    cor: "#22C55E",
    prazo: "1–5 dias",
    categoria: "Operacional",
    resumo: "Proposta redigitada — verificar se há duplicidade ou erro operacional. Alta chance de aprovação.",
    script: (r) => [
      `Olá ${r.nome_cliente?.split(" ")[0]}, aqui é da ${r.nome_promotora || "nossa equipe"}.`,
      `Sua proposta apareceu como redigitação no sistema. Preciso confirmar alguns dados com você para evitar duplicidade e garantir a aprovação.`,
      `Tudo bem confirmar agora? Leva menos de 1 minuto.`,
    ],
    acoes: [
      "Verificar se existe proposta duplicada no sistema",
      "Confirmar dados do cliente para garantir unicidade",
      "Cancelar proposta anterior se necessário e resubmeter corretamente",
      "Priorizar — alta probabilidade de aprovação após correção",
    ],
  },
];

const REGRA_DEFAULT = {
  score: 35,
  nivel: "Baixa",
  cor: "#94A3B8",
  prazo: "A definir",
  categoria: "Outros",
  resumo: "Motivo não mapeado. Requer análise manual do operador.",
  script: (r) => [
    `Olá ${r.nome_cliente?.split(" ")[0]}, aqui é da ${r.nome_promotora || "nossa equipe"}.`,
    `Notei que sua proposta não foi aprovada e gostaria de entender melhor o que aconteceu para te ajudar.`,
    `Você tem um minutinho para conversarmos?`,
  ],
  acoes: [
    "Consultar histórico completo da proposta no sistema",
    "Verificar com a matriz o motivo detalhado da recusa",
    "Avaliar manualmente as condições do cliente",
    "Definir próxima ação com base na análise interna",
  ],
};

export function calcScore(record) {
  const m = nrm(record.motivo_recusa || "");
  const regra = REGRAS.find(r => r.match(m)) || REGRA_DEFAULT;

  // Ajustes contextuais no score
  let score = regra.score;
  const valor = record.valor_liberado || 0;
  if (valor > 0 && valor <= 8000)  score = Math.min(100, score + 8);
  if (valor > 30000)               score = Math.max(0,   score - 10);

  const dias = record._dtD instanceof Date && !isNaN(record._dtD)
    ? Math.floor((Date.now() - record._dtD.getTime()) / 86400000)
    : 0;
  if (dias > 90)  score = Math.max(0, score - 15);
  if (dias < 10)  score = Math.min(100, score + 5);

  return {
    score: Math.round(score),
    nivel: regra.nivel,
    cor: regra.cor,
    prazo: regra.prazo,
    categoria: regra.categoria,
    resumo: regra.resumo,
    script: regra.script(record),
    acoes: regra.acoes,
    diasDesdeRecusa: dias,
  };
}

export function calcBatchStats(records) {
  const scored = records.map(r => ({ ...r, _score: calcScore(r) }));
  const totValor = records.reduce((a, r) => a + (r.valor_liberado || 0), 0);
  const alta   = scored.filter(r => r._score.nivel === "Alta");
  const media  = scored.filter(r => r._score.nivel === "Média");
  const baixa  = scored.filter(r => r._score.nivel === "Baixa");
  const valorRecuperavel = alta.reduce((a, r) => a + (r.valor_liberado || 0), 0)
    + media.reduce((a, r) => a + (r.valor_liberado || 0), 0) * 0.4;
  return { scored, alta, media, baixa, totValor, valorRecuperavel };
}
