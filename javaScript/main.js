import { Tabuleiro } from './tabuleiro.js';
import { Clock } from './clock.js';
import { desenharCoordenadas, gerarFEN, algebraicoParaCoord, converterParaUCI } from './notations.js';
import { obterJogadaStockfish } from './api.js';
import { exibirModalFimDeJogo } from './fimdejogo.js';
import { calcularSaldoPorCapturas } from './saldo.js';
import { tipyng, pararTyping } from './tipyng.js';

const elComentario = document.getElementById('texto-comentario');
const DOM_TABULEIRO = document.getElementById('tabuleiro');
const DOM_TIMER_IA = document.getElementById('timer-ia');
const DOM_TIMER_JOGADOR = document.getElementById('timer-jogador');
const jogo = new Tabuleiro();

//--------------- VARIÁVEIS DE ESTADO ----------------//
let corJogador = 'w'; // 'w' para Brancas (padrão) ou 'b' para Pretas
let corIA = 'b';      // Inverso de corJogador
let nivelDificuldade = 8;
let processandoIA = false;
let estadoAnterior = null;
let podeDesfazer = false;
let oportunidade = 3;
let saldoIA = 0
let saldoJogador = 0

// Arrays para guardar o histórico das peças capturadas
const capturadasPeloJogador = [];
const capturadasPelaIA = [];
let historicoLista = [];
let ultimoLance = null

//--------------- ELEMENTOS DE INTERFACE ----------------//
const nivelTitulo = document.getElementById('nivel-titulo')
const modalCor = document.getElementById('modal-selecao-cor');
const modalDificuldade = document.getElementById('modal-dificuldade');

const btnBrancas = document.getElementById('btn-jogar-brancas');
const btnPretas = document.getElementById('btn-jogar-pretas');
const btnsDificuldade = document.querySelectorAll('.btn-dificuldade');
const painelPecasJogador = document.getElementById('pecas-capturadas-jogador');
const painelPecasIA = document.getElementById('pecas-capturadas-ia');
const Elemento_SaldoIA = document.getElementById('saldo-ia');
const Elemento_SaldoJogador = document.getElementById('saldo-jogador');
const btnDesfazer = document.getElementById('btn-desfazer');
const btnDesistir = document.getElementById('btn-desistir');

//--------------- PASSO 1: ESCOLHA DA COR ----------------//
btnBrancas.addEventListener('click', () => selecionarCor('w'));
btnPretas.addEventListener('click', () => selecionarCor('b'));

function selecionarCor(cor) {
    corJogador = cor;
    corIA = cor === 'w' ? 'b' : 'w'; // Inverte a cor da IA

    // Transição: Esconde modal de cor e abre o de dificuldade
    modalCor.classList.add('fade-out')
    modalDificuldade.classList.remove('modal-oculto');
}

//--------------- PASSO 2: ESCOLHA DA DIFICULDADE E INÍCIO ----------------//
btnsDificuldade.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        nivelDificuldade = parseInt(target.dataset.level, 10);

        // Oculta o modal de dificuldade
        modalDificuldade.classList.add('fade-out');
        definirDificuldade(nivelDificuldade);

        // Inicia a partida com as configurações definidas
        iniciarJogo();
    });
});
function definirDificuldade(nivel) {
    switch (nivel) {
        case 1:
            nivelTitulo.textContent = '(Iniciante)';
            break;
        case 10:
            nivelTitulo.textContent = '(Medio)';
            break;
        case 20:
            nivelTitulo.textContent = '(Avançado)';
            break;
    }
}

function iniciarJogo() {

    tentarIniciarMusica(); // Tenta ligar a música no primeiro clique

    // Inicia a renderização e o relógio
    renderizarTabuleiro();
    relogio.iniciar();

    // Se o jogador escolheu Pretas, a IA (Brancas) faz o primeiro lance
    if (jogo.turno === corIA) {
        setTimeout(() => { //tempo para sensação de pensamento da IA
            executarTurnoIA();
        }, 1500);
    }
}

//------------------------------ Audios ------------------------------//
const audioMovimento = new Audio('./sounds/chesspiece.mp3');
const audioXeque = new Audio('./sounds/xeque.mp3');
const audioXequeMate = new Audio('./sounds/win.mp3');
const audioCaptura = new Audio('./sounds/botão.mp3');
const audioAlerta = new Audio('./sounds/clock.mp3');
const music = new Audio('./sounds/music.mp3');
music.loop = true;
music.volume = 1; // Volume ajustado para música de fundo não encobrir os efeitos
let musicaPausada = true; // Começa pausada

//toca sons gerais de jogo, como movimento, xeque, xeque-mate e captura
function tocarSom(audio) {
    if (!audio) return;
    
    // Clona o nó de áudio para tocar uma instância independente
    const clone = audio.cloneNode();
    clone.volume = audio.volume; // Mantém o volume configurado
    clone.play().catch(error => console.log("Erro ao tocar áudio:", error));
}

// Inicia a música no primeiro clique do usuário para evitar bloqueio do navegador
function tentarIniciarMusica() {
    music.play().then(() => {
        musicaPausada = false;
        atualizarBotaoAudio(); // Garante que o ícone esteja certo ao iniciar
    }).catch(() => {
        musicaPausada = true;
        atualizarBotaoAudio();
    });
}

// Pausa ou retoma a música de fundo e atualiza a interface
function alternarMusica() {
    if (musicaPausada) {
        music.play().then(() => {
            musicaPausada = false;
            atualizarBotaoAudio();
        }).catch(() => { });
    } else {
        music.pause();
        musicaPausada = true;
        atualizarBotaoAudio();
    }
}

// Função utilitária para manter o ícone e o botão sempre sincronizados
function atualizarBotaoAudio() {
    iconeAudio.textContent = musicaPausada ? '🔇' : '🔊';
    btnMutarAudio.classList.toggle('mutado', musicaPausada);
}

const btnMutarAudio = document.getElementById('btn-mutar-audio');
const iconeAudio = document.getElementById('icone-audio');

btnMutarAudio.addEventListener('click', () => {
    alternarMusica();
});


// ----------- Cria o relógio com 5 minutos para cada jogador -----------//
// Flags para controlar se o alerta já foi tocado para cada jogador
let alertaTocadoW = false;
let alertaTocadoB = false;

// Assumindo que 'corJogador' vale 'w' ou 'b'
const relogio = new Clock(
    10,
    (dados) => {
        // 1. O relógio sempre envia 'w' (Brancas) e 'b' (Pretas)
        // Mapeamos o display conforme a cor atribuída ao jogador
        const eJogadorBrancas = corJogador === 'w';

        const tempoJogador = eJogadorBrancas ? dados.w : dados.b;
        const tempoIA = eJogadorBrancas ? dados.b : dados.w;

        DOM_TIMER_JOGADOR.textContent = tempoJogador;
        DOM_TIMER_IA.textContent = tempoIA;

        const elJogador = document.querySelector('.timer-conteiner.jogador');
        const elIA = document.querySelector('.timer-conteiner.ia');

        if (elJogador && elIA) {
            const segW = Number(dados.wSegundos);
            const segB = Number(dados.bSegundos);

            const emPerigoW = segW <= 30;
            const emPerigoB = segB <= 30;

            // 2. Associa cada elemento à sua respectiva cor da partida
            const elBrancas = eJogadorBrancas ? elJogador : elIA;
            const elPretas = eJogadorBrancas ? elIA : elJogador;

            // 3. Ativa o relógio de quem é a vez ('w' sempre começa ativo no Clock)
            elBrancas.classList.toggle('ativo', dados.turnoAtivo === 'w');
            elPretas.classList.toggle('ativo', dados.turnoAtivo === 'b');

            // 4. Aplica a classe de perigo nos elementos corretos
            elBrancas.classList.toggle('perigo', emPerigoW);
            elPretas.classList.toggle('perigo', emPerigoB);

            // 5. Controle do Alerta Sonoro
            if (emPerigoW) {
                if (!alertaTocadoW) {
                    tocarSom(audioAlerta);
                    alertaTocadoW = true;
                }
            } else {
                alertaTocadoW = false;
            }

            if (emPerigoB) {
                if (!alertaTocadoB) {
                    tocarSom(audioAlerta);
                    alertaTocadoB = true;
                }
            } else {
                alertaTocadoB = false;
            }
        }
    },
    (quemPerdeu) => {
        jogo.jogoFinalizado = true;
        tocarSom(audioXequeMate);

        // Se quem perdeu por tempo tiver cor diferente da do jogador, o jogador venceu
        const jogadorVenceu = quemPerdeu !== corJogador;

        if (jogadorVenceu) {
            finalizarPartida('vitoria', 'TEMPO');
        } else {
            finalizarPartida('derrota', 'TEMPO');
        }
    }
);

//------------------------------ Renderização do tabuleiro ------------------------------//
const UNICODE_PECAS = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
    'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟'
};

function renderizarTabuleiro() {
    DOM_TABULEIRO.innerHTML = '';

    // Inverte o tabuleiro na tela se o jogador for de Pretas ('b')
    const linhas = corJogador === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
    const colunas = corJogador === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

    //faz uma checagem se o rei está em xeque.
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

            const ehClara = (linha + coluna) % 2 === 0;
            casa.classList.add(ehClara ? 'clara' : 'escura');

            casa.dataset.linha = linha;
            casa.dataset.coluna = coluna;

            // Destaque da casa selecionada
            if (casaSelecionada && casaSelecionada.linha === linha && casaSelecionada.coluna === coluna) {
                casa.classList.add('selecionada');
            }

            if (ultimoLance) {
                const ehOrigem = ultimoLance.origem.linha === linha && ultimoLance.origem.coluna === coluna;
                const ehDestino = ultimoLance.destino.linha === linha && ultimoLance.destino.coluna === coluna;
                if (ehOrigem || ehDestino) {
                    casa.classList.add(ehOrigem ? 'casa-origem' : 'casa-destino');
                }
            }

            // Destaque do rei em xeque
            if (reiEmxeque && casaRei && casaRei.linha === linha && casaRei.coluna === coluna) {
                casa.classList.add('reiemxeque');
            }

            // Indicador de movimento válido
            const ehMovimentoValido = movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);
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

            casa.addEventListener('click', () => tratarCliqueCasa(linha, coluna));
            DOM_TABULEIRO.appendChild(casa);
        }
    }
    // Desenha as coordenadas laterais e inferiores
    desenharCoordenadas(DOM_TABULEIRO, corJogador);
}

/**
 * Registra a captura com base no turno de quem efetuou a jogada
 * @param {string} pecaCapturada - O caractere da peça que foi removida (ex: 'p', 'P', 'q', etc.)
 * @param {string} turnoAtual - 'w' (Brancas) ou 'b' (Pretas) no momento do lance
 */
function registrarCaptura(pecaCapturada, turnoAtual) {
    if (!pecaCapturada) return;

    // Se o turno de quem capturou for igual à cor do Jogador Humano, vai para o painel dele!
    if (turnoAtual === corJogador) {
        capturadasPeloJogador.push(pecaCapturada);
    } else {
        // Caso contrário, quem capturou foi a IA
        capturadasPelaIA.push(pecaCapturada);
    }
    let resposta = calcularSaldoPorCapturas(capturadasPelaIA, capturadasPeloJogador);// Atualiza o saldo material
    saldoIA = resposta.vantagemIA;
    saldoJogador = resposta.vantagemJogador;

    renderizarPecasCapturadas();
}

//atualiza os paineis de peças capturadas para o jogador e para a IA
function renderizarPecasCapturadas() {


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
    }// Atualiza o saldo material
}

//simula visualmente o processamento da IA
let simular_pensamento_IA = null;
function simularPensamentoIAComentario() {
    let pontos = 0;

    // limpar intervalo rodando em paralelo
    pararPensamentoIAComentario();
    const avisoXeque = jogo.estaEmXeque(corIA)
        ? ' <span style="color: red; font-weight: bold;">XEQUE!!! </span>'
        : '';

    simular_pensamento_IA = setInterval(() => {
        pontos = (pontos + 1) % 4; // Alterna entre 0, 1, 2 e 3
        elComentario.innerHTML = `${avisoXeque}`+ 'Pensando' + '.'.repeat(pontos);
    }, 400);
}

function pararPensamentoIAComentario() {
    if (simular_pensamento_IA) {
        clearInterval(simular_pensamento_IA);
        simular_pensamento_IA = null;
    }
}

function registrarHistorico(lanceUCI) {
    historicoLista.push(lanceUCI);
}
function limparHistorico() {
    historicoLista = [];
}

//--------------- Controle de Seleção e Jogadas ---------------//
let movimentosPossiveis = [];
let casaSelecionada = null;

function tratarCliqueCasa(linha, coluna) {
    // Bloqueia cliques se o jogo acabou OU se for a vez da IA jogar
    if (jogo.jogoFinalizado || jogo.turno === corIA || processandoIA) return;

    const corPecaClicada = jogo.obterCorPeca(linha, coluna);
    const clicouEmDestinoValido = movimentosPossiveis.some(m => m.linha === linha && m.coluna === coluna);

    // Mover peça para destino válido
    if (casaSelecionada && clicouEmDestinoValido) {
        let jogoTurno = jogo.turno; // Salva o turno antes de mover

        //============função undo============//
        salvarEstadoJogo(); // Salva o estado atual antes de mover para permitir desfazer
        podeDesfazer = false; // Permite desfazer após salvar o estado
        //===================================//

        // [HISTÓRICO UCI] Converter coordenadas de origem e destino
        const origemUCI = converterParaUCI(casaSelecionada.linha, casaSelecionada.coluna);
        const destinoUCI = converterParaUCI(linha, coluna);
        const lanceUCI = `${origemUCI}${destinoUCI}`;
        registrarHistorico(lanceUCI); // Adiciona ao histórico de jogadas

        //para checagem de movimento de enpassant 
        const pecaOrigem = jogo.obterPeca(casaSelecionada.linha, casaSelecionada.coluna);
        const ehEnpassant = validarEnpassant(pecaOrigem, casaSelecionada, { linha, coluna });

        //para checagem de captura de peça inimiga
        const TemPecaInimiga = jogo.obterPeca(linha, coluna);

        // guarda a casa jogada para destacar na renderização do tabuleiro
        ultimoLance = {
            origem: { linha: casaSelecionada.linha, coluna: casaSelecionada.coluna },
            destino: { linha, coluna }
        };

        //realizar movimento
        jogo.moverPeca(casaSelecionada.linha, casaSelecionada.coluna, linha, coluna);
        limparSelecao();

        //Checa Xeque-Mate ou Empate após a jogada
        const estadoFim = jogo.verificarFimDeJogo ? jogo.verificarFimDeJogo() : null;

        if (estadoFim) {
            relogio.parar();
            limparHistorico();
            renderizarTabuleiro();
            if (estadoFim.tipo === 'XEQUE_MATE') {
                const resultado = estadoFim.vencedor === corJogador ? 'vitoria' : 'derrota';
                tocarSom(audioXequeMate);
                setTimeout(() => {
                    finalizarPartida(resultado, estadoFim.tipo)
                }, 1000);
            } else {
                setTimeout(() => {
                    finalizarPartida('empate', estadoFim.tipo)
                }, 1000);
            }
            return;
        }

        if (TemPecaInimiga) {
            tocarSom(audioCaptura); // Som de captura
            registrarCaptura(TemPecaInimiga, jogoTurno); // Registra a captura
        }
        else if (ehEnpassant) { //se não tiver peça inimiga, mas for um movimento de enpassant, registra a captura
            tocarSom(audioCaptura); // Som de captura
            registrarCaptura('p', jogoTurno); // Registra a captura
        }
        // Toca som adequado para a jogada (Xeque vs Movimento Padrão)
        if (jogo.estaEmXeque && jogo.estaEmXeque(jogo.turno)) {
            tocarSom(audioXeque);
        }
        tocarSom(audioMovimento);


        renderizarTabuleiro();

        // Alterna o relógio para o próximo jogador
        if (typeof relogio.mudarTurno === 'function') {
            relogio.mudarTurno(jogo.turno);
        } else if (typeof relogio.alternarTurno === 'function') {
            relogio.alternarTurno();
        }
        pararTyping();
        simularPensamentoIAComentario();
        // Chama a IA para fazer a jogada
        setTimeout(() => {
            executarTurnoIA();
        }, 2000);
        return;
    }

    // Selecionar uma peça própria
    if (corPecaClicada === jogo.turno) {
        ultimoLance = null
        casaSelecionada = { linha, coluna };
        movimentosPossiveis = jogo.obterMovimentosValidos(linha, coluna);
        renderizarTabuleiro();
        return;
    }

    // Clique em local inválido
    limparSelecao();
    renderizarTabuleiro();
}

//==========função para limpar seleção e movimentos possíveis==========//
function limparSelecao() {
    casaSelecionada = null;
    movimentosPossiveis = [];
}

//====função auxiliar para validar movimento de enpassant====//
function validarEnpassant(pecaOrigem, origem, destino) {
    const ehPiao = pecaOrigem.toLowerCase() === 'p';
    const ehDiagonal = Math.abs(origem.coluna - destino.coluna) === 1;

    // Certifica que existe um alvo de En Passant ativo
    if (!jogo.alvoEnPassant) return false;

    // Compara linha e coluna de destino com o alvoEnPassant
    const ehDestinoAlvo = destino.linha === jogo.alvoEnPassant.linha &&
        destino.coluna === jogo.alvoEnPassant.coluna;

    return ehPiao && ehDiagonal && ehDestinoAlvo;
}

//=============================== Função para a IA jogar ==============================//
async function executarTurnoIA() {
    if (jogo.jogoFinalizado || processandoIA) return;

    processandoIA = true;

    // 1. Gera a FEN da posição atual para enviar ao Stockfish
    const fenAtual = gerarFEN(jogo);

    // 2. Chama o backend do Stockfish
    const resposta = await obterJogadaStockfish(fenAtual, nivelDificuldade, historicoLista);

    if (resposta && resposta.movimento) {
        const uci = resposta.movimento; // Ex: "e2e4" ou "e7e8q"
        registrarHistorico(uci); // Adiciona ao histórico de jogadas
        // Extrai as casas de origem e destino da string UCI
        const origemStr = uci.substring(0, 2); // Ex: "e2"
        const destinoStr = uci.substring(2, 4); // Ex: "e4"

        const origem = algebraicoParaCoord(origemStr);
        const destino = algebraicoParaCoord(destinoStr);

        // A. DETECÇÃO DE CAPTURA (ANTES DE MOVER)
        const pecaDestino = jogo.obterPeca(destino.linha, destino.coluna);
        const ehCaptura = pecaDestino !== '';

        const ehEnpassant = validarEnpassant(jogo.obterPeca(origem.linha, origem.coluna), origem, destino);

        // 3. Executa a jogada no tabuleiro IMEDIATAMENTE

        ultimoLance = {//destaque das casas jogadas
            origem: { linha: origem.linha, coluna: origem.coluna },
            destino: { linha: destino.linha, coluna: destino.coluna }
        };
        const jogoTurno = jogo.turno; // Salva o turno antes de mover
        jogo.moverPeca(origem.linha, origem.coluna, destino.linha, destino.coluna);

        // 3.1 Dispara os efeitos sonoros correspondentes sem atraso
        if (ehCaptura) {
            tocarSom(audioCaptura);
            registrarCaptura(pecaDestino, jogoTurno); // Registra a captura
        }
        else if (ehEnpassant) { //se não tiver peça inimiga, mas for um movimento de enpassant, registra a captura
            tocarSom(audioCaptura); // Som de captura
            registrarCaptura('p', jogoTurno); // Registra a captura
        }
        if (jogo.estaEmXeque(corJogador)) { //se for um xeque toca o som
            tocarSom(audioXeque);
        }
        tocarSom(audioMovimento); // Som de movimento padrão

        // 4. Checa Fim de Jogo
        const estadoFim = jogo.verificarFimDeJogo();
        if (estadoFim) {
            relogio.parar();
            renderizarTabuleiro();
            if (estadoFim.tipo === 'XEQUE_MATE') {
                const resultado = estadoFim.vencedor === corJogador ? 'vitoria' : 'derrota';
                tocarSom(audioXequeMate);
                setTimeout(() => {
                    finalizarPartida(resultado, estadoFim.tipo)
                }, 1000);
            } else {
                setTimeout(() => {
                    finalizarPartida('empate', estadoFim.tipo)
                }, 1000);
            }
            pararPensamentoIAComentario();
            limparHistorico();
            processandoIA = false;
            return;
        }

        // 5. Alterna relógio e atualiza a interface visual IMEDIATAMENTE
        if (typeof relogio.mudarTurno === 'function') {
            relogio.mudarTurno(jogo.turno);
        } else if (typeof relogio.alternarTurno === 'function') {
            relogio.alternarTurno();
        }

        renderizarTabuleiro();

        // Libera o estado de processamento para permitir que o usuário continue jogando
        processandoIA = false;

        //6.exibe comentário da IA sobre a jogada feita// No Frontend:

        // 6.1 Informações sobre a abertura
        const aberturaInfo = resposta.abertura
            ? `Posição de ${resposta.abertura.name}<br>${resposta.abertura.summary}`
            : "";

        // 6.2 Avaliação do meio-jogo fornecida pelo Stockfish
        const avaliacaoMeioJogo = resposta.meioJogo?.avaliacao
            ? `${resposta.meioJogo.avaliacao.desc}`
            : "";

        // 6.3 Verificação de Xeque para tag em vermelho
        const avisoXeque = jogo.estaEmXeque(corJogador)
            ? ' <span style="color: red; font-weight: bold;">XEQUE!!! </span>'
            : '';

        // Agrupa apenas as mensagens existentes
        const comentarios = [aberturaInfo, avaliacaoMeioJogo]
            .filter(Boolean)
            .join("<br><br>");

        // Renderiza o HTML interpretando as tags <strong> e os <br>
        tipyng(`Joguei ${uci}.${avisoXeque}${comentarios ? "<br>" + comentarios : ""}`);
        pararPensamentoIAComentario();
    }
    processandoIA = false;

    // A IA terminou de jogar: libera o botão de desfazer
    podeDesfazer = true;
    atualizarBotaoDesfazer();
}

//==============Função para desfazer ultima jogada==================//
btnDesfazer.addEventListener('click', desfazerJogada);
function salvarEstadoJogo() {
    estadoAnterior = {
        // Copia a matriz do tabuleiro
        grid: JSON.parse(JSON.stringify(jogo.grid)),
        turno: jogo.turno,
        direitosRoque: JSON.parse(JSON.stringify(jogo.direitosRoque)),
        alvoEnPassant: jogo.alvoEnPassant ? { ...jogo.alvoEnPassant } : null,
        jogoFinalizado: jogo.jogoFinalizado,

        // Copia os arrays inteiros de capturas exatamente como estão agora
        capturadasPeloJogador: [...capturadasPeloJogador],
        capturadasPelaIA: [...capturadasPelaIA]
    };
}
function desfazerJogada() {
    if (!podeDesfazer || !estadoAnterior || processandoIA) return;


    // 1. Restaura o estado da classe do jogo
    jogo.grid = JSON.parse(JSON.stringify(estadoAnterior.grid));
    jogo.turno = estadoAnterior.turno;
    jogo.direitosRoque = JSON.parse(JSON.stringify(estadoAnterior.direitosRoque));
    jogo.alvoEnPassant = estadoAnterior.alvoEnPassant ? { ...estadoAnterior.alvoEnPassant } : null;
    jogo.jogoFinalizado = estadoAnterior.jogoFinalizado;

    // 2. Restaura os arrays de capturas copiando os valores salvos de volta
    capturadasPeloJogador.length = 0;
    capturadasPeloJogador.push(...estadoAnterior.capturadasPeloJogador);
    historicoLista.splice(-2); // Remove um lance inteiro do histórico de jogadas
    ultimoLance = null

    capturadasPelaIA.length = 0;
    capturadasPelaIA.push(...estadoAnterior.capturadasPelaIA);

    let resposta = calcularSaldoPorCapturas(capturadasPelaIA, capturadasPeloJogador);// Atualiza o saldo material
    saldoIA = resposta.vantagemIA;
    saldoJogador = resposta.vantagemJogador;

    // 3. Aplica as regras de trava do botão (só pode desfazer 1x)
    oportunidade--;
    podeDesfazer = false;
    estadoAnterior = null;
    atualizarBotaoDesfazer();

    // 4. Sincroniza o turno do relógio para o jogador
    if (typeof relogio.mudarTurno === 'function') {
        relogio.mudarTurno(jogo.turno);
    } else if (typeof relogio.alternarTurno === 'function') {
        relogio.alternarTurno();
    }

    // 5. Redesenha a tela e o painel de capturas
    if (typeof renderizarPecasCapturadas === 'function') {
        renderizarPecasCapturadas();
    }
    renderizarTabuleiro();
    tocarSom(audioMovimento);
}

// Auxiliar visual do botão no HTML
function atualizarBotaoDesfazer() {
    if (btnDesfazer) {
        const estaPermitido = podeDesfazer && oportunidade > 0;
        limparSelecao(); // Limpa seleção ao atualizar o botão
        btnDesfazer.disabled = !estaPermitido;

    }
}

//===========abandonar==========//
btnDesistir.addEventListener('click', desistirPartida);
function desistirPartida() {
    if (jogo.jogoFinalizado || processandoIA) return;
    
    const confirmou = confirm("Tem certeza de que deseja desistir da partida?");
    if (!confirmou) return;
    
    // Encerra a partida
    jogo.jogoFinalizado = true;
    if (relogio && typeof relogio.parar === 'function') {
        relogio.parar();
    }
    
    // Trava os controles
    podeDesfazer = false;
    atualizarBotaoDesfazer();
    
    finalizarPartida('derrota', 'DESISTÊNCIA');
}

/**
 * Função centralizada para encerrar a partida
*/
function finalizarPartida(resultado, motivo) {
    jogo.jogoFinalizado = true;
    
    if (relogio && typeof relogio.parar === 'function') {
        relogio.parar();
    }
    
    podeDesfazer = false;
    atualizarBotaoDesfazer();
    
    // Transforma o botão de Desistir em botão de Recomeçar
    btnDesistir.textContent = '🔄 Recomeçar';
    btnDesistir.addEventListener('click', () => {
        setTimeout(() => {
            window.location.reload();
        })
    })
    // comentario do stockfish
    pararTyping()
    if (resultado === 'vitoria') {
        elComentario.textContent = "Fim de jogo por " + motivo.toLowerCase() + "🤝🤯"
    } else {
        elComentario.textContent = "Fim de jogo por " + motivo.toLowerCase() + "🤝"
    }

    // Exibe o modal dinâmico
    exibirModalFimDeJogo(resultado, nivelDificuldade, motivo);
}


document.addEventListener('DOMContentLoaded', () => {
    const btnAbout = document.getElementById('btn-about');
    const modalAbout = document.getElementById('modal-about');
    const btnCloseAbout = document.getElementById('btn-close-about');

    // Abre o modal
    function openModal() {
        modalAbout.classList.remove('hidden');
        modalAbout.setAttribute('aria-hidden', 'false');
    }

    // Fecha o modal
    function closeModal() {
        modalAbout.classList.add('hidden');
        modalAbout.setAttribute('aria-hidden', 'true');
    }

    // Event Listeners
    btnAbout.addEventListener('click', openModal);
    btnCloseAbout.addEventListener('click', closeModal);

    // Fecha ao clicar na área escura fora do card
    modalAbout.addEventListener('click', (event) => {
        if (event.target === modalAbout) {
            closeModal();
        }
    });

    // Fecha ao pressionar a tecla 'ESC'
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalAbout.classList.contains('hidden')) {
            closeModal();
        }
    });
});