import {
    carregarSons,
    setSFXAtivo,
    setVolumeMusica,
    obterConfiguracoesAudio
} from './service/audio.js';
import {
    estadoJogo,
    iniciarJogo,
    desfazerJogada,
    desistirPartida
} from './controller/gameController.js';

// Elements da DOM para Modais e Seleção
const nivelTitulo = document.getElementById('nivel-titulo');
const modalCor = document.getElementById('modal-selecao-cor');
const modalDificuldade = document.getElementById('modal-dificuldade');

const btnBrancas = document.getElementById('btn-jogar-brancas');
const btnPretas = document.getElementById('btn-jogar-pretas');
const btnsDificuldade = document.querySelectorAll('.btn-dificuldade');

const btnDesfazer = document.getElementById('btn-desfazer');
const btnDesistir = document.getElementById('btn-desistir');

//=============== INICIALIZAÇÃO ===============//
document.addEventListener('DOMContentLoaded', () => {
    carregarSons();
    configurarModalAbout();
    configurarModalSettings();
});

//--------------- SELEÇÃO DE COR ----------------//
btnBrancas?.addEventListener('click', () => selecionarCor('w'));
btnPretas?.addEventListener('click', () => selecionarCor('b'));

function selecionarCor(cor) {
    estadoJogo.corJogador = cor;
    estadoJogo.corIA = cor === 'w' ? 'b' : 'w';

    modalCor.classList.add('fade-out');
    modalDificuldade.classList.remove('modal-oculto');
}

//--------------- DIFICULDADE E INÍCIO ----------------//
btnsDificuldade.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const nivel = parseInt(target.dataset.level, 10);

        estadoJogo.nivelDificuldade = nivel;
        modalDificuldade.classList.add('fade-out');

        definirRotuloDificuldade(nivel);
        iniciarJogo();
    });
});

function definirRotuloDificuldade(nivel) {
    if (!nivelTitulo) return;
    switch (nivel) {
        case 1:
            nivelTitulo.textContent = '(Iniciante)';
            break;
        case 10:
            nivelTitulo.textContent = '(Médio)';
            break;
        case 20:
            nivelTitulo.textContent = '(Avançado)';
            break;
    }
}

//--------------- AÇÕES DA PARTIDA ----------------//
btnDesfazer?.addEventListener('click', desfazerJogada);
btnDesistir?.addEventListener('click', desistirPartida);

//--------------- MODAL "SOBRE" (ABOUT) ----------------//
function configurarModalAbout() {
    const btnAbout = document.getElementById('btn-about');
    const modalAbout = document.getElementById('modal-about');
    const btnCloseAbout = document.getElementById('btn-close-about');

    if (!btnAbout || !modalAbout) return;

    const openModal = () => {
        modalAbout.classList.remove('hidden');
        modalSettings.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        modalAbout.classList.add('hidden');
        modalSettings.setAttribute('aria-hidden', 'true');
    };

    btnAbout.addEventListener('click', openModal);
    btnCloseAbout.addEventListener('click', closeModal);

    modalAbout.addEventListener('click', (event) => {
        if (event.target === modalAbout) closeModal();
    });
}

//-------------MODAL SETTINGS----------------//
function configurarModalSettings() {
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnCloseSettings = document.getElementById('btn-close-setings');

    const sfxToggle = document.getElementById('sfx-toggle');
    const musicVolume = document.getElementById('music-volume');
    const musicVolumeValue = document.getElementById('music-volume-value');

    if (!modalSettings) return;

    // Sincroniza os inputs da interface com os valores salvos no localStorage
    const configs = obterConfiguracoesAudio();
    if (sfxToggle) sfxToggle.checked = configs.sfxAtivo;
    if (musicVolume) musicVolume.value = configs.volumePercentual;
    if (musicVolumeValue) musicVolumeValue.textContent = `${configs.volumePercentual}%`;

    // Listeners dos Controles
    sfxToggle?.addEventListener('change', (e) => {
        setSFXAtivo(e.target.checked);
    });

    musicVolume?.addEventListener('input', (e) => {
        const valor = e.target.value;
        if (musicVolumeValue) musicVolumeValue.textContent = `${valor}%`;
        setVolumeMusica(valor);
    });

    // Funções de Abrir/Fechar Modal
    const openModal = () => {
        modalSettings.classList.remove('hidden');
        modalSettings.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        modalSettings.classList.add('hidden');
        modalSettings.setAttribute('aria-hidden', 'true');
    };

    btnSettings?.addEventListener('click', openModal);
    btnCloseSettings?.addEventListener('click', closeModal);

    modalSettings.addEventListener('click', (event) => {
        if (event.target === modalSettings) closeModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !modalSettings.classList.contains('hidden')) {
            closeModal();
        }
    });
}