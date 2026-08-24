// tabuleiro.js

export class Tabuleiro {
    constructor() {
        this.jogoFinalizado = false;
        this.turno = 'w'; // 'w' para Brancas, 'b' para Pretas
        this.grid = this.criarTabuleiroInicial();

        // Estado para controle de Roque (perdem a permissão ao se moverem)
        this.direitosRoque = {
            w: { reiMoveu: false, torreKMoveu: false, torreQMoveu: false },
            b: { reiMoveu: false, torreKMoveu: false, torreQMoveu: false }
        };

        // Guarda a casa de captura En Passant ativa (ex: { linha: 2, coluna: 3 })
        this.alvoEnPassant = null;
    }

    criarTabuleiroInicial() {
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], // Linha 0 (Pretas)
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'], // Linha 1
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'], // Linha 6
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']  // Linha 7 (Brancas)
        ];
    }

    obterPeca(linha, coluna) {
        if (!this.dentroDoTabuleiro(linha, coluna)) return '';
        return this.grid[linha][coluna];
    }

    obterCorPeca(linha, coluna) {
        const peca = this.obterPeca(linha, coluna);
        if (!peca) return null;
        return peca === peca.toUpperCase() ? 'w' : 'b';
    }

    dentroDoTabuleiro(linha, coluna) {
        return linha >= 0 && linha < 8 && coluna >= 0 && coluna < 8;
    }

    moverPeca(origemLinha, origemColuna, destLinha, destColuna) {
        const peca = this.grid[origemLinha][origemColuna];
        const cor = this.obterCorPeca(origemLinha, origemColuna);
        const tipoPeca = peca.toLowerCase();

        // 1. CAPTURA EN PASSANT
        if (tipoPeca === 'p' && this.alvoEnPassant) {
            if (destLinha === this.alvoEnPassant.linha && destColuna === this.alvoEnPassant.coluna) {
                // Remove o peão inimigo capturado (que está na linha atrás/frente do alvo)
                const linhaPeaoInimigo = cor === 'w' ? destLinha + 1 : destLinha - 1;
                this.grid[linhaPeaoInimigo][destColuna] = '';
            }
        }

        // 2. ATUALIZA O ALVO EN PASSANT PARA O PRÓXIMO TURNO
        if (tipoPeca === 'p' && Math.abs(destLinha - origemLinha) === 2) {
            // A casa de alvo fica no meio do pulo duplo
            this.alvoEnPassant = {
                linha: (origemLinha + destLinha) / 2,
                coluna: origemColuna
            };
        } else {
            this.alvoEnPassant = null; // Reseta se não foi um pulo duplo de peão
        }

        // 3. MOVIMENTO DE ROQUE (Move a Torre junto com o Rei)
        if (tipoPeca === 'k' && Math.abs(destColuna - origemColuna) === 2) {
            if (destColuna === 6) { // Roque Curto (Ala do Rei)
                const torre = this.grid[origemLinha][7];
                this.grid[origemLinha][7] = '';
                this.grid[origemLinha][5] = torre;
            } else if (destColuna === 2) { // Roque Longo (Ala da Rainha)
                const torre = this.grid[origemLinha][0];
                this.grid[origemLinha][0] = '';
                this.grid[origemLinha][3] = torre;
            }
        }

        // 4. PERDA DE DIREITOS DE ROQUE
        if (tipoPeca === 'k') {
            this.direitosRoque[cor].reiMoveu = true;
        }
        if (tipoPeca === 'r') {
            if (origemLinha === (cor === 'w' ? 7 : 0)) {
                if (origemColuna === 7) this.direitosRoque[cor].torreKMoveu = true;
                if (origemColuna === 0) this.direitosRoque[cor].torreQMoveu = true;
            }
        }

        // Executa o movimento principal no tabuleiro
        this.grid[destLinha][destColuna] = peca;
        this.grid[origemLinha][origemColuna] = '';

        // PROMOÇÃO DE PEÃO
        if (peca === 'P' && destLinha === 0) this.grid[destLinha][destColuna] = 'Q';
        if (peca === 'p' && destLinha === 7) this.grid[destLinha][destColuna] = 'q';

        // Alterna o turno
        this.turno = this.turno === 'w' ? 'b' : 'w';
    }

    obterMovimentosValidos(linha, coluna) {
        const peca = this.obterPeca(linha, coluna);
        if (!peca || this.obterCorPeca(linha, coluna) !== this.turno) return [];

        const movimentosCandidatos = this.gerarMovimentosPseudovalidos(linha, coluna, this.grid);
        const movimentosLegais = [];

        for (const mov of movimentosCandidatos) {
            const simularGrid = this.clonarGrid(this.grid);
            simularGrid[mov.linha][mov.coluna] = simularGrid[linha][coluna];
            simularGrid[linha][coluna] = '';

            // Se for simulação de En Passant, limpa também a casa da captura
            const tipoPeca = peca.toLowerCase();
            if (tipoPeca === 'p' && this.alvoEnPassant && mov.linha === this.alvoEnPassant.linha && mov.coluna === this.alvoEnPassant.coluna) {
                const cor = peca === peca.toUpperCase() ? 'w' : 'b';
                const linhaPeaoInimigo = cor === 'w' ? mov.linha + 1 : mov.linha - 1;
                simularGrid[linhaPeaoInimigo][mov.coluna] = '';
            }

            if (!this.reiEstaEmPerigo(this.turno, simularGrid)) {
                movimentosLegais.push(mov);
            }
        }

        return movimentosLegais;
    }

    gerarMovimentosPseudovalidos(linha, coluna, grid) {
        const peca = grid[linha][coluna];
        if (!peca) return [];

        const cor = peca === peca.toUpperCase() ? 'w' : 'b';
        const tipoPeca = peca.toLowerCase();
        const movimentos = [];

        const direcoesReta = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        const direcoesDiagonal = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

        switch (tipoPeca) {
            case 'p': {
                const sentido = cor === 'w' ? -1 : 1;
                const linhaInicial = cor === 'w' ? 6 : 1;

                // Avanço Simples
                const proximaLinha = linha + sentido;
                if (this.dentroDoTabuleiro(proximaLinha, coluna) && grid[proximaLinha][coluna] === '') {
                    movimentos.push({ linha: proximaLinha, coluna });

                    // Avanço Duplo
                    const linhaDupla = linha + (2 * sentido);
                    if (linha === linhaInicial && grid[linhaDupla][coluna] === '') {
                        movimentos.push({ linha: linhaDupla, coluna });
                    }
                }

                // Capturas Diagonais
                for (const colOffset of [-1, 1]) {
                    const colDiag = coluna + colOffset;
                    if (this.dentroDoTabuleiro(proximaLinha, colDiag)) {
                        const pecaInimiga = grid[proximaLinha][colDiag];
                        if (pecaInimiga !== '') {
                            const corInimiga = pecaInimiga === pecaInimiga.toUpperCase() ? 'w' : 'b';
                            if (corInimiga !== cor) {
                                movimentos.push({ linha: proximaLinha, coluna: colDiag });
                            }
                        }

                        // REGRA: Captura En Passant
                        if (this.alvoEnPassant && proximaLinha === this.alvoEnPassant.linha && colDiag === this.alvoEnPassant.coluna) {
                            movimentos.push({ linha: proximaLinha, coluna: colDiag });
                        }
                    }
                }
                break;
            }

            case 'n': {
                const saltos = [
                    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                    [1, -2], [1, 2], [2, -1], [2, 1]
                ];
                for (const [dLinha, dColuna] of saltos) {
                    const rL = linha + dLinha;
                    const rC = coluna + dColuna;
                    if (this.dentroDoTabuleiro(rL, rC)) {
                        const destino = grid[rL][rC];
                        if (destino === '' || (destino === destino.toUpperCase() ? 'w' : 'b') !== cor) {
                            movimentos.push({ linha: rL, coluna: rC });
                        }
                    }
                }
                break;
            }

            case 'r':
                this.adicionarMovimentosContinuos(movimentos, linha, coluna, direcoesReta, cor, grid);
                break;

            case 'b':
                this.adicionarMovimentosContinuos(movimentos, linha, coluna, direcoesDiagonal, cor, grid);
                break;

            case 'q':
                this.adicionarMovimentosContinuos(movimentos, linha, coluna, [...direcoesReta, ...direcoesDiagonal], cor, grid);
                break;

            case 'k': {
                const direcoesRei = [...direcoesReta, ...direcoesDiagonal];
                for (const [dLinha, dColuna] of direcoesRei) {
                    const rL = linha + dLinha;
                    const rC = coluna + dColuna;
                    if (this.dentroDoTabuleiro(rL, rC)) {
                        const destino = grid[rL][rC];
                        if (destino === '' || (destino === destino.toUpperCase() ? 'w' : 'b') !== cor) {
                            movimentos.push({ linha: rL, coluna: rC });
                        }
                    }
                }

                // REGRA: Roque (Pequeno e Grande)
                if (grid === this.grid && !this.reiEstaEmPerigo(cor, grid)) {
                    const direitos = this.direitosRoque[cor];
                    const linhaRoque = cor === 'w' ? 7 : 0;

                    if (linha === linhaRoque && coluna === 4 && !direitos.reiMoveu) {
                        // Roque Pequeno (Ala do Rei)
                        if (!direitos.torreKMoveu && grid[linhaRoque][5] === '' && grid[linhaRoque][6] === '') {
                            if (!this.casaEstaSobAtaque(linhaRoque, 5, cor, grid) && !this.casaEstaSobAtaque(linhaRoque, 6, cor, grid)) {
                                movimentos.push({ linha: linhaRoque, coluna: 6 });
                            }
                        }
                        // Roque Grande (Ala da Rainha)
                        if (!direitos.torreQMoveu && grid[linhaRoque][1] === '' && grid[linhaRoque][2] === '' && grid[linhaRoque][3] === '') {
                            if (!this.casaEstaSobAtaque(linhaRoque, 2, cor, grid) && !this.casaEstaSobAtaque(linhaRoque, 3, cor, grid)) {
                                movimentos.push({ linha: linhaRoque, coluna: 2 });
                            }
                        }
                    }
                }
                break;
            }
        }

        return movimentos;
    }

    adicionarMovimentosContinuos(movimentos, linha, coluna, direcoes, cor, grid) {
        for (const [dLinha, dColuna] of direcoes) {
            let rL = linha + dLinha;
            let rC = coluna + dColuna;

            while (this.dentroDoTabuleiro(rL, rC)) {
                const destino = grid[rL][rC];
                if (destino === '') {
                    movimentos.push({ linha: rL, coluna: rC });
                } else {
                    const corDestino = destino === destino.toUpperCase() ? 'w' : 'b';
                    if (corDestino !== cor) {
                        movimentos.push({ linha: rL, coluna: rC });
                    }
                    break;
                }
                rL += dLinha;
                rC += dColuna;
            }
        }
    }

    casaEstaSobAtaque(linha, coluna, corDefensora, grid) {
        const corInimiga = corDefensora === 'w' ? 'b' : 'w';
        for (let l = 0; l < 8; l++) {
            for (let c = 0; c < 8; c++) {
                if (grid[l][c] !== '') {
                    const corPeca = grid[l][c] === grid[l][c].toUpperCase() ? 'w' : 'b';
                    if (corPeca === corInimiga) {
                        // Evita loop infinito ao checar o Rei inimigo
                        if (grid[l][c].toLowerCase() === 'k') {
                            const distL = Math.abs(l - linha);
                            const distC = Math.abs(c - coluna);
                            if (distL <= 1 && distC <= 1) return true;
                        } else {
                            const ataques = this.gerarMovimentosPseudovalidos(l, c, grid);
                            if (ataques.some(m => m.linha === linha && m.coluna === coluna)) {
                                return true;
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    reiEstaEmPerigo(corRei, grid) {
        let posRei = null;
        const caractereRei = corRei === 'w' ? 'K' : 'k';

        for (let l = 0; l < 8; l++) {
            for (let c = 0; c < 8; c++) {
                if (grid[l][c] === caractereRei) {
                    posRei = { linha: l, coluna: c };
                    break;
                }
            }
            if (posRei) break;
        }

        if (!posRei) return false;
        return this.casaEstaSobAtaque(posRei.linha, posRei.coluna, corRei, grid);
    }

    estaEmXeque(cor) {
        return this.reiEstaEmPerigo(cor, this.grid);
    }

    verificarFimDeJogo() {

        if (this.temMaterialInsuficiente()) {
            this.jogoFinalizado = true;
            return {
                tipo: 'MATERIAL_INSUFICIENTE'
            };
        }

        let possuiMovimentoLegal = false;

        for (let l = 0; l < 8; l++) {
            for (let c = 0; c < 8; c++) {
                if (this.obterCorPeca(l, c) === this.turno) {
                    const movs = this.obterMovimentosValidos(l, c);
                    if (movs.length > 0) {
                        possuiMovimentoLegal = true;
                        break;
                    }
                }
            }
            if (possuiMovimentoLegal) break;
        }

        if (!possuiMovimentoLegal) {
            this.jogoFinalizado = true;
            const emXeque = this.estaEmXeque(this.turno);

            if (emXeque) {
                return {
                    tipo: 'XEQUE_MATE',
                    vencedor: this.turno === 'w' ? 'b' : 'w'
                };
            } else {
                return {
                    tipo: 'AFOGAMENTO'
                };
            }
        }

        return null;
    }

    // Ultima atualização:
    temMaterialInsuficiente() {
        const pecas = [];

        // Mapeia todas as peças presentes no tabuleiro
        for (let l = 0; l < 8; l++) {
            for (let c = 0; c < 8; c++) {
                const peca = this.grid[l][c];
                if (peca !== '') {
                    pecas.push(peca);
                }
            }
        }

        // Se houver Peão, Torre ou Dama, NUNCA é material insuficiente
        if (pecas.some(p => ['p', 'P', 'r', 'R', 'q', 'Q'].includes(p))) {
            return false;
        }

        // 1. Rei vs Rei
        if (pecas.length === 2) {
            return true;
        }

        // 2. Rei e Bispo vs Rei  OU  Rei e Cavalo vs Rei
        if (pecas.length === 3) {
            return true;
        }

        // 3. Rei e Bispo vs Rei e Bispo
        if (pecas.length === 4) {
            const bispos = pecas.filter(p => p.toLowerCase() === 'b');
            if (bispos.length === 2) {
                // Checa a cor das casas dos dois bispos
                const casasBispos = [];
                for (let l = 0; l < 8; l++) {
                    for (let c = 0; c < 8; c++) {
                        if (this.grid[l][c].toLowerCase() === 'b') {
                            // (linha + coluna) % 2 === 0 é casa branca, 1 é casa preta
                            casasBispos.push((l + c) % 2);
                        }
                    }
                }
                // Se ambos os bispos estão em casas da mesma cor (ex: ambos no 0 ou ambos no 1)
                if (casasBispos[0] === casasBispos[1]) {
                    return true;
                }
            }
        }

        return false;
    }

    clonarGrid(grid) {
        return grid.map(row => [...row]);
    }
}