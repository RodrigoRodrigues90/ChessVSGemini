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
 * Desenha uma seta SVG perfeitamente alinhada sobre o tabuleiro no modo análise.
 * @param {string} uci - Movimento no formato UCI (ex: "e2e4")
 */
export function desenharSetaOrientacao(uci) {
    const elTabuleiro = document.getElementById('tabuleiro');
    if (!elTabuleiro || !uci || uci.length < 4) return;

    removerSetaOrientacao(); // Limpa qualquer seta desenhada anteriormente

    // 1. Converte a notação UCI em coordenadas { linha, coluna }
    const coordOrig = algebraicoParaCoord(uci.substring(0, 2));
    const coordDest = algebraicoParaCoord(uci.substring(2, 4));

    if (!coordOrig || !coordDest) return;

    // 2. Busca os elementos HTML das casas direto no DOM do tabuleiro
    const elOrig = elTabuleiro.querySelector(
        `.casa[data-linha="${coordOrig.linha}"][data-coluna="${coordOrig.coluna}"]`
    );
    const elDest = elTabuleiro.querySelector(
        `.casa[data-linha="${coordDest.linha}"][data-coluna="${coordDest.coluna}"]`
    );

    if (!elOrig || !elDest) return;

    // 3. Captura o posicionamento físico em pixels na tela
    const rectTabuleiro = elTabuleiro.getBoundingClientRect();
    const rectOrig = elOrig.getBoundingClientRect();
    const rectDest = elDest.getBoundingClientRect();

    // Centros exatos em pixels relativos ao contêiner do tabuleiro
    const p1 = {
        x: (rectOrig.left + rectOrig.width / 2) - rectTabuleiro.left,
        y: (rectOrig.top + rectOrig.height / 2) - rectTabuleiro.top
    };

    const p2 = {
        x: (rectDest.left + rectDest.width / 2) - rectTabuleiro.left,
        y: (rectDest.top + rectDest.height / 2) - rectTabuleiro.top
    };

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);

    if (dist === 0) return;

    // Vetores unitários (u = direção do movimento, v = perpendicular)
    const ux = dx / dist;
    const uy = dy / dist;
    const vx = -uy;
    const vy = ux;

    const tamanhoCasa = rectOrig.width;

    const larguraCorpo = tamanhoCasa * 0.14;   
    const larguraCabeca = tamanhoCasa * 0.36;  
    const tamanhoCabeca = tamanhoCasa * 0.34;  

    // Folgas para não cobrir totalmente os centros das peças
    const avancarBase = tamanhoCasa * 0.15;
    const recuoPonta = tamanhoCasa * 0.15;

    const p1Ajustado = {
        x: p1.x + ux * avancarBase,
        y: p1.y + uy * avancarBase
    };

    const p2Final = {
        x: p2.x - ux * recuoPonta,
        y: p2.y - uy * recuoPonta
    };

    const baseCabeca = {
        x: p2Final.x - ux * tamanhoCabeca,
        y: p2Final.y - uy * tamanhoCabeca
    };

    // Vértices do polígono contínuo
    const pontos = [
        { x: p1Ajustado.x + vx * (larguraCorpo / 2), y: p1Ajustado.y + vy * (larguraCorpo / 2) },
        { x: baseCabeca.x + vx * (larguraCorpo / 2), y: baseCabeca.y + vy * (larguraCorpo / 2) },
        { x: baseCabeca.x + vx * (larguraCabeca / 2), y: baseCabeca.y + vy * (larguraCabeca / 2) },
        { x: p2Final.x, y: p2Final.y },
        { x: baseCabeca.x - vx * (larguraCabeca / 2), y: baseCabeca.y - vy * (larguraCabeca / 2) },
        { x: baseCabeca.x - vx * (larguraCorpo / 2), y: baseCabeca.y - vy * (larguraCorpo / 2) },
        { x: p1Ajustado.x - vx * (larguraCorpo / 2), y: p1Ajustado.y - vy * (larguraCorpo / 2) }
    ];

    const dPath = `M ${pontos[0].x} ${pontos[0].y} ` +
        pontos.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';

    // Cria a camada SVG sobreposta
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'camada-setas-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = `${rectTabuleiro.width}px`;
    svg.style.height = `${rectTabuleiro.height}px`;
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '5';

    // Cinza escuro translúcido com borda suave
    const corPreenchimento = 'rgba(57, 65, 51, 0.8)';
    const corBorda = 'rgba(255, 255, 255, 0.25)';

    svg.innerHTML = `
        <path d="${dPath}" 
              fill="${corPreenchimento}" 
              stroke="${corBorda}" 
              stroke-width="1" 
              stroke-linejoin="round" />
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

function calcularPorcentagemAvaliacao(avaliacao, turnoAtual = 'w', perspectiva = 'w') {
    // 1. Caso a API retorne nulo ou sem score em posição final de jogo
    if (!avaliacao || avaliacao.value === undefined || avaliacao.value === null) {
        return { pctBrancas: 50, texto: '0.0' };
    }

    let { unit, value } = avaliacao;
    const ePretas = perspectiva === 'b';

    // 2. Trata Xeque-Mate
    if (unit === 'mate') {
        // Se value for 0 (Xeque-mate já consolidado no tabuleiro):
        // Quem está com o turno levou o mate, portanto o outro jogador venceu 100%.
        let mateAbsoluto = value;
        if (value === 0) {
            mateAbsoluto = (turnoAtual === 'b') ? 1 : -1; // Brancas venceram se for a vez das Pretas
        } else if (turnoAtual === 'b') {
            mateAbsoluto = -value;
        }

        const pctBrancas = mateAbsoluto > 0 ? 100 : 0;
        
        const mateExibicao = ePretas ? -mateAbsoluto : mateAbsoluto;
        const texto = mateExibicao > 0 ? `M${Math.abs(mateExibicao)}` : `-M${Math.abs(mateExibicao)}`;
        
        return { pctBrancas, texto };
    }

    // 3. Centipawns (value positivo = Brancas em vantagem)
    const cpAbsolutoBrancas = (turnoAtual === 'b') ? -value : value;

    // Porcentagem Real das Brancas (0% a 100%)
    const pctBrancas = 50 + 50 * (2 / (1 + Math.exp(-0.00368 * cpAbsolutoBrancas)) - 1);

    // Formata o Texto para a Perspectiva do Jogador Atual
    const cpJogador = ePretas ? -cpAbsolutoBrancas : cpAbsolutoBrancas;
    const sinal = cpJogador > 0 ? '+' : '';
    const texto = `${sinal}${(cpJogador / 100).toFixed(1)}`;

    const pctBrancasAjustada = Math.min(Math.max(pctBrancas, 3), 97);

    return {
        pctBrancas: pctBrancasAjustada,
        texto
    };
}

export function atualizarBarraAvaliacao(avaliacaoStockfish, turnoAtual = 'w', perspectiva = 'w') {
    const elContainer = document.querySelector('.container-barra-avaliacao');
    const elBarraBrancas = document.getElementById('barra-brancas');
    const elTexto = document.getElementById('texto-avaliacao');

    if (!elBarraBrancas || !elContainer) return;

    // Repassa o turnoAtual para normalizar a oscilação da API
    const { pctBrancas, texto } = calcularPorcentagemAvaliacao(avaliacaoStockfish, turnoAtual, perspectiva);

    // Cores fixas da UI: barra interna é Clara (#e8e8e8), fundo do container é Escuro (#262421)
    elContainer.style.backgroundColor = '#262421';
    elBarraBrancas.style.backgroundColor = '#e8e8e8';

    if (perspectiva === 'b') {
        // Visão das Pretas: As Brancas ficam no TOPO
        elContainer.style.flexDirection = 'column';
    } else {
        // Visão das Brancas: As Brancas ficam na BASE
        elContainer.style.flexDirection = 'column-reverse';
    }

    // Aplica a porcentagem real da vantagem das Brancas
    elBarraBrancas.style.height = `${pctBrancas}%`;

    if (elTexto) {
        elTexto.textContent = texto;

        // Ajuste de contraste do texto conforme quem domina a área visual
        const brancasDominam = pctBrancas > 50;
        elTexto.style.color = brancasDominam ? '#262421' : '#e8e8e8';
    }
}