import { Tabuleiro } from '../core/tabuleiro.js';
import { algebraicoParaCoord, gerarFEN } from '../core/notations.js';
import { removerSetaOrientacao, renderizarTabuleiro, desenharSetaOrientacao } from '../UI/ui.js';
import { relogio } from './gameController.js';

let sessaoOriginalPausada = null;
let historicoAnalise = [];
let indiceLanceAtual = 0;
let tabuleiroAnalise = null;
let corPerspectivaAnalise = 'w';

/**
 * Inicia o modo de análise congelando a sessão ativa
 * @param {Object} dadosJSON - Conteúdo do arquivo de partida importado
 * @param {Object} estadoJogoOriginal - Estado da partida pausada
 * @param {Function} callbackRestaurar - Callback para re-renderizar o jogo ao fechar
 */
export function iniciarModoAnalise(dadosJSON, estadoJogoOriginal, callbackRestaurar) {
    if (!dadosJSON || !Array.isArray(dadosJSON.movimentos)) {
        alert('Formato de arquivo inválido para análise.');
        return;
    }

    // Salva a sessão ativa para futura restauração
    sessaoOriginalPausada = {
        estadoJogo: estadoJogoOriginal,
        callbackRestaurar: callbackRestaurar
    };

    historicoAnalise = dadosJSON.movimentos;
    corPerspectivaAnalise = dadosJSON.corJogador || estadoJogoOriginal?.corJogador || 'w';
    if (relogio && typeof relogio.parar === 'function') {
        relogio.parar();
    }

    // Garante que não haja peças selecionadas da partida ativa
    if (estadoJogoOriginal) {
        estadoJogoOriginal.pecaSelecionada = null;
    }

    // Alterna os controles da interface
    document.querySelector('.game-controls:not(#painel-analise)')?.classList.add('modal-oculto');
    document.getElementById('painel-analise')?.classList.remove('modal-oculto');
    document.querySelectorAll('.painel-pecas').forEach(el => el.classList.add('modal-oculto'));

    const elTabuleiro = document.getElementById('tabuleiro');
    elTabuleiro?.classList.add('tabuleiro-analise');

    atualizarComentarioAnalise();
    configurarEventosAnalise();
    irParaLance(0);
}

// Cache para evitar requisições repetidas para a mesma FEN
const cacheAnalise = new Map();
let temporizadorDebounce = null;

/**
 * Busca a melhor jogada via Stockfish com debounce e cache
 * @param {string} fen - Posição atual do tabuleiro
 * @param {function} callbackSucesso - Função executada com os dados da API
 * @param {number} atrasoMs - Tempo de espera do debounce (padrão 200ms)
 */
export function buscarMelhorLanceComDebounce(fen, callbackSucesso, atrasoMs = 200) {
    // 1. Cancela a requisição pendente anterior se o usuário clicou de novo rápido
    if (temporizadorDebounce) {
        clearTimeout(temporizadorDebounce);
    }

    // 2. Verifica se o resultado já está no cache local
    if (cacheAnalise.has(fen)) {
        callbackSucesso(cacheAnalise.get(fen));
        return;
    }

    // 3. Agenda a chamada de API após o tempo de espera
    temporizadorDebounce = setTimeout(async () => {
        try {
            const resposta = await fetch('https://chess-stockfish-iota.vercel.app/api/jogada-ia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fen: fen,
                    level: 20,
                    historico: historicoAnalise
                })
            });

            if (!resposta.ok) throw new Error('Falha ao obter análise');

            const dados = await resposta.json();

            // Salva no cache
            cacheAnalise.set(fen, dados);

            // Retorna os dados para a UI
            if (typeof callbackSucesso === 'function') {
                callbackSucesso(dados);
            }
        } catch (erro) {
            console.error('Erro na análise da IA:', erro);
        }
    }, atrasoMs);
}

function atualizarComentarioAnalise(lance) {
    const elComentario = document.getElementById('texto-comentario');
    if (elComentario) {
        elComentario.innerHTML = `
            <span style="color: #3b82f6; font-weight: bold;">🔍 MODO ANÁLISE</span><br><br>
            Buscando lances...
        `;
    }
    if (lance) {
        elComentario.innerHTML = `
            <span style="color: #3b82f6; font-weight: bold;">🔍 MODO ANÁLISE</span><br><br>
            Melhor lance: ${lance}
        `;
    }
}

/**
 * Executa o replay do tabuleiro até o índice de lance especificado
 * @param {number} indice - Posição do histórico para renderizar
 */
export function irParaLance(indice) {
    if (indice < 0 || indice > historicoAnalise.length) return;

    indiceLanceAtual = indice;

    // Recria a instância limpa do tabuleiro (peças na posição inicial)
    tabuleiroAnalise = new Tabuleiro();

    // Re-executa os lances sequencialmente até o ponto desejado
    for (let i = 0; i < indiceLanceAtual; i++) {
        const uci = historicoAnalise[i];
        if (!uci || uci.length < 4) continue;

        const orig = algebraicoParaCoord(uci.substring(0, 2));
        const dest = algebraicoParaCoord(uci.substring(2, 4));

        tabuleiroAnalise.moverPeca(orig.linha, orig.coluna, dest.linha, dest.coluna);
    }

    // Renderiza a posição considerando a perspectiva e sem seleção ativa
    renderizarTabuleiro(tabuleiroAnalise, corPerspectivaAnalise);
    atualizarUIAnalise();
    buscarMelhorLanceComDebounce(gerarFEN(tabuleiroAnalise), (analise) => {
        if (analise && analise.movimento) {
            // Atualiza o painel com a sugestão do motor
            exibirMelhorLanceNaUI(analise.movimento);
        }
    }, 200);
}

function exibirMelhorLanceNaUI(lance) {
    atualizarComentarioAnalise(lance);
    desenharSetaOrientacao(lance, corPerspectivaAnalise);
}

/**
 * Atualiza o contador de lances e o estado habilitado/desabilitado dos botões
 */
function atualizarUIAnalise() {
    const indicador = document.getElementById('indicador-lance-analise');
    if (indicador) {
        indicador.textContent = `${indiceLanceAtual} / ${historicoAnalise.length}`;
    }

    const btnPrimeiro = document.getElementById('btn-primeiro-lance');
    const btnAnterior = document.getElementById('btn-lance-anterior');
    const btnProximo = document.getElementById('btn-proximo-lance');
    const btnUltimo = document.getElementById('btn-ultimo-lance');

    if (btnPrimeiro) btnPrimeiro.disabled = (indiceLanceAtual === 0);
    if (btnAnterior) btnAnterior.disabled = (indiceLanceAtual === 0);
    if (btnProximo) btnProximo.disabled = (indiceLanceAtual === historicoAnalise.length);
    if (btnUltimo) btnUltimo.disabled = (indiceLanceAtual === historicoAnalise.length);
}

/**
 * Registra os ouvintes de clique nos botões do painel de análise
 */
function configurarEventosAnalise() {
    const btnPrimeiro = document.getElementById('btn-primeiro-lance');
    const btnAnterior = document.getElementById('btn-lance-anterior');
    const btnProximo = document.getElementById('btn-proximo-lance');
    const btnUltimo = document.getElementById('btn-ultimo-lance');
    const btnSair = document.getElementById('btn-sair-analise');

    if (btnPrimeiro) btnPrimeiro.onclick = () => irParaLance(0);
    if (btnAnterior) btnAnterior.onclick = () => irParaLance(indiceLanceAtual - 1);
    if (btnProximo) btnProximo.onclick = () => irParaLance(indiceLanceAtual + 1);
    if (btnUltimo) btnUltimo.onclick = () => irParaLance(historicoAnalise.length);
    if (btnSair) btnSair.onclick = encerrarAnalise;
}

/**
 * Encerra o modo de análise e restaura o tabuleiro e controles da partida original
 */
export function encerrarAnalise() {
    // Oculta os controles de análise e retorna os controles normais
    document.getElementById('painel-analise')?.classList.add('modal-oculto');
    document.querySelector('.game-controls:not(#painel-analise)')?.classList.remove('modal-oculto');
    document.querySelectorAll('.painel-pecas').forEach(el => el.classList.remove('modal-oculto'));
    
    // Remove os estilos visuais da análise
    const elTabuleiro = document.getElementById('tabuleiro') || document.querySelector('.tabuleiro');
    elTabuleiro?.classList.remove('tabuleiro-analise');
    const elComentario = document.getElementById('texto-comentario');
    if (elComentario) {
        elComentario.innerHTML = `De volta ao jogo...
        `;
    }

    // Restaura o estado da sessão pausada
    if (sessaoOriginalPausada && sessaoOriginalPausada.estadoJogo) {
        const { estadoJogo, callbackRestaurar } = sessaoOriginalPausada;

        estadoJogo.pecaSelecionada = null;

        if (typeof callbackRestaurar === 'function') {
            callbackRestaurar();
        } else if (estadoJogo.tabuleiro) {
            renderizarTabuleiro(estadoJogo.tabuleiro, estadoJogo.corJogador);
        }
    }
    // volta a contar o tempo
    if (relogio && typeof relogio.iniciar === 'function') {
        relogio.iniciar();
    }

    cacheAnalise.clear();
    removerSetaOrientacao();
}