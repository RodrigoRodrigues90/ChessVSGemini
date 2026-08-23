
const mensagensDerrota = {
    iniciante: [
        "Xeque-mate. O xadrez exige pratica." + "\n" + "Tente de novo.",
        "Xeque-mate. A maquina vence a capivara." + "\n" + "Tente de novo.",
        "Xeque-mate. A maquina vence com o mínimo de cálculo." + "\n" + "Tente de novo."
    ],

    medio: [
        "Xeque-mate. Talvez valha a pena tentar de novo.." + "\n" + "..no nível iniciante.",
        "Xeque-mate. O peixe vence de novo!!!" + "\n" + "Tente novamente.",
        "Xeque-mate. O nível médio exige concentração." + "\n" + "Tente de novo.",
    ],

    avancado: [
        "Xeque-mate. Nem Kasparov venceria o peixe nesse nível." + "\n" + "Tente de novo.",
        "Xeque-mate. Nem Bobby Fischer venceria o peixe nesse nível." + "\n" + "Tente de novo.",
        "Xeque-mate. Magnus Carlsen talvez chegaria perto, você nunca!" + "\n" + "Tente de novo."
    ]
};
const mensagensVitoria = {
    iniciante: [
        "Xeque-mate! Você sabe jogar xadrez, parabéns! 👏🏻",
        "Xeque-mate! Venceu o peixe no nível iniciante. 🐣",
        "Xeque-mate! A capivara desta vez foi a máquina. ♟️",
        "Xeque-mate! Grande vitória, hora de subir o nível?"
    ],

    medio: [
        "Xeque-mate! Ótima leitura tática na partida. 👏🏻",
        "Xeque-mate! Vencer o nível médio exige respeito.👏🏻",
        "Xeque-mate! Partida sólida, visão tática afiada.🧠"
    ],

    avancado: [
        "Xeque-mate! Vitória impressionante digna de mestre! 🤯",
        "Xeque-mate! Ou você é Grandmaster ou usou outra engine! 🔍",
        "Xeque-mate! Ora Ora, temos um Bobby Fischer aqui. 🤯"
    ]
};
/**
 * Exibe o modal de fim de jogo com título e descrição personalizados.
 * 
 * @param {string|null} resultado - 'vitoria' | 'derrota' | 'empate'
 * @param {number} nivelDificuldade - Nível da IA (1 a 20)
 * @param {string} [motivo] - Ex: 'XEQUE_MATE', 'TEMPO', 'AFOGAMENTO', 'DESISTENCIA'
 */
export function exibirModalFimDeJogo(resultado, nivelDificuldade, motivo = '') {
    const modal = document.getElementById('modal-fim-de-jogo');
    const modalConteudo = document.getElementById('modal-final')
    const elTitulo = document.getElementById('titulo-fim-de-jogo');
    const elDescricao = document.getElementById('descricao-fim-de-jogo');
    const btnFecharModal = document.querySelector('#modal-fim-de-jogo button');
    btnFecharModal.addEventListener('click', () => fecharModalFimDeJogo());

    if (!modal || !elTitulo || !elDescricao) return;

    let titulo = '';
    let descricao = '';

    // Define os textos baseados no resultado e na dificuldade
    switch (resultado) {
        case 'vitoria':
            titulo = '🏆 Você Ganhou!';
            modalConteudo.classList.add('modal-vitoria')
            if (motivo === 'TEMPO') {
                descricao = 'Esperto! Você cozinhou o peixe até a vitória!😉';
            }
            else if (nivelDificuldade <= 3) {
                descricao = pegarFraseAleatoria(mensagensVitoria.iniciante);
            }
            else if (nivelDificuldade <= 10) {
                descricao = pegarFraseAleatoria(mensagensVitoria.medio);
            }
            else {
                descricao = pegarFraseAleatoria(mensagensVitoria.avancado);
            }
            break;

        case 'derrota':
            titulo = 'Você Perdeu';
            modalConteudo.classList.add('modal-derrota')
            if (motivo === 'DESISTÊNCIA') {
                descricao = 'Já vai? Derrota por abandono de partida. 🏳️';
            }
            else if (motivo === 'TEMPO') {
                descricao = 'Seu tempo acabou! Fique de olho no relógio na próxima. ⏰';
            }
            else if (nivelDificuldade <= 3) {
                descricao = pegarFraseAleatoria(mensagensDerrota.iniciante);
            }
            else if (nivelDificuldade <= 10) {
                descricao = pegarFraseAleatoria(mensagensDerrota.medio);
            }
            else {
                descricao = pegarFraseAleatoria(mensagensDerrota.avancado);
            }
            break;

        case 'empate':
        default:
            titulo = '🤝 Empate';
            modalConteudo.classList.add('modal-empate')
            if (motivo === 'AFOGAMENTO') {
                descricao = 'Empate por afogamento (Stalemate)! O rei não tem lances legais disponíveis, mas não está em xeque.';
            } else {
                descricao = 'Uma partida muito equilibrada! Nenhum dos lados conseguiu a vantagem decisiva.';
            }
            break;
    }
    // Preenche o modal e o exibe
    elTitulo.textContent = titulo;
    elDescricao.textContent = descricao;
    modal.classList.remove('modal-oculto');
}

// Função auxiliar para sortear um item da lista
function pegarFraseAleatoria(lista) {
    const indice = Math.floor(Math.random() * lista.length);
    return lista[indice];
}

/**
 * Esconde o modal de fim de jogo.
 */
export function fecharModalFimDeJogo() {
    const modal = document.getElementById('modal-fim-de-jogo');
    if (modal) {
        modal.classList.add('modal-oculto');
    }
}