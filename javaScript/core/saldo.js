// Tabela padrão de valores
const VALORES_PECAS = {
  p: 1, // Peão
  n: 3, // Cavalo
  b: 3, // Bispo
  r: 5, // Torre
  q: 9  // Dama
};

/**
 * Calcula o saldo material com base nos arrays de peças capturadas.
 * @param {Array<string>} capturadasPelaIA - Peças capturadas pela IA (ex: ['p', 'n'])
 * @param {Array<string>} capturadasPeloJogador - Peças capturadas pelo Jogador (ex: ['p', 'r'])
 * @returns {object} Pontos totais e vantagem relativa de cada lado
 */
export function calcularSaldoPorCapturas(capturadasPelaIA = [], capturadasPeloJogador = []) {
  // Soma os pontos acumulados por cada lado
  const pontosIA = capturadasPelaIA.reduce((acc, peca) => {
    const tipo = peca.toLowerCase();
    return acc + (VALORES_PECAS[tipo] || 0);
  }, 0);

  const pontosJogador = capturadasPeloJogador.reduce((acc, peca) => {
    const tipo = peca.toLowerCase();
    return acc + (VALORES_PECAS[tipo] || 0);
  }, 0);

  // Calcula a diferença líquida de vantagem
  const saldo = pontosIA - pontosJogador;

  return {
    pontosIA,
    pontosJogador,
    saldo,
    vantagemIA: saldo > 0 ? saldo : 0,         
    vantagemJogador: saldo < 0 ? Math.abs(saldo) : 0 
  };
}