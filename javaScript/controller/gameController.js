import { Tabuleiro } from '../core/tabuleiro.js';
import { Clock } from '../UI/clock.js';
import { gerarFEN, algebraicoParaCoord, converterParaUCI } from '../core/notations.js';
import { obterJogadaStockfish } from '../service/api.js';
import { calcularSaldoPorCapturas } from '../core/saldo.js';
import { tipyng, pararTyping } from '../UI/tipyng.js';
import { tocarSom, alternarMusica } from '../service/audio.js';
import { renderizarTabuleiro, renderizarPecasCapturadas } from '../UI/ui.js';
import { exibirModalFimDeJogo } from '../UI/fimdejogo.js';

// Instância do Tabuleiro e elementos DOM do comentário
const jogo = new Tabuleiro();
const elComentario = document.getElementById('texto-comentario');
const btnDesfazer = document.getElementById('btn-desfazer');

// Estado global do jogo
export const estadoJogo = {
    corJogador: 'w',
    corIA: 'b',
    nivelDificuldade: 8,
    processandoIA: false,
    estadoAnterior: null,
    podeDesfazer: false,
    oportunidade: 3,
    saldoIA: 0,
    saldoJogador: 0,
    ultimoLance: null,
    casaSelecionada: null,
    movimentosPossiveis: [],
    capturadasPeloJogador: [],
    capturadasPelaIA: [],
    historicoLista: []
};

// Instância do Relógio
export const relogio = new Clock(
    10,
    (dados) => {
        const DOM_TIMER_IA = document.getElementById('timer-ia');
        const DOM_TIMER_JOGADOR = document.getElementById('timer-jogador');
        const eJogadorBrancas = estadoJogo.corJogador === 'w';

        DOM_TIMER_JOGADOR.textContent = eJogadorBrancas ? dados.w : dados.b;
        DOM_TIMER_IA.textContent = eJogadorBrancas ? dados.b : dados.w;

        const elJogador = document.querySelector('.timer-conteiner.jogador');
        const elIA = document.querySelector('.timer-conteiner.ia');

        if (elJogador && elIA) {
            const segW = Number(dados.wSegundos);
            const segB = Number(dados.bSegundos);

            const elBrancas = eJogadorBrancas ? elJogador : elIA;
            const elPretas = eJogadorBrancas ? elIA : elJogador;

            elBrancas.classList.toggle('ativo', dados.turnoAtivo === 'w');
            elPretas.classList.toggle('ativo', dados.turnoAtivo === 'b');

            elBrancas.classList.toggle('perigo', segW <= 30);
            elPretas.classList.toggle('perigo', segB <= 30);
        }
    },
    (quemPerdeu) => {
        jogo.jogoFinalizado = true;
        tocarSom('xequeMate');
        const jogadorVenceu = quemPerdeu !== estadoJogo.corJogador;
        finalizarPartida(jogadorVenceu ? 'vitoria' : 'derrota', 'TEMPO');
    }
);

// Auxiliares de UI/Render
export function atualizarTela() {
    renderizarTabuleiro(
        jogo,
        estadoJogo.corJogador,
        estadoJogo.casaSelecionada,
        estadoJogo.movimentosPossiveis,
        estadoJogo.ultimoLance,
        tratarCliqueCasa
    );
    renderizarPecasCapturadas(
        estadoJogo.capturadasPeloJogador,
        estadoJogo.capturadasPelaIA,
        estadoJogo.saldoJogador,
        estadoJogo.saldoIA
    );
}

function limparSelecao() {
    estadoJogo.casaSelecionada = null;
    estadoJogo.movimentosPossiveis = [];
}

function registrarCaptura(pecaCapturada, turnoAtual) {
    if (!pecaCapturada) return;
    if (turnoAtual === estadoJogo.corJogador) {
        estadoJogo.capturadasPeloJogador.push(pecaCapturada);
    } else {
        estadoJogo.capturadasPelaIA.push(pecaCapturada);
    }
    const resposta = calcularSaldoPorCapturas(estadoJogo.capturadasPelaIA, estadoJogo.capturadasPeloJogador);
    estadoJogo.saldoIA = resposta.vantagemIA;
    estadoJogo.saldoJogador = resposta.vantagemJogador;
}

// Início de Partida
export function iniciarJogo() {
    alternarMusica();
    atualizarTela();
    relogio.iniciar();

    if (jogo.turno === estadoJogo.corIA) {
        setTimeout(() => executarTurnoIA(), 1500);
    }
}

// Ação de Clique nas Casas
export function tratarCliqueCasa(linha, coluna) {
    if (jogo.jogoFinalizado || jogo.turno === estadoJogo.corIA || estadoJogo.processandoIA) return;

    const corPecaClicada = jogo.obterCorPeca(linha, coluna);
    const clicouEmDestinoValido = estadoJogo.movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);

    if (estadoJogo.casaSelecionada && clicouEmDestinoValido) {
        const jogoTurno = jogo.turno;
        salvarEstadoJogo();
        estadoJogo.podeDesfazer = false;

        const origemUCI = converterParaUCI(estadoJogo.casaSelecionada.linha, estadoJogo.casaSelecionada.coluna);
        const destinoUCI = converterParaUCI(linha, coluna);
        estadoJogo.historicoLista.push(`${origemUCI}${destinoUCI}`);

        const TemPecaInimiga = jogo.obterPeca(linha, coluna);

        estadoJogo.ultimoLance = {
            origem: { linha: estadoJogo.casaSelecionada.linha, coluna: estadoJogo.casaSelecionada.coluna },
            destino: { linha, coluna }
        };

        jogo.moverPeca(estadoJogo.casaSelecionada.linha, estadoJogo.casaSelecionada.coluna, linha, coluna);
        limparSelecao();

        const estadoFim = jogo.verificarFimDeJogo ? jogo.verificarFimDeJogo() : null;
        if (estadoFim) {
            relogio.parar();
            atualizarTela();
            tocarSom('xequeMate');
            setTimeout(() => {
                finalizarPartida(estadoFim.vencedor === estadoJogo.corJogador ? 'vitoria' : 'empate', estadoFim.tipo);
            }, 1200);
            return;
        }

        //====Sons====// 
        setTimeout(() => {
            if (TemPecaInimiga) {
                tocarSom('movimento');
                tocarSom('captura');
                registrarCaptura(TemPecaInimiga, jogoTurno);
            } else {
                tocarSom('movimento');
            }

            if (jogo.estaEmXeque(estadoJogo.corIA)) {
                tocarSom('xeque');
            }
        }, 220);
        //============//

        atualizarTela();
        relogio.mudarTurno ? relogio.mudarTurno(jogo.turno) : relogio.alternarTurno();

        pararTyping();
        simularPensamentoIAComentario();

        setTimeout(() => executarTurnoIA(), 2000);
        return;
    }

    if (corPecaClicada === jogo.turno) {
        estadoJogo.ultimoLance = null;
        estadoJogo.casaSelecionada = { linha, coluna };
        estadoJogo.movimentosPossiveis = jogo.obterMovimentosValidos(linha, coluna);
        atualizarTela();
        return;
    }

    limparSelecao();
    atualizarTela();
}

// Turno da IA
export async function executarTurnoIA() {
    if (jogo.jogoFinalizado || estadoJogo.processandoIA) return;
    estadoJogo.processandoIA = true;

    const fenAtual = gerarFEN(jogo);
    const resposta = await obterJogadaStockfish(fenAtual, estadoJogo.nivelDificuldade, estadoJogo.historicoLista);

    if (resposta && resposta.movimento) {
        const uci = resposta.movimento;
        estadoJogo.historicoLista.push(uci);

        const origem = algebraicoParaCoord(uci.substring(0, 2));
        const destino = algebraicoParaCoord(uci.substring(2, 4));

        const pecaDestino = jogo.obterPeca(destino.linha, destino.coluna);
        estadoJogo.ultimoLance = { origem, destino };

        const jogoTurno = jogo.turno;
        jogo.moverPeca(origem.linha, origem.coluna, destino.linha, destino.coluna);

        //tocar som
        setTimeout(() => {

            if (pecaDestino) {
                tocarSom('movimento')
                tocarSom('captura');
                registrarCaptura(pecaDestino, jogoTurno);
            } else {
                tocarSom('movimento');
            }

            if (jogo.estaEmXeque(estadoJogo.corJogador)) {
                tocarSom('xeque')
            };

        },220);

        const estadoFim = jogo.verificarFimDeJogo();
        if (estadoFim) {
            relogio.parar();
            atualizarTela();
            tocarSom('xequeMate')
            pararPensamentoIAComentario();
            finalizarPartida(estadoFim.vencedor === estadoJogo.corJogador ? 'vitoria' : 'empate', estadoFim.tipo);
            estadoJogo.processandoIA = false;
            return;
        }

        relogio.mudarTurno ? relogio.mudarTurno(jogo.turno) : relogio.alternarTurno();
        atualizarTela();

        const aberturaInfo = resposta.abertura ? `Posição de ${resposta.abertura.name}<br>${resposta.abertura.summary}` : "";
        const avaliacaoMeioJogo = resposta.meioJogo?.avaliacao ? `${resposta.meioJogo.avaliacao.desc}` : "";
        const avisoXeque = jogo.estaEmXeque(estadoJogo.corJogador) ? ' <span style="color: red; font-weight: bold;">XEQUE!!!</span>' : '';
        const comentarios = [aberturaInfo, avaliacaoMeioJogo].filter(Boolean).join("<br><br>");

        tipyng(`Joguei ${uci}.${avisoXeque}${comentarios ? "<br>" + comentarios : ""}`);
        pararPensamentoIAComentario();
    }

    estadoJogo.processandoIA = false;
    estadoJogo.podeDesfazer = true;
    atualizarBotaoDesfazer();
}

// Desfazer & Desistir
export function salvarEstadoJogo() {
    estadoJogo.estadoAnterior = {
        grid: JSON.parse(JSON.stringify(jogo.grid)),
        turno: jogo.turno,
        direitosRoque: JSON.parse(JSON.stringify(jogo.direitosRoque)),
        alvoEnPassant: jogo.alvoEnPassant ? { ...jogo.alvoEnPassant } : null,
        jogoFinalizado: jogo.jogoFinalizado,
        capturadasPeloJogador: [...estadoJogo.capturadasPeloJogador],
        capturadasPelaIA: [...estadoJogo.capturadasPelaIA]
    };
}

export function desfazerJogada() {
    if (!estadoJogo.podeDesfazer || !estadoJogo.estadoAnterior || estadoJogo.processandoIA) return;

    const prev = estadoJogo.estadoAnterior;
    jogo.grid = JSON.parse(JSON.stringify(prev.grid));
    jogo.turno = prev.turno;
    jogo.direitosRoque = JSON.parse(JSON.stringify(prev.direitosRoque));
    jogo.alvoEnPassant = prev.alvoEnPassant ? { ...prev.alvoEnPassant } : null;
    jogo.jogoFinalizado = prev.jogoFinalizado;

    estadoJogo.capturadasPeloJogador = [...prev.capturadasPeloJogador];
    estadoJogo.capturadasPelaIA = [...prev.capturadasPelaIA];
    estadoJogo.historicoLista.splice(-2);
    estadoJogo.ultimoLance = null;
    estadoJogo.casaSelecionada = null;
    estadoJogo.movimentosPossiveis = []

    const resposta = calcularSaldoPorCapturas(estadoJogo.capturadasPelaIA, estadoJogo.capturadasPeloJogador);
    estadoJogo.saldoIA = resposta.vantagemIA;
    estadoJogo.saldoJogador = resposta.vantagemJogador;

    estadoJogo.oportunidade--;
    estadoJogo.podeDesfazer = false;
    estadoJogo.estadoAnterior = null;

    atualizarBotaoDesfazer();
    relogio.mudarTurno ? relogio.mudarTurno(jogo.turno) : relogio.alternarTurno();
    atualizarTela();
    tocarSom('movimento');
}

export function desistirPartida() {
    if (jogo.jogoFinalizado || estadoJogo.processandoIA) return;
    if (!confirm("Tem certeza de que deseja desistir da partida?")) return;
    tocarSom('xequeMate')
    finalizarPartida('derrota', 'DESISTÊNCIA');
}

export function finalizarPartida(resultado, motivo) {
    jogo.jogoFinalizado = true;
    relogio.parar();
    estadoJogo.podeDesfazer = false;

    const btnDesfazer = document.getElementById('btn-desfazer');
    if (btnDesfazer) {
        btnDesfazer.textContent = 'Salvar Jogo';
        btnDesfazer.disabled = false;

        // Remove os eventos anteriores de 'desfazer' e adiciona a exportação
        btnDesfazer.onclick = exportarPartidaJSON;
    }
    //atualizarBotaoDesfazer(); edit: botão retirado

    const btnDesistir = document.getElementById('btn-desistir');
    if (btnDesistir) {
        btnDesistir.textContent = '🔄 Recomeçar';
        btnDesistir.onclick = () => window.location.reload();
    }

    pararTyping();
    elComentario.textContent = `Fim de jogo por ${motivo.toLowerCase()} 🤝`;
    exibirModalFimDeJogo(resultado, estadoJogo.nivelDificuldade, motivo);
}

// Animações de comentário e botões
let simular_pensamento_IA = null;
function simularPensamentoIAComentario() {
    let pontos = 0;
    pararPensamentoIAComentario();
    const avisoXeque = jogo.estaEmXeque(estadoJogo.corIA) ? ' <span style="color: red; font-weight: bold;">XEQUE!!! </span>' : '';

    simular_pensamento_IA = setInterval(() => {
        pontos = (pontos + 1) % 4;
        elComentario.innerHTML = `${avisoXeque}Pensando${'.'.repeat(pontos)}`;
    }, 400);
}

function pararPensamentoIAComentario() {
    if (simular_pensamento_IA) {
        clearInterval(simular_pensamento_IA);
        simular_pensamento_IA = null;
    }
}

function atualizarBotaoDesfazer() {
    if (btnDesfazer) {
        btnDesfazer.disabled = !(estadoJogo.podeDesfazer && estadoJogo.oportunidade > 0);
    }
}

// Função para disparar o download do arquivo JSON
function obterDataFormatada() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

// gera o arquivo com os dados da partida
export function exportarPartidaJSON() {
    if (!estadoJogo.historicoLista || estadoJogo.historicoLista.length === 0) return;

    const dadosJogo = {
        data: new Date().toISOString(),
        dificuldade: estadoJogo.nivelDificuldade,
        corJogador: estadoJogo.corJogador,
        movimentos: estadoJogo.historicoLista
    };

    const blob = new Blob([JSON.stringify(dadosJogo, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dataFormatada = obterDataFormatada();
    const a = document.createElement('a');
    a.href = url;
    a.download = `chessfish-partida_${dataFormatada}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Atualizar o botão de desfazer para salvar no fim de jogo
export function alternarBotaoParaSalvar() {
    const btnDesfazer = document.getElementById('btn-desfazer');
    if (!btnDesfazer) return;

    btnDesfazer.textContent = 'Salvar Jogo';
    btnDesfazer.disabled = false;

    // Remove listeners antigos e atribui o evento de download
    const novoBtn = btnDesfazer.cloneNode(true);
    btnDesfazer.parentNode.replaceChild(novoBtn, btnDesfazer);
    novoBtn.addEventListener('click', exportarPartidaJSON);
}