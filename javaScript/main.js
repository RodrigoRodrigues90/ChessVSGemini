import {
    carregarSons,
    setSFXAtivo,
    setVolumeMusica,
    obterConfiguracoesAudio,
    proximaFaixa,
    faixaAnterior,
    alternarMusica,
    atualizarBarraRange,
    obterEstadoMusica
} from './service/audio.js';
import {
    estadoJogo,
    iniciarJogo,
    desfazerJogada,
    desistirPartida,
    atualizarTela,
} from './controller/gameController.js';
import { iniciarModoAnalise } from './controller/analisysController.js';

// Elementos da DOM para Modais e Seleção
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
    const audioInfo = document.getElementById('audio-info');
    const btnAbout = document.getElementById('btn-about');
    const modalAbout = document.getElementById('modal-about');
    const btnCloseAbout = document.getElementById('btn-close-about');

    if (!btnAbout || !modalAbout) return;

    const openModal = () => {
        atualizarInfoAudioUI(audioInfo, 'audio-link');
        modalAbout.classList.remove('hidden');
        modalAbout.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        modalAbout.classList.add('hidden');
        modalAbout.setAttribute('aria-hidden', 'true');
    };

    btnAbout.addEventListener('click', openModal);
    btnCloseAbout.addEventListener('click', closeModal);

    modalAbout.addEventListener('click', (event) => {
        if (event.target === modalAbout) closeModal();
    });

}

// Função que busca a música atual e atualiza a UI do modal
function atualizarInfoAudioUI(elementoTitulo, className = 'modal-subtitle') {
    const {titulo} = obterEstadoMusica();
    if (elementoTitulo) {
        elementoTitulo.innerHTML = `
            <marquee behavior="scroll" direction="left" scrollamount="3" class="audio-marquee">
                <span class="${className}">${titulo}</span>
            </marquee>`;
    }
};

//------------- MODAL SETTINGS & IMPORTAÇÃO ----------------//
function configurarModalSettings() {
    const btnSettings = document.getElementById('btn-settings');
    const modalSettings = document.getElementById('modal-settings');
    const btnCloseSettings = document.getElementById('btn-close-setings');
    const btnImportar = document.getElementById('import');

    const sfxToggle = document.getElementById('sfx-toggle');
    const musicVolume = document.getElementById('music-volume');
    const musicVolumeValue = document.getElementById('music-volume-value');
    const musicTitle = document.getElementById('name-music');

    const btnPrev = document.getElementById('btn-prev-track');
    const btnNext = document.getElementById('btn-next-track');
    const btnToggle = document.getElementById('btn-toggle-music');


    if (!modalSettings) return;

    // Funções de Controle do Modal
    const openModal = () => {
        atualizarInfoAudioUI(musicTitle);
        atualizarBarraRange(musicVolume);
        modalSettings.classList.remove('hidden');
        modalSettings.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        modalSettings.classList.add('hidden');
        modalSettings.setAttribute('aria-hidden', 'true');
    };

    // Sincroniza os inputs da interface com os valores salvos
    const configs = obterConfiguracoesAudio();
    if (sfxToggle) sfxToggle.checked = configs.sfxAtivo;
    if (musicVolume) musicVolume.value = configs.volumePercentual;
    if (musicVolumeValue) musicVolumeValue.textContent = `${configs.volumePercentual}%`;

    // Listeners de Áudio
    sfxToggle?.addEventListener('change', (e) => {
        setSFXAtivo(e.target.checked);
    });

    musicVolume?.addEventListener('input', (e) => {
        const valor = e.target.value;
        if (musicVolumeValue) musicVolumeValue.textContent = `${valor}%`;
        atualizarBarraRange(musicVolume);
        setVolumeMusica(valor);
    });

    btnPrev.addEventListener('click', () => {
        faixaAnterior();
        atualizarInfoAudioUI(musicTitle);
    });

    btnNext.addEventListener('click', () => {
        proximaFaixa();
        atualizarInfoAudioUI(musicTitle);
    });

    btnToggle.addEventListener('click', () => {
        alternarMusica();
    });

    // Importação de partida JSON para análise
    btnImportar?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evento) => {
                try {
                    const dadosJogo = JSON.parse(evento.target.result);
                    closeModal();

                    // Congela a sessão ativa e passa o callback para restaurar o tabuleiro
                    iniciarModoAnalise(dadosJogo, estadoJogo, () => {
                        atualizarTela()
                    });
                } catch (err) {
                    alert('Erro ao ler o arquivo JSON de análise.');
                    console.log(err)
                }
            };
            reader.readAsText(file);
        };

        input.click();
    });

    // Listeners de Abertura/Fechamento
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