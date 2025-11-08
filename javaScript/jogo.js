const canvas = document.querySelector("canvas");// tag canvas
export const context = canvas.getContext("2d"); // essa constante chama os metodos de desenho do canvas
const display1 = document.querySelector("#tempo1");//relogio de cima
const display2 = document.querySelector("#tempo2");//relogio de baixo
const placar1 = document.querySelector("#placar1");//placar 1
const placar2 = document.querySelector("#placar2");//placar 2 
export const boardgame = new Array(64);// locais das casas do tabuleiro
let coordenate_x = 0;//horizontal
let coordenate_y = 0;//vertical
let casa = 0;//usado para atualização do tabuleiro
let invertido;// um Boolean: se escolher as pretas o tabuleiro é invertido;
let engine_level; // define dificuldade do jogo
export let timeIA;
export const brancas = 1; //time brancas
export const pretas = 0; //time pretas
export let isxeque;
import { calculateBishopDestinations, calculateKingDestinations, calculateKnightDestinations, calculatePawnDestinations, calculateQueenDestinations, calculateRookDestinations } from "./calculate_moves_utils.js";
import { setEnPassantSquare, gerarFENdoTabuleiro, extrairNotacaoDaResposta, enPassantSquare } from "./fen_utils.js";
import { nullCastleIAByMovePiece, placeNotationToSquare, isCasaSobAtaque, searchForIndexEnPassant, executeRoque, movePieceTransfer, putMessageOnDisplay, instanciarPecaPromovida, isMoveLegal } from "./rules_IA_utils.js";


async function callIA() {
    //const backendURL = "http://localhost:3000/api/jogada-ia";//teste
    const backendURL = "https://chess-stockfish-iota.vercel.app/api/jogada-ia";
    const estadoFEN = gerarFENdoTabuleiro(boardgame, turno, 1);
    try {
        const response = await fetch(backendURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fen: estadoFEN,
                level: engine_level
            })
        });
        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData)
            location.reload();
        } else {
            const data = await response.json();
            const movimentoIA = data.movimento;
            const isMate_String = data.ismate;
            aplicarMovimentoRecebido(movimentoIA);
            checkXequeMate(isMate_String)
        }

    } catch (error) {
        // erro se o servidor está off
        console.error("Erro na comunicação com o backend:", error);
        alert("Falha ao comunicar com o servidor da IA.");
        location.reload();
    }
}
/**
 * Executa um movimento recebido como string na notação algébrica (ex: "g1f3")
 * recebido da IA, e renderiza a mudança no canvas.
 * @param {string} textoBrutoIA - A string do movimento, ex: "e7e5", "g1f3".
 */
function aplicarMovimentoRecebido(textoBrutoIA) {
    // 1. Extração Limpa do Lance
    const movimento_IA = extrairNotacaoDaResposta(textoBrutoIA);
    let from, to, pieceIA, piecePlayer;

    //2. separa origem de destino
    const origemNotacao = movimento_IA.substring(0, 2);
    const destinoNotacao = movimento_IA.substring(2, 4);

    // 3. Encontra os objetos CASA
    from = boardgame.find(casa => casa.getIndex() === origemNotacao)// casa de origem
    to = boardgame.find(casa => casa.getIndex() === destinoNotacao) // casa de destino

    //3.1 Encontra as peças
    pieceIA = from.getPiece();
    piecePlayer = to ? to.getPiece() : null; // se houver peça do jogador na casa

    // 4. EXECUÇÃO DO MOVIMENTO
    const fromIndex = boardgame.indexOf(from)
    const toIndex = boardgame.indexOf(to);

    // 4.1 se for um peão, validar uma casa para o enpassant ou executar o enpassant e verificar promoção.
    let double_step = false; // flag para resetar ou não o estado de enpassant
    let isPromotion = false; // flag para promoção do peão 
    cancelEnPassant();
    if (pieceIA.getName() === "Peão") {
        const diff = Math.abs(fromIndex - toIndex);
        if (diff === 16) {// verifica se é um salto duplo e seta a casa de tras para EnPassant
            double_step = true;
            pieceIA.setDoubleStep(true);
            setEnPassantSquare(searchForIndexEnPassant(to, pieceIA.getTeam()));
        } else {
            if (to.getIndex() === enPassantSquare) { // verifica se a casa de destino é uma casa Enpassant
                console.log("enpassant!")
                let peca_enpassant = null;
                if (timeIA === brancas) { // identifica peça para eliminar
                    peca_enpassant = boardgame[toIndex + 8]
                }
                else {
                    peca_enpassant = boardgame[toIndex - 8]
                }
                peca_enpassant.clear(context) //elimina peça adversaria
                peca_enpassant.takeOffPiece()
            }
        }
        // 4.2 LÓGICA DE PROMOÇÃO: O lance tem 5 caracteres E a peça é um Peão
        if (movimento_IA.length === 5) {
            isPromotion = true; // Seta a flag de promoção para true
        }
    }

    //  4.3: EXECUÇÃO DA PROMOÇÃO (Substitui o Peão pela nova Peça)
    if (isPromotion) {
        // Pega o quinto caractere do lance ("q", "r", "b", "n")
        const pecaPromovidaChar = movimento_IA.charAt(4).toUpperCase(); // Ex: 'Q'
        // se for promoção, é um peão, e será instanciado uma nova peça na variável
        pieceIA = instanciarPecaPromovida(pecaPromovidaChar, to);
        from.takeOffPiece();
        from.clear(context) // Remove o objeto Peão
        to.placePiece(pieceIA);// Coloca o objeto Dama/Torre, etc.
        playPiece();
        playPromoSound()

    }

    // 4.4 se for um movimento de roque
    else if (pieceIA.getName() === 'Rei' && pieceIA.isFirstMove() && (Math.abs(fromIndex - toIndex) === 2)) {
        executeRoque(fromIndex, toIndex);
        playTakePiece();
    }
    else {
        // 4.5 se for movimento comum
        movePieceTransfer(fromIndex, toIndex);
        // 4.6 som do movimento
        if (piecePlayer || (pieceIA.getName() === "Peão" && to.getIndex() === enPassantSquare)) {
            playTakePiece();
        } else {
            playPiece();
        }
    }

    // 5. ATUALIZAÇÃO DO ESTADO APÓS MOVIMENTO
    if (!double_step) { setEnPassantSquare(null) }
    nullCastleIAByMovePiece(pieceIA);
    checkXeque();
    trocarTurno();
    startTimer()
    constRender(context, invertido);
    putMessageOnDisplay(textoBrutoIA);
    const estadoFEN = gerarFENdoTabuleiro(boardgame, turno, 1);
    console.log(`${estadoFEN}`)
}

//-----variáveis de tempo--------
export var segundosTempo1 = 59;
export var minutosTempo1 = 4;
export var segundosTempo2 = 59;
export var minutosTempo2 = 9;
export var tempo1;
export var tempo2;
export let placarBrancas = 0;
export let placarPretas = 0;
//-------------------------------


//----variáveis de movimentação------
let turno;
let casaAtual;
let casaAtualY;
let casaDestino;
let casaDestinoY;
let selectedPiece;
let pecaEliminada;
let casaEnPassant;
let casaRoqueDama;
let casaRoqueRei;
let torreDoRoque;
//-----------------------------------


//------cores------------------
const colorgreen = "#a5b647e8";
const colorred = "#cb343475";
const colorblue = "#068CCA"
const colorgrey = "#6d6315b5";
const colorOrangeRed = "#92060675";
//-----------------------------


//--------sons-------------
const audioButtonPlay = new Audio();
audioButtonPlay.src = "./sounds/botão.mp3";

const audioClockPlay = new Audio();
audioClockPlay.src = "./sounds/clock.mp3";

const audioWinPlay = new Audio();
audioWinPlay.src = "./sounds/win.mp3";

const audioPiece = new Audio();
audioPiece.src = "./sounds/chesspiece.mp3"

const audioClick = new Audio();
audioClick.src = "./sounds/click.mp3";

const audioPromoPawn = new Audio();
audioPromoPawn.src = "./sounds/promocao.mp3"

const audioXeque = new Audio();
audioXeque.src = "./sounds/xeque.mp3"

const audioMusic = new Audio();
audioMusic.src = "./sounds/music.mp3"
//--------------------------------------

//-----turno, xeque, xequemate------------
function trocarTurno() {//trocar vez na tela
    if (turno == brancas) {
        document.getElementById("vez").innerHTML = "é a vez das pretas";
        turno = pretas;

    } else {
        document.getElementById("vez").innerHTML = "é a vez das brancas";
        turno = brancas;
    }
    reset();
}
function verificarTurno() {
    var validarTurno;
    if (selectedPiece != null && selectedPiece.getTeam() == turno) {
        validarTurno = true;
    } else {
        validarTurno = false;
    }
    return validarTurno;
}
function alertTurno() {// para dizer quem ganhou.
    if (turno == brancas) {
        return "Pretas";
    } else {
        return "Brancas";
    }
}
function startTimer() {

    pausarTempo(turno);

    tempo1 = setInterval(function () {
        segundosTempo1--;//regressiva segundos
        if (segundosTempo1 < 0) {
            minutosTempo1--;
            segundosTempo1 = 59;
        }

        let minutos = minutosTempo1 < 10 ? "0" + minutosTempo1 : minutosTempo1;
        let segundos = segundosTempo1 < 10 ? "0" + segundosTempo1 : segundosTempo1;
        if (!invertido) {
            display1.textContent = minutos + ":" + segundos;
        } else {
            display2.textContent = minutos + ":" + segundos;
        }
        if (minutosTempo1 < 1 && segundosTempo1 < 31) {
            if (!invertido) {
                display1.style.backgroundColor = colorred;
            } else {
                display2.style.backgroundColor = colorred;
            }

            if (segundosTempo1 > 29) {
                playClockSound();
            }
        }

        //fim do tempo
        if (minutos == 0 && segundos == 0) {
            playWinSound()
            clearInterval(tempo1);
            setTimeout(function () {
                playTimeOverAlert();
                window.location.reload()
            }, 100)
        }

    }, 1000)

    tempo2 = setInterval(function () {
        segundosTempo2--;//regressiva segundos

        if (segundosTempo2 < 0) {
            minutosTempo2--;
            segundosTempo2 = 59;
        }

        let minutos = minutosTempo2 < 10 ? "0" + minutosTempo2 : minutosTempo2;
        let segundos = segundosTempo2 < 10 ? "0" + segundosTempo2 : segundosTempo2;
        if (invertido) {
            display1.textContent = minutos + ":" + segundos;
        } else {
            display2.textContent = minutos + ":" + segundos;
        }
        if (minutosTempo2 < 1 && segundosTempo2 < 31) {
            if (invertido) {
                display1.style.backgroundColor = colorred;
            } else {
                display2.style.backgroundColor = colorred;
            }

            if (segundosTempo2 > 29) {
                playClockSound();
            }
        }

        //fim do tempo
        if (minutos == 0 && segundos == 0) {
            playWinSound();
            clearInterval(tempo2);
            setTimeout(function () {
                playTimeOverAlert();
                window.location.reload();
            }, 100)

        }

    }, 1000)
    pausarTempo(turno);

}
function playTimeOverAlert() {//mensagem tempo esgotado
    alert("Tempo esgotado, " + alertTurno() + " vencem!")
}
function playXequeMateAlert() {//mensagem de xeque-mate
    alert("Xeque-Mate!!! " + alertTurno() + " vencem!");
}
function pausarTempo(turno) {
    if (turno == pretas) {
        clearInterval(tempo2);
    } else {
        clearInterval(tempo1);
    }
}
function checkXeque() {//conferir se o lance está em xeque
    isxeque = false;
    //move todos.
    for (let index = 0; index < boardgame.length; index++) {
        if (boardgame[index].getPiece() != null) {
            boardgame[index].getPiece().move(index);
        }
    }
    //acha o rei e verifica se está em xeque
    for (let int = 0; int < boardgame.length; int++) {
        var vez = turno == brancas ? "brancas" : "pretas"
        var Wking = new whiteKing(0, 0);
        var Bking = new blackKing(0, 0);
        boardgame[int].setInXeque(false);
        if (boardgame[int].getPiece() != null) {

            if ((Object.is(boardgame[int].getPiece().constructor, Bking.constructor)) || (Object.is(boardgame[int].getPiece().constructor, Wking.constructor))) {

                if (boardgame[int].getPiece().getAtacked()) {
                    document.getElementById("vez").innerHTML = "xeque! é a vez das " + vez;
                    boardgame[int].setInXeque(true);
                    isxeque = true;
                    playXequeSound();
                }
            }
        }

    }
    reset();
    return isxeque;
}
export function checkXequeMate(string) {//xeque-mate!!!
    if (string === "mate") {
        playWinSound()
        pausarTempo(!turno);
        canvas.classList.add('canvas-disabled');
        document.getElementById("vez").innerHTML = "xeque-mate! " +alertTurno()+ " vencem!!!";
        const btn = document.querySelector("#play");
        btn.disabled = false
        btn.value = "Reiniciar" 
        btn.removeAttribute("onclick");
        btn.addEventListener("click", function(){location.reload()})
        setTimeout(function () {
            playXequeMateAlert();
        }, 1000)
    }
}
//----------------------------------------

//-----toca os Sons---
function playButtonSound() {
    audioButtonPlay.play();
}
function playClockSound() {
    audioClockPlay.play();
}
function playClickSound() {
    audioClick.play();
}
function playWinSound() {
    audioWinPlay.play();
}
function playPiece() {
    audioPiece.play();
}
function playPromoSound() {
    audioPromoPawn.play();
}
function playTakePiece() {
    audioPiece.play();
    audioButtonPlay.play();
}
function playXequeSound() {
    audioXeque.play();
}
function playMusic() {
    audioMusic.play();
}
function stopMusic() {
    if (audioMusic.muted) {
        audioXeque.muted = false;
        audioButtonPlay.muted = false;
        audioClockPlay.muted = false;
        audioWinPlay.muted = false;
        audioPromoPawn.muted = false;
        audioPiece.muted = false;
        audioMusic.muted = false;
        document.querySelector("#volume").style.backgroundImage = "url(./img/volume.png)";

    } else {
        audioXeque.muted = true;
        audioButtonPlay.muted = true;
        audioClockPlay.muted = true;
        audioWinPlay.muted = true;
        audioPromoPawn.muted = true;
        audioPiece.muted = true;
        audioMusic.muted = true;
        document.querySelector("#volume").style.backgroundImage = "url(./img/mudo.png)";
    }
}
//--------------------


//---------movimentação e ataques-------
function instanciarClasse(params, x, y) {
    trocarTurno();
    startTimer();
    /*
    *  Essa função compara as Classes e o Parametro em nível de objeto, 
    *  A classe igual ao parametro precisa ser instanciada no Array de casas para ser desenhada.
    */
    var obj = Object.prototype.constructor(params);

    /*peças brancas*/
    var Wpawn = new whitePawn(x, y);
    var Wbishop = new whiteBishop(x, y);
    var Wking = new whiteKing(x, y);
    var Wcaslte = new whiteCastle(x, y);
    var WKnight = new whiteKnight(x, y);
    var WQueen = new whiteQueen(x, y);

    /*peças pretas */
    var Bpawn = new blackPawn(x, y);
    var Bbishop = new blackBishop(x, y);
    var Bking = new blackKing(x, y);
    var Bcaslte = new blackCastle(x, y);
    var BKnight = new blackKnight(x, y);
    var BQueen = new blackQueen(x, y);

    nullCastleIAByMovePiece(params);
    setEnPassantSquare(null);
    cancelEnPassant();

    if (Object.is(obj.constructor, Wpawn.constructor)) {
        Wpawn.setFirstMove(false);//regra de primeiro movimento do peão.

        if (casaAtualY - casaDestinoY > 20) {// verifica se é passo duplo do peão, para a regra do EnPassant.
            setEnPassantSquare(searchForIndexEnPassant(casaDestino, brancas));
            Wpawn.setDoubleStep(true);
        } else {
            Wpawn.setDoubleStep(false);
        }

        if (casaDestino.bounderyTop()) {//regra de promoção do peão. se chegar ao topo....
            playPromoSound();
            return WQueen;//...promovido!
        } else {
            return Wpawn; //continua peão.
        }

    }
    if (Object.is(obj.constructor, Wbishop.constructor)) {
        return Wbishop;
    }
    if (Object.is(obj.constructor, Wking.constructor)) {
        Wking.setFirstMove(false);
        return Wking;
    }
    if (Object.is(obj.constructor, Wcaslte.constructor)) {
        Wcaslte.setFirstMove(false);
        return Wcaslte;
    }
    if (Object.is(obj.constructor, WKnight.constructor)) {
        return WKnight;
    }
    if (Object.is(obj.constructor, WQueen.constructor)) {
        return WQueen;
    }
    if (Object.is(obj.constructor, Bpawn.constructor)) {
        Bpawn.setFirstMove(false);//regra de primeiro movimento do peão.
        if (casaDestinoY - casaAtualY > 20) {// verifica se é passo duplo do peão, para a regra do EnPassant.
            setEnPassantSquare(searchForIndexEnPassant(casaDestino, pretas));
            Bpawn.setDoubleStep(true);
        } else {
            Bpawn.setDoubleStep(false);
        }

        if (casaDestino.bounderyBottom()) {//regra de promoção do peão. se chegar ao topo....
            playPromoSound();
            return BQueen;//...promovido!
        } else {
            return Bpawn;//continua peão.
        }
    }
    if (Object.is(obj.constructor, Bbishop.constructor)) {
        return Bbishop;
    }
    if (Object.is(obj.constructor, Bking.constructor)) {
        Bking.setFirstMove(false);
        return Bking;
    }
    if (Object.is(obj.constructor, Bcaslte.constructor)) {
        Bcaslte.setFirstMove(false);
        return Bcaslte;
    }
    if (Object.is(obj.constructor, BKnight.constructor)) {
        return BKnight;
    }
    if (Object.is(obj.constructor, BQueen.constructor)) {
        return BQueen;
    }

}
function instanciarTorre(x, y) {
    var obj = Object.prototype.constructor(torreDoRoque);
    var Wcaslte = new whiteCastle(x, y);
    var Bcaslte = new blackCastle(x, y);
    if (Object.is(obj.constructor, Wcaslte.constructor)) {
        return Wcaslte;
    }
    if (Object.is(obj.constructor, Bcaslte.constructor)) {
        return Bcaslte;
    }
}
function verificaAtaque(valor) {
    var valida = false;
    if (boardgame[valor].getPiece().getAtacked() && selectedPiece != null) {
        pecaEliminada = boardgame[valor].getPiece();
        casaAtual.clear(context);
        casaAtual.takeOffPiece();
        casaDestino = boardgame[valor];//para o caso de promoção do peão;
        boardgame[valor].clear(context);
        boardgame[valor].takeOffPiece();
        pontuacao(pecaEliminada);
        boardgame[valor].placePiece(instanciarClasse(selectedPiece, boardgame[valor].x, boardgame[valor].y));
        checkXeque();
        valida = true;
        reset();
        playTakePiece();
        checkXequeMate(pecaEliminada);

        if (turno === timeIA) {
            callIA();
        }
    }
    return valida;
}
/**
 * metodo que pinta as casas de movimentação, iterando sobre o Array Boardgame
 * @param {Boolean} thisTeam cor da peça que está a movimentar
 * @param {Number} value indice de casa do tabuleiro para onde a peça vai
 */
function movement(value, thisTeam) {
    if (value <= boardgame.length && value >= 0) {
        if (boardgame[value].getPiece() == null) { //se a casa está vazia 
            boardgame[value].setSetted(true);// pinta de verde
        } else {
            var piece = boardgame[value].getPiece();//se a casa tem peça
            if (thisTeam != piece.getTeam()) {//se a peça é do adversário
                piece.setAtacado(true);//pinta a casa de vermelho
            }
        }
    }
}
export function pontuacao(piace) {
    var ponto;
    var obj = Object.prototype.constructor(piace);

    if (Object.is(obj.constructor, new whitePawn(0, 0).constructor) || Object.is(obj.constructor, new blackPawn(0, 0).constructor)) {
        ponto = 10;
    }

    if (Object.is(obj.constructor, new whiteKnight(0, 0).constructor) || Object.is(obj.constructor, new blackKnight(0, 0).constructor)) {
        ponto = 30;
    }

    if (Object.is(obj.constructor, new whiteBishop(0, 0).constructor) || Object.is(obj.constructor, new blackBishop(0, 0).constructor)) {
        ponto = 50;
    }

    if (Object.is(obj.constructor, new whiteCastle(0, 0).constructor) || Object.is(obj.constructor, new blackCastle(0, 0).constructor)) {
        ponto = 100;
    }

    if (Object.is(obj.constructor, new whiteQueen(0, 0).constructor) || Object.is(obj.constructor, new blackQueen(0, 0).constructor)) {
        ponto = 500;
    }

    if (Object.is(obj.constructor, new whiteKing(0, 0).constructor) || Object.is(obj.constructor, new blackKing(0, 0).constructor)) {
        ponto = 900;
    }
    pontuar(ponto)
}
export function pontuar(ponto) {
    if (ponto == undefined) {
        ponto = 0;
    }
    if (turno == brancas) {
        placarBrancas = parseInt(placarBrancas + ponto);
        placarPretas = parseInt(placarPretas - ponto);
    }
    if (turno == pretas) {
        placarPretas = parseInt(placarPretas + ponto);
        placarBrancas = parseInt(placarBrancas - ponto);

    }
    if (invertido) {
        placarBrancas = placarBrancas == 0 ? placar1.innerHTML = "" : placar1.innerHTML = placarBrancas;
        placarPretas = placarPretas == 0 ? placar2.innerHTML = "" : placar2.innerHTML = placarPretas;
    }
    if (!invertido) {
        placarBrancas = placarBrancas == 0 ? placar2.innerHTML = "" : placar2.innerHTML = placarBrancas;
        placarPretas = placarPretas == 0 ? placar1.innerHTML = "" : placar1.innerHTML = placarPretas;
    }

}
function pawnAttack(value, thisTeam) {
    //método para o ataque do peão, só ele ataca e se move de forma diferente.
    if (value < boardgame.length) {
        if (boardgame[value].getPiece() != null) {
            var piece = boardgame[value].getPiece();
            casaDestino = boardgame[value];//para o caso de promoção;
            if (!thisTeam == piece.getTeam()) {
                piece.setAtacado(true);
            }
        }
    }
}
function checkWhiteRoqueMove(casaDaTorre, casaDoRoque) {
    var isRookFirstMove;
    var obj;
    var WCastle = new whiteCastle(0, 0);
    var KING_INDEX = 60;
    const corAtacante = pretas; // A cor adversária
    let pathIsSafe = false; // Flag para determinar se o caminho está livre de ataques

    if (boardgame[casaDaTorre].getPiece() != null) {
        obj = Object.prototype.constructor(boardgame[casaDaTorre].getPiece());
        if (Object.is(obj.constructor, WCastle.constructor)) {
            isRookFirstMove = boardgame[casaDaTorre].getPiece().isFirstMove();
            if (isRookFirstMove != false && isxeque != true) {
                if (casaDaTorre === 63 && casaDoRoque === 62) {
                    // Checagem de Ataque: F1 (61), G1 (62) ROQUE CURTO
                    if (!isCasaSobAtaque(KING_INDEX + 1, corAtacante) // casa ao lado direito do rei (F1) 
                        && !isCasaSobAtaque(62, corAtacante) // G1
                    ) {
                        pathIsSafe = true;
                    }
                }
                else if (casaDaTorre === 56 && casaDoRoque === 58) {
                    // Checagem de Ataque: D1 (59), C1 (58) ROQUE GRANDE
                    if (!isCasaSobAtaque(KING_INDEX - 1, corAtacante) //D1 
                        && !isCasaSobAtaque(58, corAtacante) //C1
                    ) {
                        pathIsSafe = true;
                    }
                }
                // EXECUÇÃO: Apenas define o movimento se for seguro
                if (pathIsSafe) {
                    boardgame[casaDoRoque].setRoqueMove(true);
                    torreDoRoque = boardgame[casaDaTorre].getPiece();
                }
            }
        }
        if (casaDoRoque < casaDaTorre) {
            casaRoqueRei = boardgame[casaDaTorre];
        } else {
            casaRoqueDama = boardgame[casaDaTorre];
        }
    }
}

function checkBlackRoqueMove(casaDaTorre, casaDoRoque) {
    var isRookFirstMove;
    var obj;
    var BCastle = new blackCastle(0, 0);
    var KING_INDEX = 4;
    const corAtacante = brancas; // A cor adversária
    let pathIsSafe = false; // Flag para determinar se o caminho está livre de ataques

    if (boardgame[casaDaTorre].getPiece() != null) {
        obj = Object.prototype.constructor(boardgame[casaDaTorre].getPiece());
        if (Object.is(obj.constructor, BCastle.constructor)) {
            isRookFirstMove = boardgame[casaDaTorre].getPiece().isFirstMove();
            if (isRookFirstMove != false && isxeque != true) {
                if (casaDaTorre === 7 && casaDoRoque === 6) {
                    // Checagem de Ataque: F8 (5), G8 (6) ROQUE CURTO
                    if (!isCasaSobAtaque(KING_INDEX + 1, corAtacante) // casa ao lado direito do rei (F8) 
                        && !isCasaSobAtaque(6, corAtacante) // G8
                    ) {
                        pathIsSafe = true;
                    }
                }
                else if (casaDaTorre === 0 && casaDoRoque === 2) {
                    // Checagem de Ataque: D8 (3), C8 (2) ROQUE GRANDE
                    if (!isCasaSobAtaque(KING_INDEX - 1, corAtacante) //D8 
                        && !isCasaSobAtaque(2, corAtacante) //C8
                    ) {
                        pathIsSafe = true;
                    }
                }
                // EXECUÇÃO: Apenas define o movimento se for seguro
                if (pathIsSafe) {
                    boardgame[casaDoRoque].setRoqueMove(true);
                    torreDoRoque = boardgame[casaDaTorre].getPiece();
                }
            }
        }
        if (casaDoRoque < casaDaTorre) {
            casaRoqueRei = boardgame[casaDaTorre];
        } else {
            casaRoqueDama = boardgame[casaDaTorre];
        }
    }
}
function checkBlackPawnEnPassant(value) {
    var enpassant;
    var obj;
    var Bpawn = new blackPawn(0, 0);
    if (boardgame[value].getPiece()) {
        obj = Object.prototype.constructor(boardgame[value].getPiece());
        if (Object.is(obj.constructor, Bpawn.constructor)) {
            enpassant = boardgame[value].getPiece().isDoubleStep();
        }
    }
    if (enpassant == true) {
        casaEnPassant = boardgame[value];
        boardgame[value - 8].setEnpassant(true);
    }
}
function checkWhitePawnEnPassant(value) {
    var enpassant
    var obj;
    var Wpawn = new whitePawn(0, 0);
    if (boardgame[value].getPiece()) {
        obj = Object.prototype.constructor(boardgame[value].getPiece());
        if (Object.is(obj.constructor, Wpawn.constructor)) {
            enpassant = boardgame[value].getPiece().isDoubleStep();
        }
    }
    if (enpassant == true) {
        casaEnPassant = boardgame[value];
        boardgame[value + 8].setEnpassant(true);
    }

}
/**
 * seta para falso a propriedade de salto duplo de todos os peões do tabuleiro.
 * parte da logica de implementação do ataque enpassant. 
 */
function cancelEnPassant() {

    for (let int = 0; int < boardgame.length; int++) {

        if (boardgame[int].getPiece() != null) {

            if (boardgame[int].getPiece().getName() === "Peão") {
                boardgame[int].getPiece().setDoubleStep(false);
            }
        }
    }
}

//---------------------------------------


//------inicialização e atualização do Tabuleiro-------
function reset() {
    //apaga todas as cores nas casas, para alternar as peças escolhidas.
    for (let i = 0; i < boardgame.length; i++) {
        boardgame[i].setSetted(false);
        boardgame[i].setEnpassant(false);
        boardgame[i].setRoqueMove(false);
        if (boardgame[i].getPiece() != null && boardgame[i].getPiece().getAtacked() == true) {
            var piece = boardgame[i].getPiece();
            piece.setAtacado(false);
            piece.select = false;

        }

    }
}

//renderiza o tabuleiro e as peças
function render(ctx, invertido) {

    // percorre o Array instanciando objetos "casas"
    for (let i = 0; i < boardgame.length; i++) {

        boardgame[i] = new casas(coordenate_x, coordenate_y)
        boardgame[i].setIndex(placeNotationToSquare(i));
        coordenate_x += 37.8;
        casa++;
        if (casa == 8) {
            coordenate_y += 18.8;
            coordenate_x = 0;
            casa = 0;
        }
    }
    //coloca as peças no jogo
    coordenate_x = 0;
    coordenate_y = 0;
    //peças pretas
    boardgame[0].placePiece(new blackCastle(boardgame[0].x, boardgame[0].y)); boardgame[0].getPiece().printPiece(ctx, invertido);
    boardgame[1].placePiece(new blackKnight(boardgame[1].x, boardgame[1].y)); boardgame[1].getPiece().printPiece(ctx, invertido);
    boardgame[2].placePiece(new blackBishop(boardgame[2].x, boardgame[2].y)); boardgame[2].getPiece().printPiece(ctx, invertido);
    boardgame[3].placePiece(new blackQueen(boardgame[3].x, boardgame[3].y)); boardgame[3].getPiece().printPiece(ctx, invertido);
    boardgame[4].placePiece(new blackKing(boardgame[4].x, boardgame[4].y)); boardgame[4].getPiece().printPiece(ctx, invertido);
    boardgame[5].placePiece(new blackBishop(boardgame[5].x, boardgame[5].y)); boardgame[5].getPiece().printPiece(ctx, invertido);
    boardgame[6].placePiece(new blackKnight(boardgame[6].x, boardgame[6].y)); boardgame[6].getPiece().printPiece(ctx, invertido);
    boardgame[7].placePiece(new blackCastle(boardgame[7].x, boardgame[7].y)); boardgame[7].getPiece().printPiece(ctx, invertido);
    boardgame[8].placePiece(new blackPawn(boardgame[8].x, boardgame[8].y)); boardgame[8].getPiece().printPiece(ctx, invertido);
    boardgame[9].placePiece(new blackPawn(boardgame[9].x, boardgame[9].y)); boardgame[9].getPiece().printPiece(ctx, invertido);
    boardgame[10].placePiece(new blackPawn(boardgame[10].x, boardgame[10].y)); boardgame[10].getPiece().printPiece(ctx, invertido);
    boardgame[11].placePiece(new blackPawn(boardgame[11].x, boardgame[11].y)); boardgame[11].getPiece().printPiece(ctx, invertido);
    boardgame[12].placePiece(new blackPawn(boardgame[12].x, boardgame[12].y)); boardgame[12].getPiece().printPiece(ctx, invertido);
    boardgame[13].placePiece(new blackPawn(boardgame[13].x, boardgame[13].y)); boardgame[13].getPiece().printPiece(ctx, invertido);
    boardgame[14].placePiece(new blackPawn(boardgame[14].x, boardgame[14].y)); boardgame[14].getPiece().printPiece(ctx, invertido);
    boardgame[15].placePiece(new blackPawn(boardgame[15].x, boardgame[15].y)); boardgame[15].getPiece().printPiece(ctx, invertido);

    //peças brancas
    boardgame[48].placePiece(new whitePawn(boardgame[48].x, boardgame[48].y)); boardgame[48].getPiece().printPiece(ctx, invertido);
    boardgame[49].placePiece(new whitePawn(boardgame[49].x, boardgame[49].y)); boardgame[49].getPiece().printPiece(ctx, invertido);
    boardgame[50].placePiece(new whitePawn(boardgame[50].x, boardgame[50].y)); boardgame[50].getPiece().printPiece(ctx, invertido);
    boardgame[51].placePiece(new whitePawn(boardgame[51].x, boardgame[51].y)); boardgame[51].getPiece().printPiece(ctx, invertido);
    boardgame[52].placePiece(new whitePawn(boardgame[52].x, boardgame[52].y)); boardgame[52].getPiece().printPiece(ctx, invertido);
    boardgame[53].placePiece(new whitePawn(boardgame[53].x, boardgame[53].y)); boardgame[53].getPiece().printPiece(ctx, invertido);
    boardgame[54].placePiece(new whitePawn(boardgame[54].x, boardgame[54].y)); boardgame[54].getPiece().printPiece(ctx, invertido);
    boardgame[55].placePiece(new whitePawn(boardgame[55].x, boardgame[55].y)); boardgame[55].getPiece().printPiece(ctx, invertido);
    boardgame[56].placePiece(new whiteCastle(boardgame[56].x, boardgame[56].y)); boardgame[56].getPiece().printPiece(ctx, invertido);
    boardgame[57].placePiece(new whiteKnight(boardgame[57].x, boardgame[57].y)); boardgame[57].getPiece().printPiece(ctx, invertido);
    boardgame[58].placePiece(new whiteBishop(boardgame[58].x, boardgame[58].y)); boardgame[58].getPiece().printPiece(ctx, invertido);
    boardgame[59].placePiece(new whiteQueen(boardgame[59].x, boardgame[59].y)); boardgame[59].getPiece().printPiece(ctx, invertido);
    boardgame[60].placePiece(new whiteKing(boardgame[60].x, boardgame[60].y)); boardgame[60].getPiece().printPiece(ctx, invertido);
    boardgame[61].placePiece(new whiteBishop(boardgame[61].x, boardgame[61].y)); boardgame[61].getPiece().printPiece(ctx, invertido);
    boardgame[62].placePiece(new whiteKnight(boardgame[62].x, boardgame[62].y)); boardgame[62].getPiece().printPiece(ctx, invertido);
    boardgame[63].placePiece(new whiteCastle(boardgame[63].x, boardgame[63].y)); boardgame[63].getPiece().printPiece(ctx, invertido);
}
function constRender(ctx, inv) {

    //aqui é zerado a tela do canvas
    ctx.clearRect(0, 0, canvas.width, canvas.Height);

    //e aqui atualiza a tela,percorrendo o Array,atualizando as casas... esse metodo é chamado várias vezes.
    for (let i = 0; i < boardgame.length; i++) {
        if (boardgame[i].getPiece() != null) {
            boardgame[i].getPiece().printPiece(ctx, inv);

            if (boardgame[i].getPiece().getAtacked()) {
                boardgame[i].printFull(ctx, colorred);
            }


        } else {
            boardgame[i].clear(ctx);
        }
        if (boardgame[i].getCasaInXeque()) {
            boardgame[i].printFull(ctx, colorOrangeRed);
        }
        if (boardgame[i].getSetted()) {
            boardgame[i].printFull(ctx, colorgreen);
        }
        if (boardgame[i].getEnpassant()) {
            boardgame[i].printFull(ctx, colorred);
        }
        if (boardgame[i].getRoqueMove()) {
            boardgame[i].printFull(ctx, colorblue);
        }

    }
}
//-----------------------------------------------------


//-----construtor de peças e classe casas----
class casas {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.index = '';
        this.width = 33;
        this.height = 16;
        this.isFill = false;
        this.piece = null;
        this.set = false;
        this.casaEnPassant = false;
        this.casaRoqueMove = false;
        this.casainXeque = false;
    }
    print(ctx, color) {
        ctx.strokeStyle = color;
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.stroke();
    }
    placePiece(obj) {
        this.piece = obj;
        this.isFill = true;

    }
    takeOffPiece() {
        this.piece = null;
        this.isFill = false;
    }
    printFull(ctx, color) {
        ctx.fillStyle = color;
        ctx.fillRect(this.x + 1, this.y + 1, this.width, this.height);
        ctx.fill();

    }
    clear(ctx) {
        ctx.clearRect(this.x, this.y, 35, 19);
    }
    calcDistance(mouseX, mouseY) {
        var left = this.x
        var right = this.x + (this.width);
        var top = this.y;
        var bottom = this.y + (this.height);
        if (mouseX > left && mouseX < right && mouseY > top && mouseY < bottom) {
            return true;
        } else {
            return false;
        }
    }
    calcBoundery() {
        var left = this.x
        var right = this.x + (this.width);
        var top = this.y;
        var bottom = this.y + (this.height);


        if (left - 1 < 0 ||
            right + 5 > 300 ||
            top - 1 < 0 ||
            bottom + 10 > 150) {
            return true;
        } else {
            return false;
        }
    }
    bounderyLeft() {
        var left = this.x;
        if (left - 1 < 0) {
            return true;
        } else {
            return false;
        }
    }
    bounderyRight() {
        var right = this.x + (this.width);
        if (right + 5 > 300) {
            return true;
        } else {
            return false;
        }
    }
    bounderyTop() {
        var top = this.y;
        if (top - 1 < 0) {
            return true;
        } else {
            return false;
        }
    }
    bounderyBottom() {
        var bottom = this.y + (this.height);
        if (bottom + 10 > 150) {
            return true;
        } else {
            return false;
        }
    }
    setIndex(index) {
        this.index = index;
    }
    setEnpassant(set) {
        this.casaEnPassant = set;
    }
    setSetted(set) {
        this.set = set;
    }
    setRoqueMove(set) {
        this.casaRoqueMove = set;
    }
    setInXeque(set) {
        this.casainXeque = set;
    }
    setFill(set) {
        this.isFill = set;
    }
    isFilled() {
        return this.isFill;
    }
    getIndex() {
        return this.index;
    }
    getPiece() {
        return this.piece;
    }
    getSetted() {
        return this.set;
    }
    getEnpassant() {
        return this.casaEnPassant;
    }
    getRoqueMove() {
        return this.casaRoqueMove;
    }
    getCasaInXeque() {
        return this.casainXeque;
    }
}
class piece {
    //classe pai das classes de peça, todas recebem "coordenadas" quando forem instanciadas
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}
//-------------------------------------------


//----desenhar peças-------
function draw(img, ctx, x, y) {//desenha imagem(as figuras das peças)
    ctx.drawImage(img, x, y, 35, 18);
}
function drawInv(img, ctx, x, y) {//desenha imagem invertida(se o tabuleiro está invertido)
    ctx.drawImage(img, x, y, 34, 34, x - 35, x - 18, 35, 18);
}
function printThis(ctx, x, y, inv, img) {//chama os metodos de desenho do canvas
    if (inv == false) {
        draw(img, ctx, x, y);
    } else {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI);
        drawInv(img, ctx, 0, 0);
        ctx.restore();
    }
}
//---------------------------



//--------peças brancas---------
export class whiteCastle extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = "Torre";
        this.select = false;
        this.atacked = false;
        this.firstmove = true;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 100;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return brancas;
    }
    setFirstMove(set) {
        this.firstmove = set;
    }
    isFirstMove() {
        return this.firstmove;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_brancas/white_Castle.png";
        this.erasePiece(ctx);
        printThis(ctx, this.x, this.y, inv, image)
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateRookDestinations(index, color)
    }
    move(value) {
        var movimentos = calculateRookDestinations(value, brancas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], brancas)) {

                movement(movimentos[i], brancas)
            }
        }
    }
}
class whiteKing extends piece {

    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = "Rei";
        this.select = false;
        this.atacked = false;
        this.firstmove = true;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 900;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return brancas;
    }
    setFirstMove(set) {
        this.firstmove = set;
    }
    isFirstMove() {
        return this.firstmove;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_brancas/white_King.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image)

    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateKingDestinations(index, color)
    }
    move(value) {
        var movimentos = calculateKingDestinations(value, brancas)
        for (var i = 0; i < movimentos.length; i++) {
            if (!isCasaSobAtaque(movimentos[i], pretas) && isMoveLegal(value, movimentos[i], brancas)) {

                movement(movimentos[i], brancas)
            }
        }
        if (this.firstmove === true && boardgame[value + 1].getPiece() == null && boardgame[value + 2].getPiece() == null) {
            checkWhiteRoqueMove(value + 3, value + 2);
        }
        if (this.firstmove === true && boardgame[value - 1].getPiece() == null && boardgame[value - 2].getPiece() == null && boardgame[value - 3].getPiece() == null) {
            checkWhiteRoqueMove(value - 4, value - 2);
        }
    }
}
export class whiteBishop extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Bispo';
        this.select = false;
        this.atacked = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 50;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return brancas;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_brancas/white_Bishop.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateBishopDestinations(index, color)
    }
    move(value) {

        var movimentos = calculateBishopDestinations(value, brancas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], brancas)) {

                movement(movimentos[i], brancas)
            }
        }
    }
}
export class whiteKnight extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Cavalo'
        this.select = false;
        this.atacked = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 30;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return brancas;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_brancas/white_Knight.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateKnightDestinations(index, color)
    }
    move(value) {

        var movimentos = calculateKnightDestinations(value, brancas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], brancas)) {

                movement(movimentos[i], brancas)
            }
        }
    }
}
export class whiteQueen extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Dama'
        this.select = false;
        this.atacked = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 500;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return brancas;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_brancas/White_Queen.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateQueenDestinations(index, color);
    }
    move(value) {
        var movimentos = calculateQueenDestinations(value, brancas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], brancas)) {
                movement(movimentos[i], brancas)
            }
        }
    }

}
class whitePawn extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Peão'
        this.select = false;
        this.atacked = false;
        this.firstmove = true;
        this.doubleStep = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 10;
    }
    setDoubleStep(value) {
        this.doubleStep = value;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return brancas;
    }
    setFirstMove(set) {
        this.firstmove = set;
    }
    isFirstMove() {
        return this.firstmove;
    }
    isDoubleStep() {
        return this.doubleStep;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_brancas/white_Pone.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(value, color) {
        var movesAtackPawn = calculatePawnDestinations(value, color, this.firstmove)
        return movesAtackPawn[1];
    }
    calculateMovesForIA(value, color) {
        return calculatePawnDestinations(value, color, this.firstmove);
    }
    move(value) {
        var movimentos = calculatePawnDestinations(value, brancas, this.firstmove)
        var movefowards = movimentos[0];
        var moveAtack = movimentos[1]
        for (var i = 0; i < movefowards.length; i++) {
            const targetIndex = movefowards[i];
            if (isMoveLegal(value, targetIndex, brancas)) {
                movement(targetIndex, brancas)
            }
        }
        for (let i = 0; i < moveAtack.length; i++) {
            const targetIndex = moveAtack[i];
            if (isMoveLegal(value, targetIndex, brancas)) {

                pawnAttack(targetIndex, brancas)
            }

        }
        checkBlackPawnEnPassant(value + 1);
        checkBlackPawnEnPassant(value - 1);
    }
}
//-------------------------------


//---------peças pretas----------
export class blackCastle extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = "Torre";
        this.select = false;
        this.atacked = false;
        this.firstmove = true;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getSelect() {
        return this.select;
    }
    getPontos() {
        return 100;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return pretas;
    }
    setFirstMove(set) {
        this.firstmove = set;
    }
    isFirstMove() {
        return this.firstmove;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_negras/black_Castle.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateRookDestinations(index, color);
    }
    move(value) {
        var movimentos = calculateRookDestinations(value, pretas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], pretas)) {

                movement(movimentos[i], pretas)
            }
        }
    }
}
class blackKing extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = "Rei";
        this.select = false;
        this.atacked = false;
        this.firstmove = true;
    }
    getName() {
        return this.name;
    }

    setAtacado(set) {
        this.atacked = set;
    }
    getSelect() {
        return this.select;
    }
    getPontos() {
        return 900;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return pretas;
    }
    setFirstMove(set) {
        this.firstmove = set;
    }
    isFirstMove() {
        return this.firstmove;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_negras/black_King.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateKingDestinations(index, color);
    }
    move(value) {
        var movimentos = calculateKingDestinations(value, pretas)
        for (var i = 0; i < movimentos.length; i++) {
            if (!isCasaSobAtaque(movimentos[i], brancas) && isMoveLegal(value, movimentos[i], pretas)) {
                movement(movimentos[i], pretas)
            }
        }
        if (this.firstmove === true && boardgame[value + 1].getPiece() == null && boardgame[value + 2].getPiece() == null) {
            checkBlackRoqueMove(value + 3, value + 2);
        }
        if (this.firstmove === true && boardgame[value - 1].getPiece() == null && boardgame[value - 2].getPiece() == null && boardgame[value - 3].getPiece() == null) {
            checkBlackRoqueMove(value - 4, value - 2);
        }

    }
}
export class blackBishop extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Bispo'
        this.select = false;
        this.atacked = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 50;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return pretas;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_negras/Black_Bishop.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateBishopDestinations(index, color)
    }
    move(value) {
        var movimentos = calculateBishopDestinations(value, pretas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], pretas)) {

                movement(movimentos[i], pretas)
            }
        }
    }
}
export class blackKnight extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Cavalo'
        this.select = false;
        this.atacked = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 30;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return pretas;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_negras/black_knight.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateKnightDestinations(index, color);
    }
    move(value) {

        var movimentos = calculateKnightDestinations(value, pretas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], pretas)) {

                movement(movimentos[i], pretas)
            }
        }
    }
}
export class blackQueen extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Dama'
        this.select = false;
        this.atacked = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    getPontos() {
        return 500;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return pretas;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_negras/Queen.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMoves(index, color) {
        return calculateQueenDestinations(index, color);
    }
    move(value) {
        var movimentos = calculateQueenDestinations(value, pretas)
        for (var i = 0; i < movimentos.length; i++) {
            if (isMoveLegal(value, movimentos[i], pretas)) {

                movement(movimentos[i], pretas)
            }
        }
    }
}
class blackPawn extends piece {
    constructor(x, y) {
        super(x, y)
        this.x = x;
        this.y = y;
        this.name = 'Peão'
        this.select = false;
        this.atacked = false;
        this.firstmove = true;
        this.doubleStep = false;
    }
    getName() {
        return this.name;
    }
    setAtacado(set) {
        this.atacked = set;
    }
    setDoubleStep(value) {
        this.doubleStep = value;
    }
    getPontos() {
        return 10;
    }
    getSelect() {
        return this.select;
    }
    getAtacked() {
        return this.atacked;
    }
    getTeam() {
        return pretas;
    }
    setFirstMove(set) {
        this.firstmove = set;
    }
    isFirstMove() {
        return this.firstmove;
    }
    isDoubleStep() {
        return this.doubleStep;
    }
    printPiece(ctx, inv) {
        var image = new Image();
        image.src = "./img/peças_negras/black_Pone.png";
        ctx.clearRect(this.x, this.y, 35, 18);
        printThis(ctx, this.x, this.y, inv, image);
    }
    erasePiece(ctx) {
        ctx.clearRect(this.x, this.y, 35, 18);
    }
    calculateMovesForIA(value, color) {
        return calculatePawnDestinations(value, color, this.firstmove);
    }
    calculateMoves(index, color) {
        var moves = calculatePawnDestinations(index, color, this.firstmove)
        return moves[1]
    }
    move(value) {
        var movimentos = calculatePawnDestinations(value, pretas, this.firstmove)
        var movefowards = movimentos[0];
        var moveAtack = movimentos[1]
        for (var i = 0; i < movefowards.length; i++) {
            let targetIndex = movefowards[i];
            if (isMoveLegal(value, targetIndex, pretas)) {
                movement(targetIndex, pretas)
            }
        }
        for (let i = 0; i < moveAtack.length; i++) {
            let targetIndex = moveAtack[i]
            if (isMoveLegal(value, targetIndex, pretas)) {
                pawnAttack(targetIndex, pretas)
            }

        }
        checkWhitePawnEnPassant(value + 1);
        checkWhitePawnEnPassant(value - 1);

    }
}
//-------------------------------

//----botoes da pagina-----------
let option_color, option_level;
function desabilitarPlay() {
    document.querySelector("#play").disabled = true;
    document.querySelector("#volume").disabled = true;
}
function habilitarPlay() {
    if(option_color && option_level){
        document.querySelector("#play").disabled = false;
    }
}
function escolherCor(valor) {
    if (valor == "brancas") {
        canvas.style.rotate = "0deg";
        invertido = false;
        timeIA = pretas;
        render(context, invertido);
        option_color = true
        habilitarPlay();
        playButtonSound();//som

    } if (valor == "negras") {
        canvas.style.rotate = "180deg";
        invertido = true;
        timeIA = brancas;
        render(context, invertido)
        option_color = true
        habilitarPlay();
        playButtonSound();//som

    }

}
function escolherNivel(id) {
    if (id === "facil" ? engine_level = 1 : engine_level = 5)
    document.getElementById("vez").innerHTML = "escolha a cor das peças";
    document.getElementById("option-level").style.display = "none";
    document.getElementById("option-color").style.display = "block"
    option_level = true;
}
function play() {
    document.querySelector("#play").style.border = 0;
    document.querySelector("#play").disabled = true;
    document.querySelector("#brancas").disabled = true;
    document.querySelector("#negras").disabled = true;
    document.getElementById("vez").innerHTML = "é a vez das brancas";
    document.querySelector("#volume").disabled = false;
    turno = brancas;
    playClickSound();//som
    playMusic();

    if (timeIA === brancas) {
        callIA();
    }
    //hover--------------------
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        let x;
        let y;
        if (!invertido) {
            x = (event.clientX - (rect.left + 23)) * (canvas.width + 50) / rect.width;
            y = (event.clientY - (rect.top + 23)) * (canvas.height + 20) / rect.height;
        }
        if (invertido) {
            x = -(event.clientX - (rect.right - 23)) * (canvas.width + 50) / rect.width;
            y = -(event.clientY - (rect.bottom - 23)) * (canvas.height + 20) / rect.height;
        }
        constRender(context, invertido);
        for (let i = 0; i < boardgame.length; i++) {

            if (boardgame[i].calcDistance(x, y)) {
                boardgame[i].printFull(context, colorgrey);
            }
        }
    })
    //---------------------------

    //Selecionar e Mover
    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        let x;
        let y;
        if (!invertido) {
            x = (event.clientX - (rect.left + 23)) * (canvas.width + 50) / rect.width;
            y = (event.clientY - (rect.top + 23)) * (canvas.height + 20) / rect.height;

        }
        if (invertido) {
            x = -(event.clientX - (rect.right - 23)) * (canvas.width + 50) / rect.width;
            y = -(event.clientY - (rect.bottom - 23)) * (canvas.height + 20) / rect.height;
        }

        if (turno !== timeIA) {
            for (let i = 0; i < boardgame.length; i++) {

                if (boardgame[i].calcDistance(x, y)) {

                    //*****se a casa selecionada estiver preenchida, será guardada a peça e a casa atual 
                    if (boardgame[i].isFilled()) {
                        if (!verificaAtaque(i)) {// verifica se o movimento é um ataque. se não for, segue o fluxo.
                            reset();
                            selectedPiece = boardgame[i].getPiece(); //guarda a peça selecionada
                            casaAtual = boardgame[i]; //guarda a casa da peça selecionada;
                            casaAtualY = boardgame[i].y; //guarda a coordenada da peça selecionada
                            if (verificarTurno()) {
                                selectedPiece.move(i); //chama a função de movimentação da peça;
                            }
                        }

                        //*****se a casa não tiver peça e estiver setada(verde), a peça guardada será colocada na casa clicada 
                    } else {
                        if (boardgame[i].getSetted()) {
                            reset();
                            casaDestino = boardgame[i];  //guarda a casa que será colocada a peça;
                            casaDestinoY = boardgame[i].y; //guarda a coordenada da casa em que será colocada a peça
                            casaAtual.clear(context); //apaga a imagem da peça na casa onde estava anteriormente.
                            casaAtual.takeOffPiece(); //set null no atributo PEÇA da CASA anterior. 
                            casaDestino.placePiece(instanciarClasse(selectedPiece, boardgame[i].x, boardgame[i].y));// instancia a peça na casa selecionada.
                            checkXeque();
                            playPiece();//som
                            if (turno === timeIA) {
                                callIA();
                            }

                        }
                        //********regra do Enpassant  
                        if (boardgame[i].getEnpassant()) {
                            reset();
                            casaDestino = boardgame[i];  //guarda a casa que será colocada a peça;
                            casaAtual.clear(context); //apaga a imagem da peça na casa onde estava anteriormente.
                            casaAtual.takeOffPiece(); //set null no atributo PEÇA da CASA anterior.
                            pontuacao(casaEnPassant.getPiece());//pontuação
                            casaEnPassant.clear(context); //apaga a imagem da peça
                            casaEnPassant.takeOffPiece(); //set null no atributo PEÇA da CASA.
                            casaDestino.placePiece(instanciarClasse(selectedPiece, boardgame[i].x, boardgame[i].y));// instancia a peça na casa selecionada.
                            console.log(gerarFENdoTabuleiro(boardgame, turno, 1));
                            checkXeque();
                            playTakePiece();
                            if (turno === timeIA) {
                                callIA();
                            }

                        }
                        //********regra do Roque
                        if (boardgame[i].getRoqueMove()) {

                            //==================ROQUE DO LADO DO REI=====================

                            if (boardgame[i].x > casaAtual.x) {
                                reset();
                                casaAtual.clear(context); //apaga a imagem da peça na casa onde estava anteriormente.
                                casaAtual.takeOffPiece(); //set null no atributo PEÇA da CASA anterior.
                                casaRoqueRei.clear(context);//apaga a torre da casa
                                casaRoqueRei.takeOffPiece();//set null no atributo PEÇA da CASA.

                                // instancia a peça na casa selecionada.
                                boardgame[i].placePiece(instanciarClasse(selectedPiece, boardgame[i].x, boardgame[i].y));
                                //instancia a torre na nova casa, usa função única *para não quebrar o sistema de turno
                                boardgame[i - 1].placePiece(instanciarTorre(boardgame[i - 1].x, boardgame[i - 1].y));
                                playTakePiece();//som
                                checkXeque();
                                if (turno === timeIA) {
                                    callIA();
                                }
                                reset();
                            }

                            //==================ROQUE DO LADO DA DAMA=====================

                            if (boardgame[i].x < casaAtual.x) {
                                reset();
                                casaAtual.clear(context); //apaga a imagem da peça na casa onde estava anteriormente.
                                casaAtual.takeOffPiece(); //set null no atributo PEÇA da CASA anterior.
                                casaRoqueDama.clear(context);//apaga a torre da casa
                                casaRoqueDama.takeOffPiece();//set null no atributo PEÇA da CASA.

                                // instancia a peça na casa selecionada.
                                boardgame[i].placePiece(instanciarClasse(selectedPiece, boardgame[i].x, boardgame[i].y));
                                //instancia a torre na nova casa, usa função única *para não quebrar o sistema de turno
                                boardgame[i + 1].placePiece(instanciarTorre(boardgame[i + 1].x, boardgame[i + 1].y));


                                playTakePiece();//som
                                checkXeque();
                                if (turno === timeIA) {
                                    callIA();
                                }
                                reset();
                            }

                        }
                        else {
                            //*****se a casa não esta ocupada nem setada(verde), só apaga as cores do tabuleiro
                            reset()
                        }

                    }

                }
            }
            constRender(context, invertido);
        }

    })
}
window.desabilitarPlay = desabilitarPlay;
window.escolherNivel = escolherNivel;
window.escolherCor = escolherCor;
window.play = play;
window.stopMusic = stopMusic;
//-------------------------------