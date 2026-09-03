const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const somBuffers = {};
const arquivosSons = {
    movimento: './sounds/chesspiece.mp3',
    xeque: './sounds/xeque.mp3',
    xequeMate: './sounds/win.mp3',
    captura: './sounds/botão.mp3',
    alerta: './sounds/clock.mp3'
};

// Array exportado para renderização do seletor na UI
export const playlist = [
    { id: 0, titulo: "Moonlight Sonata - Ludwig van Beethoven", url: "./sounds/music.mp3", ganho: 0.5 , link: "https://www.youtube.com/watch?v=4Tr0otuiQuU&list=RD4Tr0otuiQuU&start_radio=1" },
    { id: 1, titulo: "Cornfield Chase - Hans Zimmer", url: "./sounds/interestelar.mp3", ganho: 0.1 , link: "https://www.youtube.com/watch?v=7GlsxNI4LVI&list=RDUDVtMYqUAyw&index=5" },
    { id: 2, titulo: "Hey You - Pink Floyd", url: "./sounds/hey.mp3", ganho: 0.5 , link:"https://www.youtube.com/watch?v=2G1g1G1G1G1"},
    { id: 3, titulo: "Planet Caravan - Black Sabbath", url: "./sounds/Planet.mp3", ganho: 0.5 , link:""},
    { id: 4, titulo: "Nocturne op.9 No.2 - Chopin", url: "./sounds/Chopin.mp3", ganho: 0.5 , link:""},
    { id: 5, titulo: "Confortably Numb - Pink Floyd", url: "./sounds/Numb.mp3", ganho: 0.5 , link:""},
];

// Recupera a faixa salva ou inicia na 0
let indiceFaixaAtual = parseInt(localStorage.getItem('music_track') ?? '0');
if (isNaN(indiceFaixaAtual) || indiceFaixaAtual < 0 || indiceFaixaAtual >= playlist.length) {
    indiceFaixaAtual = 0;
}

let sfxAtivo = localStorage.getItem('sfx_enabled') !== 'false';
let volumeMusica = parseFloat(localStorage.getItem('music_volume') ?? '0.8');

export async function carregarSons() {
    for (const [nome, url] of Object.entries(arquivosSons)) {
        try {
            const resposta = await fetch(url);
            const arrayBuffer = await resposta.arrayBuffer();
            somBuffers[nome] = await audioCtx.decodeAudioData(arrayBuffer);
        } catch (erro) {
            console.error(`Erro ao carregar o som: ${nome}`, erro);
        }
    }
}

export function tocarSom(nomeSom) {
    if (!sfxAtivo) return;
    
    const buffer = somBuffers[nomeSom];
    if (!buffer) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.0;

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start(0);
}

// Configuração do Elemento de Áudio e Web Audio API
const htmlAudioElement = new Audio(playlist[indiceFaixaAtual].url);

htmlAudioElement.addEventListener('ended', () => {
    proximaFaixa();
});

const musicaSource = audioCtx.createMediaElementSource(htmlAudioElement);
const musicaGainNode = audioCtx.createGain();

musicaSource.connect(musicaGainNode);
musicaGainNode.connect(audioCtx.destination);

aplicarVolumeCalculado();

let musicaPausada = true;

export function alternarMusica() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (musicaPausada) {
        htmlAudioElement.play();
        musicaPausada = false;
    } else {
        htmlAudioElement.pause();
        musicaPausada = true;
    }
    return !musicaPausada;
}

// Modal de Configurações
export function setSFXAtivo(status) {
    sfxAtivo = status;
    localStorage.setItem('sfx_enabled', status);
}

export function setVolumeMusica(valor) {
    volumeMusica = valor / 100;
    localStorage.setItem('music_volume', volumeMusica);
    aplicarVolumeCalculado();
}


export function obterConfiguracoesAudio() {
    return {
        sfxAtivo,
        volumePercentual: Math.round(volumeMusica * 100)
    };
}


export function obterEstadoMusica() {
    return {
        titulo: playlist[indiceFaixaAtual].titulo,
        link: playlist[indiceFaixaAtual].link
    };
}

function aplicarVolumeCalculado() {
    const faixaAtual = playlist[indiceFaixaAtual];
    const ganhoFaixa = faixaAtual?.ganho ?? 1.0;
    
    // Volume final combinado (limitado entre 0.0 e 1.0 para o elemento HTML)
    const volumeFinal = Math.min(Math.max(volumeMusica * ganhoFaixa, 0), 1);

    // 1. Aplica diretamente no elemento HTML <audio> (Garante que o volume da faixa abaixe de fato)
    htmlAudioElement.volume = volumeFinal;

    // 2. Mantém o Web Audio API sincronizado
    if (musicaGainNode) {
        musicaGainNode.gain.value = volumeFinal;
    }
}

/**
 * Troca a faixa atual da playlist e inicia a reprodução
 * @param {number} novoIndice - Índice do array da playlist
 */
export function trocarFaixa(novoIndice) {
    if (novoIndice < 0 || novoIndice >= playlist.length) return;

    indiceFaixaAtual = novoIndice;
    localStorage.setItem('music_track', indiceFaixaAtual);

    const estavaTocando = !musicaPausada;

    htmlAudioElement.pause();
    htmlAudioElement.src = playlist[indiceFaixaAtual].url;
    htmlAudioElement.load();

    // Recalcula o volume aplicando o ganho individual da faixa
    aplicarVolumeCalculado();

    if (estavaTocando) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        htmlAudioElement.play();
    }
}

export function proximaFaixa() {
    if (indiceFaixaAtual < playlist.length - 1) {
        trocarFaixa(indiceFaixaAtual + 1);
    }
}

export function faixaAnterior() {
    if (indiceFaixaAtual > 0) {
        trocarFaixa(indiceFaixaAtual - 1);
    }
}

// Função para atualizar a barra de range do volume com gradiente de cor (UI)
export function atualizarBarraRange(inputElement) {
    if (!inputElement) return;
    const valor = inputElement.value;
    // Pinta de verde (#00e676) à esquerda e escuro (#403d39) à direita
    inputElement.style.background = `linear-gradient(to right, #3acc86cb 0%, #00e677b7 ${valor}%, #403d39 ${valor}%, #403d39 100%)`;
}