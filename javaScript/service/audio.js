const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const somBuffers = {};
const arquivosSons = {
    movimento: './sounds/chesspiece.mp3',
    xeque: './sounds/xeque.mp3',
    xequeMate: './sounds/win.mp3',
    captura: './sounds/botão.mp3',
    alerta: './sounds/clock.mp3'
};

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

const htmlAudioElement = new Audio('./sounds/music.mp3');
htmlAudioElement.loop = true;

const musicaSource = audioCtx.createMediaElementSource(htmlAudioElement);
const musicaGainNode = audioCtx.createGain();
musicaGainNode.gain.value = 0.6;
musicaSource.connect(musicaGainNode);
musicaGainNode.connect(audioCtx.destination);

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
}

// Modal de Configurações
export function setSFXAtivo(status) {
    sfxAtivo = status;
    localStorage.setItem('sfx_enabled', status);
}

export function setVolumeMusica(valor) {
    // Converte de 0..100 para 0.0..1.0
    volumeMusica = valor / 100;
    musicaGainNode.gain.value = volumeMusica;
    localStorage.setItem('music_volume', volumeMusica);
}

export function obterConfiguracoesAudio() {
    return {
        sfxAtivo,
        volumePercentual: Math.round(volumeMusica * 100)
    };
}