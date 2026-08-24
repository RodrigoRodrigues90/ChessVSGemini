/**
 * Converte coordenadas da matriz (linha 0-7, coluna 0-7) para notação algébrica (ex: e4, a8).
 */
export function coordParaAlgebraico(linha, coluna) {
    const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const linhaAlgebraica = 8 - linha;
    return `${colunas[coluna]}${linhaAlgebraica}`;
}

/**
 * Converte notação algébrica (ex: "e4") para coordenadas da matriz { linha, coluna }.
 */
export function algebraicoParaCoord(posicao) {
    const colunas = { 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'e': 4, 'f': 5, 'g': 6, 'h': 7 };
    const col = colunas[posicao[0].toLowerCase()];
    const lin = 8 - parseInt(posicao[1], 10);
    return { linha: lin, coluna: col };
}

/**
 * Gera a notação FEN (Forsyth-Edwards Notation) completa a partir do estado do tabuleiro.
 * @param {Tabuleiro} jogoInstancia - Instância da classe Tabuleiro
 * @param {number} meioLances - Contador de meio-lances para a regra dos 50 movimentos (padrão: 0)
 * @param {number} numeroLances - Número do lance atual (inicia em 1 e incrementa após a jogada das Pretas)
 * @returns {string} FEN correspondente
 */
export function gerarFEN(jogoInstancia, meioLances = 0, numeroLances = 1) {
    let fen = '';

    // 1. Posições das peças no grid
    for (let l = 0; l < 8; l++) {
        let vazios = 0;
        for (let c = 0; c < 8; c++) {
            const peca = jogoInstancia.grid[l][c];
            if (peca === '') {
                vazios++;
            } else {
                if (vazios > 0) {
                    fen += vazios;
                    vazios = 0;
                }
                fen += peca;
            }
        }
        if (vazios > 0) {
            fen += vazios;
        }
        if (l < 7) {
            fen += '/';
        }
    }

    // 2. Vez do jogador ('w' ou 'b')
    fen += ` ${jogoInstancia.turno}`;

    // 3. Direitos de Roque
    let roqueStr = '';
    const dW = jogoInstancia.direitosRoque.w;
    const dB = jogoInstancia.direitosRoque.b;

    if (!dW.reiMoveu) {
        if (!dW.torreKMoveu) roqueStr += 'K';
        if (!dW.torreQMoveu) roqueStr += 'Q';
    }
    if (!dB.reiMoveu) {
        if (!dB.torreKMoveu) roqueStr += 'k';
        if (!dB.torreQMoveu) roqueStr += 'q';
    }

    fen += ` ${roqueStr || '-'}`;

    // 4. Casa alvo do En Passant
    if (jogoInstancia.alvoEnPassant) {
        const casaEnPassant = coordParaAlgebraico(
            jogoInstancia.alvoEnPassant.linha,
            jogoInstancia.alvoEnPassant.coluna
        );
        fen += ` ${casaEnPassant}`;
    } else {
        fen += ' -';
    }

    // 5. Relógio de meio-lances (regra dos 50 movimentos) e Número do lance
    fen += ` ${meioLances} ${numeroLances}`;

    return fen;
}

/**
 * Renderiza ou atualiza as coordenadas nas bordas do tabuleiro conforme a perspectiva do jogador.
 * @param {HTMLElement} domTabuleiro - Elemento container do tabuleiro
 * @param {string} corJogador - 'w' para Brancas ou 'b' para Pretas
 */
export function desenharCoordenadas(domTabuleiro, corJogador = 'w') {
    const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    const casas = domTabuleiro.querySelectorAll('.casa');
    casas.forEach(casa => {
        const l = parseInt(casa.dataset.linha, 10);
        const c = parseInt(casa.dataset.coluna, 10);

        // Limpa rótulos antigos
        const rotulosAntigos = casa.querySelectorAll('.rotulo-coordenada');
        rotulosAntigos.forEach(r => r.remove());

        // Define quais índices correspondem à borda esquerda e borda inferior na tela
        const ehBordaEsquerda = (corJogador === 'w' && c === 0) || (corJogador === 'b' && c === 7);
        const ehBordaInferior = (corJogador === 'w' && l === 7) || (corJogador === 'b' && l === 0);

        // 1. Desenha o número da linha na borda esquerda da tela
        if (ehBordaEsquerda) {
            const rotuloLinha = document.createElement('span');
            rotuloLinha.classList.add('rotulo-coordenada', 'rotulo-linha');
            rotuloLinha.textContent = 8 - l; // O número da casa é mantido real (1 a 8)
            casa.appendChild(rotuloLinha);
        }

        // 2. Desenha a letra da coluna na borda inferior da tela
        if (ehBordaInferior) {
            const rotuloColuna = document.createElement('span');
            rotuloColuna.classList.add('rotulo-coordenada', 'rotulo-coluna');
            rotuloColuna.textContent = colunas[c]; // A letra real da coluna ('a' a 'h')
            casa.appendChild(rotuloColuna);
        }
    });
}
/**
 * Converte coordenadas (linha, coluna) de matriz 0-7 para notação UCI (ex: linha 6, col 4 -> 'e2')
 */
export function converterParaUCI(linha, coluna) {
    const colunas = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fileira = 8 - linha;
    return `${colunas[coluna]}${fileira}`;
}