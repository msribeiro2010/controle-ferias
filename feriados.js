document.addEventListener('DOMContentLoaded', async () => {
    // Função para carregar feriados
    async function carregarFeriados() {
        try {
            const resposta = await fetch('feriados_2025.json');
            const dadosFeriados = await resposta.json();
            return dadosFeriados.feriados;
        } catch (erro) {
            console.error('Erro ao carregar feriados:', erro);
            return [];
        }
    }

    // Função para agrupar feriados por mês
    function agruparFeriadosPorMes(feriados) {
        const mesesPorExtenso = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        const feriadosPorMes = mesesPorExtenso.map((nomeMes, indiceMes) => {
            const feriadosMes = feriados.filter(feriado => {
                const [, mes] = feriado.data.split('/').map(Number);
                return mes === indiceMes + 1;
            });

            return {
                mes: nomeMes,
                feriados: feriadosMes.sort((a, b) => {
                    const [diaA] = a.data.split('/').map(Number);
                    const [diaB] = b.data.split('/').map(Number);
                    return diaA - diaB;
                })
            };
        });

        return feriadosPorMes;
    }

    // Função para renderizar feriados
    function renderizarFeriados(feriadosPorMes) {
        const feriadosAnoGrid = document.getElementById('feriados-ano-grid');

        feriadosPorMes.forEach(mesObj => {
            if (mesObj.feriados.length > 0) {
                const mesContainer = document.createElement('div');
                mesContainer.classList.add('mes-feriados');

                const mesTitulo = document.createElement('h2');
                mesTitulo.textContent = mesObj.mes;
                mesContainer.appendChild(mesTitulo);

                const feriadosContainer = document.createElement('div');
                feriadosContainer.classList.add('feriados-lista');

                mesObj.feriados.forEach(feriado => {
                    const feriadoElemento = document.createElement('div');
                    feriadoElemento.classList.add('feriado-item');
                    
                    feriadoElemento.innerHTML = `
                        <div class="feriado-data">${feriado.data}</div>
                        <div class="feriado-nome">${feriado.nome}</div>
                    `;

                    feriadosContainer.appendChild(feriadoElemento);
                });

                mesContainer.appendChild(feriadosContainer);
                feriadosAnoGrid.appendChild(mesContainer);
            }
        });
    }

    // Carregar e renderizar feriados
    const feriados = await carregarFeriados();
    const feriadosPorMes = agruparFeriadosPorMes(feriados);
    renderizarFeriados(feriadosPorMes);

    // Botão de logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            localStorage.removeItem('usuarioLogado');
            window.location.href = 'login.html';
        });
    }
});
