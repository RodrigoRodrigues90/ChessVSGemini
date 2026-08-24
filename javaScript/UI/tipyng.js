let timerAtual = null; // Guardado no escopo do arquivo/módulo

/**
* Realiza  efeito de digitação nos comentarios da aplicação
* @param {string} htmlTexto - string de resposta do servifor com comentarios pré-processados
*/

export function tipyng(htmlTexto) {
    // Se já houver um efeito rodando, interrompe antes de começar o novo
    if (timerAtual) clearTimeout(timerAtual);

    const elComentario = document.getElementById("texto-comentario");
    if (!elComentario) return;

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlTexto, 'text/html');
    const nodes = Array.from(doc.body.childNodes);

    elComentario.innerHTML = "";
    let nodeIndex = 0;
    let charIndex = 0;

    function passo() {
        if (nodeIndex < nodes.length) {
            const currentNode = nodes[nodeIndex];

            if (currentNode.nodeType === Node.TEXT_NODE) {
                if (charIndex === 0) {
                    elComentario.appendChild(document.createTextNode(""));
                }
                elComentario.lastChild.textContent += currentNode.textContent.charAt(charIndex);
                charIndex++;

                if (charIndex >= currentNode.textContent.length) {
                    charIndex = 0;
                    nodeIndex++;
                }
            } else {
                elComentario.appendChild(currentNode.cloneNode(true));
                nodeIndex++;
            }

            timerAtual = setTimeout(passo, 35);
        }
    }

    passo();
}

export function pararTyping() {
    if (timerAtual) {
        clearTimeout(timerAtual);
        timerAtual = null;
    }
}