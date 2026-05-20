import { stageOf } from "../utils/index.js";

const R  = (a) => a[Math.floor(Math.random() * a.length)];
const RI = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const RD = (s, e) => new Date(s.getTime() + Math.random() * (e.getTime() - s.getTime()));

const SITUACOES  = ["Aprovado","Pendente","Recusado","Em Análise","Digitado","Liberado","Finalizado","Cancelado"];
const ATIVIDADES = ["Formalização","Análise de Crédito","Aguardando Doc.","Aprovação Final","Pagamento Realizado","Arquivamento","Revisão","Pendência Cliente","Verificação","Contratação"];
const MOTIVOS    = ["Renda insuficiente","Documentação incompleta","Score baixo","CPF c/ restrição","Empregador n. conveniado","Prazo expirado","Cliente desistiu","Erro cadastral","Aguardando documentos"];
const MATRIZES   = ["Banco Alpha","Financeira Beta","Credbank","Banco Nexus","FinanCorp Brasil"];
const PROMOTORAS = ["Promotora Sul","Promotora Norte","Promotora Leste","Promotora Oeste","Central Promotora"];
const PDVS       = ["Agência Centro","Agência Zona Sul","Shopping Norte","Canal Digital","Parceiro Digital","Agência Leste"];
const EMPREGADORES = ["Prefeitura Municipal","Gov. do Estado","INSS","Empresa ABC","Empresa XYZ","Funcional Público","Setor Privado"];
const NOMES = [
  "Ana Silva","Carlos Mendes","Fernanda Costa","João Oliveira","Maria Santos","Pedro Rocha",
  "Lucia Ferreira","Roberto Lima","Patricia Nunes","Diego Martins","Camila Alves","Felipe Souza",
  "Juliana Pereira","André Castro","Beatriz Cardoso","Thiago Ribeiro","Amanda Torres","Marcelo Gomes",
  "Vanessa Dias","Rafael Correia","Isabela Pinto","Leonardo Araujo","Natalia Barbosa",
  "Eduardo Cavalcante","Mariana Freitas","Bruno Nascimento","Gabriela Moura","Henrique Fernandes",
  "Larissa Carvalho","Samuel Monteiro",
];

/**
 * Generates `n` realistic mock contract records for demonstration.
 */
export function generateMockData(n = 75) {
  const start = new Date("2024-01-01");
  const end   = new Date("2025-04-30");

  return Array.from({ length: n }, (_, i) => {
    const situacao  = R(SITUACOES);
    const atividade = R(ATIVIDADES);
    const needsMot  = ["Recusado","Pendente","Cancelado"].includes(situacao);
    const motivo    = needsMot ? R(MOTIVOS) : "";
    const dtD       = RD(start, end);
    const dtM       = new Date(dtD.getTime() + RI(0, 30) * 86_400_000);
    const valor     = ["Liberado","Aprovado","Finalizado"].includes(situacao) ? RI(3_000, 85_000)
                    : ["Recusado","Cancelado"].includes(situacao) ? 0
                    : RI(0, 50_000);

    return {
      id:                i + 1,
      nome_matriz:       R(MATRIZES),
      nome_promotora:    R(PROMOTORAS),
      ponto_venda:       R(PDVS),
      situacao,
      atividade,
      motivo_recusa:     motivo,
      empregador:        R(EMPREGADORES),
      nome_cliente:      R(NOMES),
      cpf_cnpj:          `${RI(100,999)}.${RI(100,999)}.${RI(100,999)}-${RI(10,99)}`,
      telefone:          `(${RI(11,99)}) 9${RI(1000,9999)}-${RI(1000,9999)}`,
      data_digitacao:    dtD.toLocaleDateString("pt-BR"),
      data_movimentacao: dtM.toLocaleDateString("pt-BR"),
      valor_liberado:    valor,
      estagio:           stageOf({ situacao, atividade, motivo_recusa: motivo }),
      _dtD:              dtD,
      _dtM:              dtM,
    };
  });
}

export const DEMO_DATA = generateMockData(75);
