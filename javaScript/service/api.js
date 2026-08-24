const BASE_URL = 'https://chess-stockfish-iota.vercel.app';
//const BASE_URL = 'http://localhost:3000';

/**
 * Envia o FEN atual para o Stockfish e retorna o movimento calculado.
 * @param {string} fen - Notação FEN do tabuleiro atual
 * @param {number} level - Profundidade de análise do Stockfish
 * @returns {Promise<{movimento: string, ismate?: string}>}
 */
export async function obterJogadaStockfish(fen, level = 12, historicoLista) {
    try {
        const response = await fetch(`${BASE_URL}/api/jogada-ia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen, level , historico: historicoLista})
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Falha ao comunicar com o backend do Stockfish:", error);
        return null;
    }
}
