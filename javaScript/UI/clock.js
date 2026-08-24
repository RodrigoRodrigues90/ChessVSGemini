export class Clock {
    constructor(tempoInicialMinutos = 5, onTick, onTempoAcabou) {
        this.tempoInicial = tempoInicialMinutos * 60; // 300 segundos
        this.tempos = { w: this.tempoInicial, b: this.tempoInicial };
        this.turnoAtivo = 'w'; // O relógio controla internamente de quem é a vez dele rodar
        this.intervalo = null;

        // Funções que o main.js passou para atualizar a tela
        this.onTick = onTick;
        this.onTempoAcabou = onTempoAcabou;
    }

    // O main.js só chama isso UMA VEZ no início do jogo inteiro
    iniciar() {
        if (this.intervalo) return;

        this.intervalo = setInterval(() => {
            this.tempos[this.turnoAtivo]--;

            // Envia os tempos já formatados prontinhos para o main.js apenas exibir
            if (this.onTick) {
                this.onTick({
                    w: this.formatar(this.tempos.w),
                    b: this.formatar(this.tempos.b),
                    wSegundos: this.tempos.w,
                    bSegundos: this.tempos.b,
                    turnoAtivo: this.turnoAtivo
                });
            }
            // Se o tempo de alguém zerar
            if (this.tempos[this.turnoAtivo] <= 0) {
                this.parar();
                if (this.onTempoAcabou) this.onTempoAcabou(this.turnoAtivo);
            }
        }, 1000);
    }

    // Quando o jogador move uma peça, o main.js só avisa: "mudei de turno!"
    mudarTurno(novoTurno) {
        this.turnoAtivo = novoTurno;
    }

    parar() {
        clearInterval(this.intervalo);
        this.intervalo = null;
    }

    formatar(segundos) {
        const minutos = Math.floor(segundos / 60);
        const segs = segundos % 60;
        return `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
    }
}