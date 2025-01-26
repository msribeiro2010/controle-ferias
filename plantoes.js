import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, push, onValue, remove, update } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAnPLwZO5i_Ky0nBfI14gzNsRqvVMIOqdk",
    authDomain: "controle-func.firebaseapp.com",
    databaseURL: "https://controle-func-default-rtdb.firebaseio.com",
    projectId: "controle-func",
    storageBucket: "controle-func.appspot.com",
    messagingSenderId: "146164640694",
    appId: "1:146164640694:web:d52beaeaa4b1b38cc76f17"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let saldoFolgas = 0;
let plantoesRealizados = 0;

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        carregarPlantoes();
        carregarFolgas();
        atualizarDataHora();
        
        // Iniciar verificação de status apenas após autenticação
        verificarStatusPlantoes();
        setInterval(verificarStatusPlantoes, 60000);
    } else {
        window.location.href = 'index.html';
    }
});

// Função para verificar tipo de plantão e definir horários
function verificarTipoPlantao(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    const mesAtual = mes; // Não precisa adicionar 1 pois já vem no formato correto do input
    
    // Verificar se está no período de recesso (19/12 a 05/01)
    if ((mesAtual === 12 && dia >= 19) || (mesAtual === 1 && dia <= 5)) {
        return {
            tipo: 'Recesso',
            horarioInicio: '14:00',
            horarioFim: '18:00',
            totalHoras: 4
        };
    }
    
    // Verificar se é fim de semana
    const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
    if (diaSemana === 0) {
        return {
            tipo: 'Domingo',
            horarioInicio: '09:00',
            horarioFim: '12:00',
            totalHoras: 3
        };
    } else if (diaSemana === 6) {
        return {
            tipo: 'Sábado',
            horarioInicio: '09:00',
            horarioFim: '12:00',
            totalHoras: 3
        };
    }
    
    // Plantão normal (dias úteis)
    return {
        tipo: 'Normal',
        horarioInicio: '09:00',
        horarioFim: '12:00',
        totalHoras: 3
    };
}

// Função para ajustar a data para o fuso horário local
function ajustarData(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toISOString().split('T')[0];
}

// Função para atualizar data e hora
function atualizarDataHora() {
    const atualizarHora = () => {
        const agora = new Date();
        document.getElementById('current-time').textContent = 
            agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('current-date').textContent = 
            agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    atualizarHora();
    setInterval(atualizarHora, 1000);
}

// Função para formatar data
function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
}

// Função para verificar se plantão já passou
function plantaoJaPassou(dataString) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const [ano, mes, dia] = dataString.split('-').map(Number);
    const dataDoPlantao = new Date(ano, mes - 1, dia);
    dataDoPlantao.setHours(0, 0, 0, 0);
    
    return dataDoPlantao < hoje;
}

// Função para atualizar saldos
function atualizarSaldos() {
    document.getElementById('totalPlantoes').textContent = plantoesRealizados;
    document.getElementById('saldoFolgas').textContent = saldoFolgas;
}

// Função para verificar status dos plantões
function verificarStatusPlantoes() {
    if (!currentUser) return; // Adicionar verificação de segurança
    
    const agora = new Date();
    const meiaNoite = new Date(agora);
    meiaNoite.setHours(0, 0, 0, 0);

    const plantoesRef = ref(db, `plantoes/${currentUser.uid}`);
    
    onValue(plantoesRef, (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                const dataPlantao = new Date(plantao.dataPlantao);
                dataPlantao.setHours(0, 0, 0, 0);

                // Se a data do plantão for anterior à meia-noite de hoje e o status não for "Realizado"
                if (dataPlantao < meiaNoite && plantao.status !== 'Realizado') {
                    // Atualizar status para "Realizado"
                    const plantaoRef = ref(db, `plantoes/${currentUser.uid}/${childSnapshot.key}`);
                    update(plantaoRef, {
                        status: 'Realizado'
                    });
                }
            });
        }
    });
}

// Atualizar a função carregarPlantoes para mostrar o status correto
function carregarPlantoes() {
    const plantoesRef = ref(db, `plantoes/${currentUser.uid}`);
    
    onValue(plantoesRef, (snapshot) => {
        const historicoPlantoesList = document.getElementById('historicoPlantoesList');
        historicoPlantoesList.innerHTML = '';
        let totalPlantoes = 0;
        
        if (snapshot.exists()) {
            const plantoes = [];
            
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                plantao.id = childSnapshot.key;
                plantoes.push(plantao);
                totalPlantoes++;
            });

            // Ordenar por data
            plantoes.sort((a, b) => new Date(b.dataPlantao) - new Date(a.dataPlantao));

            plantoes.forEach(plantao => {
                const dataPlantao = new Date(plantao.dataPlantao);
                const agora = new Date();
                agora.setHours(0, 0, 0, 0);
                dataPlantao.setHours(0, 0, 0, 0);

                // Definir status baseado na data
                let status = plantao.status || 'Pendente';
                if (dataPlantao < agora && status !== 'Realizado') {
                    status = 'Realizado';
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatarData(plantao.dataPlantao)}</td>
                    <td>${formatarDiaSemana(plantao.dataPlantao)}</td>
                    <td>09:00 - 12:00</td>
                    <td>Plantão Judiciário</td>
                    <td>
                        <span class="badge badge-${status.toLowerCase()}">
                            ${status}
                        </span>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button onclick="excluirPlantao('${plantao.id}')" class="btn-icon" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                historicoPlantoesList.appendChild(row);
            });
        }

        document.getElementById('totalPlantoes').textContent = totalPlantoes;
    });
}

// Função para deletar plantão
async function deletarPlantao(plantaoId) {
    if (confirm('Tem certeza que deseja excluir este plantão?')) {
        try {
            const plantaoRef = ref(db, `plantoes/${plantaoId}`);
            await remove(plantaoRef);
            alert('Plantão excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir plantão:', error);
            alert('Erro ao excluir plantão: ' + error.message);
        }
    }
}

// Adicionar função ao objeto window para ser acessível pelo onclick
window.deletarPlantao = deletarPlantao;

// Função para carregar folgas
function carregarFolgas() {
    const folgasRef = ref(db, 'folgas');
    
    onValue(folgasRef, (snapshot) => {
        const historicoFolgasList = document.getElementById('historicoFolgasList');
        historicoFolgasList.innerHTML = '';

        if (snapshot.exists()) {
            const folgas = [];
            snapshot.forEach((childSnapshot) => {
                const folga = childSnapshot.val();
                if (folga.userId === currentUser.uid) {
                    folga.id = childSnapshot.key;
                    folgas.push(folga);
                }
            });

            // Ordenar folgas por data (mais recentes primeiro)
            folgas.sort((a, b) => {
                const [anoA, mesA, diaA] = a.data.split('-').map(Number);
                const [anoB, mesB, diaB] = b.data.split('-').map(Number);
                const dataA = new Date(anoA, mesA - 1, diaA);
                const dataB = new Date(anoB, mesB - 1, diaB);
                return dataB - dataA;
            });

            // Exibir folgas na tabela
            folgas.forEach((folga) => {
                const [ano, mes, dia] = folga.data.split('-').map(Number);
                const data = new Date(ano, mes - 1, dia);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatarData(folga.data)}</td>
                    <td>${data.toLocaleDateString('pt-BR', { weekday: 'long' })}</td>
                    <td>
                        <span class="status-badge ${folga.status === 'aprovada' ? 'aprovada' : 
                                                  folga.status === 'rejeitada' ? 'rejeitada' : 'pendente'}">
                            ${folga.status.charAt(0).toUpperCase() + folga.status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <button class="btn-delete" onclick="deletarFolga('${folga.id}')"
                                ${folga.status !== 'pendente' ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                historicoFolgasList.appendChild(row);
            });
        }
    });
}

// Função para deletar folga
async function deletarFolga(folgaId) {
    if (confirm('Tem certeza que deseja cancelar esta solicitação de folga?')) {
        try {
            const folgaRef = ref(db, `folgas/${folgaId}`);
            await remove(folgaRef);
            
            // Incrementar saldo de folgas ao cancelar
            saldoFolgas++;
            atualizarSaldos();
            
            alert('Solicitação de folga cancelada com sucesso!');
        } catch (error) {
            console.error('Erro ao cancelar folga:', error);
            alert('Erro ao cancelar folga: ' + error.message);
        }
    }
}

// Adicionar função ao objeto window para ser acessível pelo onclick
window.deletarFolga = deletarFolga;

// Inicializar tabs
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remover classe active de todas as tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Adicionar classe active na tab clicada
            tab.classList.add('active');
            
            // Esconder todos os conteúdos
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Mostrar o conteúdo da tab selecionada
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
});

// Registrar novo plantão
document.getElementById('plantaoForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const dataPlantao = document.getElementById('dataPlantao').value;
        
        const plantao = {
            dataPlantao: dataPlantao,
            status: 'Pendente',
            userId: currentUser.uid,
            timestamp: Date.now()
        };

        const plantoesRef = ref(db, `plantoes/${currentUser.uid}`);
        await push(plantoesRef, plantao);
        
        alert('Plantão registrado com sucesso!');
        document.getElementById('plantaoForm').reset();
    } catch (error) {
        console.error('Erro ao registrar plantão:', error);
        alert('Erro ao registrar plantão: ' + error.message);
    }
});

// Registrar nova folga
document.getElementById('folgaForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    try {
        const dataFolga = document.getElementById('dataFolga').value;
        const dataAjustada = ajustarData(dataFolga);

        // Verificar se tem saldo de folgas
        if (saldoFolgas <= 0) {
            alert('Você não possui saldo de folgas disponível.');
            return;
        }

        // Verificar se é dia útil
        const diaFolga = new Date(dataAjustada);
        const diaSemana = diaFolga.getDay();
        if (diaSemana === 0 || diaSemana === 6) {
            alert('As folgas só podem ser solicitadas em dias úteis.');
            return;
        }

        const folga = {
            data: dataAjustada,
            status: 'pendente',
            userId: currentUser.uid,
            timestamp: Date.now()
        };

        const folgasRef = ref(db, 'folgas');
        await push(folgasRef, folga);
        
        // Diminuir saldo de folgas
        saldoFolgas--;
        atualizarSaldos();
        
        alert('Folga solicitada com sucesso!');
        document.getElementById('folgaForm').reset();
    } catch (error) {
        console.error('Erro ao solicitar folga:', error);
        alert('Erro ao solicitar folga: ' + error.message);
    }
});

// Função para formatar dia da semana com cor
function formatarDiaSemana(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
    
    // Definir cores para cada dia da semana
    const cores = {
        'domingo': '#e74c3c',     // Vermelho
        'sábado': '#e67e22',      // Laranja
        'segunda-feira': '#3498db', // Azul
        'terça-feira': '#2ecc71',   // Verde
        'quarta-feira': '#9b59b6',  // Roxo
        'quinta-feira': '#f1c40f',  // Amarelo
        'sexta-feira': '#1abc9c'    // Verde água
    };

    // Garantir que a data está correta antes de retornar
    const diaCorreto = data.getDay() === 0 ? 'domingo' : diaSemana;
    return `<span style="color: ${cores[diaCorreto]}; font-weight: 500;">${diaCorreto}</span>`;
}

// Função para excluir plantão
window.excluirPlantao = async function(plantaoId) {
    if (confirm('Tem certeza que deseja excluir este plantão?')) {
        try {
            const plantaoRef = ref(db, `plantoes/${currentUser.uid}/${plantaoId}`);
            await remove(plantaoRef);
            alert('Plantão excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir plantão:', error);
            alert('Erro ao excluir plantão: ' + error.message);
        }
    }
};

// Função para exportar histórico em PDF
async function exportarHistorico() {
    try {
        // Verificar qual tab está ativa
        const tabAtiva = document.querySelector('.tab.active').getAttribute('data-tab');
        const titulo = tabAtiva === 'plantoes' ? 'Histórico de Plantões' : 'Histórico de Folgas';
        
        // Inicializar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurar fonte para suportar caracteres especiais
        doc.setFont('helvetica');
        
        // Adicionar cabeçalho
        doc.setFontSize(20);
        doc.text(titulo, 15, 20);
        
        // Adicionar informações do usuário
        doc.setFontSize(12);
        doc.text(`Usuário: ${currentUser.email}`, 15, 30);
        doc.text(`Data de exportação: ${new Date().toLocaleDateString('pt-BR')}`, 15, 37);
        
        // Preparar dados para a tabela
        let dados = [];
        let colunas = [];
        
        if (tabAtiva === 'plantoes') {
            // Configurar colunas para plantões
            colunas = [
                { header: 'Data', dataKey: 'data' },
                { header: 'Dia', dataKey: 'dia' },
                { header: 'Horário', dataKey: 'horario' },
                { header: 'Status', dataKey: 'status' }
            ];
            
            // Obter dados dos plantões
            const rows = document.querySelectorAll('#historicoPlantoesList tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                dados.push({
                    data: cells[0].textContent,
                    dia: cells[1].textContent,
                    horario: cells[2].textContent,
                    status: cells[3].textContent.trim()
                });
            });
        } else {
            // Configurar colunas para folgas
            colunas = [
                { header: 'Data', dataKey: 'data' },
                { header: 'Dia', dataKey: 'dia' },
                { header: 'Status', dataKey: 'status' }
            ];
            
            // Obter dados das folgas
            const rows = document.querySelectorAll('#historicoFolgasList tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                dados.push({
                    data: cells[0].textContent,
                    dia: cells[1].textContent,
                    status: cells[2].textContent.trim()
                });
            });
        }
        
        // Adicionar estatísticas
        doc.text('Estatísticas:', 15, 47);
        doc.text(`Total de Plantões: ${plantoesRealizados}`, 15, 54);
        doc.text(`Saldo de Folgas: ${saldoFolgas}`, 15, 61);
        
        // Criar tabela
        doc.autoTable({
            startY: 70,
            head: [colunas.map(col => col.header)],
            body: dados.map(item => colunas.map(col => item[col.dataKey])),
            theme: 'grid',
            headStyles: {
                fillColor: [34, 139, 230],
                textColor: 255,
                fontSize: 12,
                halign: 'center'
            },
            styles: {
                fontSize: 10,
                cellPadding: 5,
                halign: 'center'
            },
            alternateRowStyles: {
                fillColor: [245, 247, 250]
            }
        });
        
        // Adicionar rodapé
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(
                `Página ${i} de ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        // Gerar nome do arquivo
        const dataExport = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const nomeArquivo = `${titulo.toLowerCase().replace(/ /g, '-')}_${dataExport}.pdf`;
        
        // Salvar PDF
        doc.save(nomeArquivo);
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + error.message);
    }
}

// Adicionar função ao objeto window para ser acessível pelo onclick
window.exportarHistorico = exportarHistorico;