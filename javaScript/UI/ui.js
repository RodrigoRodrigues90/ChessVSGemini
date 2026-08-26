import { desenharCoordenadas, algebraicoParaCoord } from '../core/notations.js';

export const UNICODE_PECAS = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟'
};

const DOM_TABULEIRO = document.getElementById('tabuleiro');
const painelPecasJogador = document.getElementById('pecas-capturadas-jogador');
const painelPecasIA = document.getElementById('pecas-capturadas-ia');
const Elemento_SaldoIA = document.getElementById('saldo-ia');
const Elemento_SaldoJogador = document.getElementById('saldo-jogador');

export function renderizarTabuleiro(jogo, corJogador, casaSelecionada, movimentosPossiveis, ultimoLance, aoClicarCasa) {
    // 1. CAPTURA A POSIÇÃO DA PEÇA DE ORIGEM ANTES DE LIMPAR O DOM
    let rectOrigem = null;
    if (ultimoLance && ultimoLance.origem) {
        const { linha, coluna } = ultimoLance.origem;
        const elPecaAntiga = DOM_TABULEIRO.querySelector(`.casa[data-linha="${linha}"][data-coluna="${coluna}"] .peca`);
        if (elPecaAntiga) {
            rectOrigem = elPecaAntiga.getBoundingClientRect();
        }
    }

    DOM_TABULEIRO.innerHTML = '';

    const linhas = corJogador === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const colunas = corJogador === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

    const reiEmxeque = jogo.estaEmXeque(jogo.turno);
    let casaRei = null;

    if (reiEmxeque) {
        const reiAtacado = jogo.turno === 'w' ? 'K' : 'k';
        for (let linha = 0; linha < 8; linha++) {
            for (let coluna = 0; coluna < 8; coluna++) {
                if (jogo.obterPeca(linha, coluna) === reiAtacado) {
                    casaRei = { linha, coluna };
                    break;
                }
            }
            if (casaRei) break;
        }
    }

    for (let linha of linhas) {
        for (let coluna of colunas) {
            const casa = document.createElement('div');
            casa.classList.add('casa');
            casa.classList.add((linha + coluna) % 2 === 0 ? 'clara' : 'escura');

            casa.dataset.linha = linha;
            casa.dataset.coluna = coluna;

            if (casaSelecionada && casaSelecionada.linha === linha && casaSelecionada.coluna === coluna) {
                casa.classList.add('selecionada');
            }

            if (ultimoLance) {
                const ehOrigem = ultimoLance.origem.linha === linha && ultimoLance.origem.coluna === coluna;
                const ehDestino = ultimoLance.destino.linha === linha && ultimoLance.destino.coluna === coluna;
                if (ehOrigem) casa.classList.add('casa-origem');
                if (ehDestino) casa.classList.add('casa-destino');
            }

            if (reiEmxeque && casaRei && casaRei.linha === linha && casaRei.coluna === coluna) {
                casa.classList.add('reiemxeque');
            }

            const ehMovimentoValido = movimentosPossiveis?.some(m => m.linha === linha && m.coluna === coluna);
            if (ehMovimentoValido) {
                const indicador = document.createElement('div');
                indicador.classList.add('indicador-movimento');
                casa.appendChild(indicador);
            }

            const codigoPeca = jogo.obterPeca(linha, coluna);
            if (codigoPeca) {
                const peca = document.createElement('span');
                peca.classList.add('peca', codigoPeca === codigoPeca.toUpperCase() ? 'branca' : 'preta');
                peca.textContent = UNICODE_PECAS[codigoPeca];
                casa.appendChild(peca);
            }

            casa.addEventListener('click', () => {
                if (typeof aoClicarCasa === 'function') {
                    aoClicarCasa(linha, coluna);
                }
            });
            DOM_TABULEIRO.appendChild(casa);
        }
    }
    desenharCoordenadas(DOM_TABULEIRO, corJogador);

    // 2. DISPARA A ANIMAÇÃO DA PEÇA NA CASA DE DESTINO APÓS A RENDERIZAÇÃO
    if (rectOrigem && ultimoLance && ultimoLance.destino) {
        const { linha, coluna } = ultimoLance.destino;
        const elPecaNova = DOM_TABULEIRO.querySelector(`.casa[data-linha="${linha}"][data-coluna="${coluna}"] .peca`);

        if (elPecaNova) {
            animarMovimentoPeca(elPecaNova, rectOrigem);
        }
    }
}

export function renderizarPecasCapturadas(capturadasPeloJogador, capturadasPelaIA, saldoJogador, saldoIA) {
    if (painelPecasJogador) {
        painelPecasJogador.innerHTML = capturadasPeloJogador
            .map(p => `<span class="peca-capturada">${UNICODE_PECAS[p]}</span>`)
            .join('');
    }
    if (painelPecasIA) {
        painelPecasIA.innerHTML = capturadasPelaIA
            .map(p => `<span class="peca-capturada">${UNICODE_PECAS[p]}</span>`)
            .join('');
    }
    if (Elemento_SaldoIA && Elemento_SaldoJogador) {
        Elemento_SaldoIA.textContent = saldoIA > 0 ? `+${saldoIA}` : '';
        Elemento_SaldoJogador.textContent = saldoJogador > 0 ? `+${saldoJogador}` : '';
    }
}
/**
 * Anima o movimento de uma peça entre duas posições do DOM
 * @param {HTMLElement} elPeca - Elemento DOM da peça renderizada no destino
 * @param {DOMRect} rectOrigem - Posição inicial (getBoundingClientRect) da peça
 */
export function animarMovimentoPeca(elPeca, rectOrigem) {
    if (!elPeca || !rectOrigem) return;

    const rectDestino = elPeca.getBoundingClientRect();
    const deltaX = rectOrigem.left - rectDestino.left;
    const deltaY = rectOrigem.top - rectDestino.top;

    if (deltaX === 0 && deltaY === 0) return;

    // 1. Posição inicial visual
    elPeca.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    elPeca.style.transition = 'none';

    elPeca.offsetHeight; // Força reflow

    // 2. Transição de movimento
    elPeca.classList.add('peca-animando');
    elPeca.style.transform = 'translate(0, 0)';

    // 3. Ao chegar no destino: limpa o deslize e aplica o impacto na PEÇA
    elPeca.addEventListener('transitionend', () => {
        elPeca.classList.remove('peca-animando');
        elPeca.style.transform = '';
        elPeca.style.transition = '';

        // Dispara a tremida de impacto direto na peça movida
        dispararImpactoNaPeca(elPeca);
    }, { once: true });
}

function dispararImpactoNaPeca(elPeca) {
    if (!elPeca) return;

    elPeca.classList.remove('impacto-peca');
    elPeca.offsetHeight; // Força reflow para reativar a animação
    elPeca.classList.add('impacto-peca');

    setTimeout(() => {
        elPeca.classList.remove('impacto-peca');
    }, 200);
}

/**
 * Desenha uma seta SVG sobre o tabuleiro indicando a origem e destino do movimento.
 * @param {string} uci - Movimento no formato "e2e4"
 * @param {string} perspectiva - 'w' para brancas em baixo, 'b' para pretas em baixo
 */
export function desenharSetaOrientacao(uci, perspectiva = 'w') {
    const elTabuleiro = document.getElementById('tabuleiro');
    if (!elTabuleiro || !uci || uci.length < 4) return;

    removerSetaOrientacao();

    const orig = algebraicoParaCoord(uci.substring(0, 2));
    const dest = algebraicoParaCoord(uci.substring(2, 4));

    const offsetX = 0.6;
    const offsetY = 0.0;
    // Calcula os centros das casas de origem e destino (em %)
    const getPos = (l, c) => {
        const col = perspectiva === 'w' ? c : 7 - c;
        const lin = perspectiva === 'w' ? l : 7 - l;
        return {
            x: col * 12.5 + 6.25 + offsetX , 
            y: lin * 12.5 + 6.25 + offsetY
        };
    };

    const p1 = getPos(orig.linha, orig.coluna);
    const p2 = getPos(dest.linha, dest.coluna);

    // Encurta ligeiramente a linha para que a ponta pare no centro exato da casa
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distancia = Math.hypot(dx, dy);

    // Folga em % para a ponta se encaixar no centro sem estourar a casa
    const recuo = 2.8;
    const p2Ajustado = {
        x: p2.x - (dx / distancia) * recuo,
        y: p2.y - (dy / distancia) * recuo
    };

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'camada-setas-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5'; // Fica abaixo da peça mas acima do tabuleiro se ajustado no CSS

    // Cor rosa com transparência estilo Lichess/Chess.com
    const corSeta = 'rgba(57, 53, 58, 0.67)';

    svg.innerHTML = `
        <defs>
            <marker id="cabeca-seta" 
                    viewBox="0 0 10 10" 
                    refX="5" 
                    refY="5" 
                    markerWidth="3.2" 
                    markerHeight="3.2" 
                    orient="auto">
                <path d="M 0 1 L 10 5 L 0 9 L 2.5 5 z" fill="${corSeta}" />
            </marker>
        </defs>
        <line x1="${p1.x}%" y1="${p1.y}%" 
              x2="${p2Ajustado.x}%" y2="${p2Ajustado.y}%" 
              stroke="${corSeta}" 
              stroke-width="1.5" 
              stroke-linecap="round" 
              marker-end="url(#cabeca-seta)" />
    `;

    elTabuleiro.appendChild(svg);
}
/**
 * Remove a camada de setas do tabuleiro
 */
export function removerSetaOrientacao() {
    const camadaAnterior = document.getElementById('camada-setas-svg');
    if (camadaAnterior) {
        camadaAnterior.remove();
    }
}