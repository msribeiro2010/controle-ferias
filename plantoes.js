import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, push, onValue, remove, update, get, set } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
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
        Promise.all([
            carregarSaldoInicial(),
            carregarPlantoes(),
            carregarFolgas()
        ]).then(() => {
            atualizarDataHora();
            verificarStatusPlantoes();
            setInterval(verificarStatusPlantoes, 60000);
        }).catch(error => {
            console.error('Erro ao inicializar dados:', error);
        });
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

// Função para atualizar contadores
async function atualizarContadores() {
    const plantoesRef = ref(db, `plantoes/${currentUser.uid}`);
    const folgasRef = ref(db, `folgas/${currentUser.uid}/registros`);
    
    try {
        // Buscar plantões
        const plantoesSnapshot = await get(plantoesRef);
        let totalPlantoes = 0;
        
        if (plantoesSnapshot.exists()) {
            const plantoes = plantoesSnapshot.val();
            
            // Somar plantões realizados
            if (plantoes.registros) {
                Object.values(plantoes.registros).forEach(plantao => {
                    const status = calcularStatus(plantao.data);
                    if (plantao.status !== 'cancelado' && status === 'Realizado') {
                        totalPlantoes++;
                    }
                });
            }
            
            // Adicionar saldo anterior
            if (plantoes.saldoAnterior) {
                totalPlantoes += parseInt(plantoes.saldoAnterior);
            }
        }
        
        // Buscar folgas
        const folgasSnapshot = await get(folgasRef);
        let folgasUtilizadas = 0;
        
        if (folgasSnapshot.exists()) {
            Object.values(folgasSnapshot.val()).forEach(folga => {
                if (folga.status !== 'cancelado') {
                    folgasUtilizadas++;
                }
            });
        }
        
        // Calcular saldo disponível
        const saldoDisponivel = totalPlantoes - folgasUtilizadas;
        
        // Atualizar interface
        document.getElementById('totalPlantoes').textContent = totalPlantoes;
        document.getElementById('saldoFolgas').textContent = saldoDisponivel;
        
        // Salvar no Firebase
        await update(ref(db, `plantoes/${currentUser.uid}`), {
            totalPlantoes: totalPlantoes,
            saldoFolgas: saldoDisponivel,
            folgasUtilizadas: folgasUtilizadas
        });
        
        return { totalPlantoes, saldoFolgas: saldoDisponivel };
    } catch (error) {
        console.error('Erro ao atualizar contadores:', error);
        throw error;
    }
}

// Função para registrar plantão
async function registrarPlantao(dados) {
    try {
        // Ajustar a data para considerar o fuso horário
        const dataAjustada = new Date(dados.data + 'T00:00:00');
        dataAjustada.setMinutes(dataAjustada.getMinutes() + dataAjustada.getTimezoneOffset());
        
        const plantao = {
            data: dataAjustada.toISOString().split('T')[0], // Formato YYYY-MM-DD
            tipo: dados.tipo || 'PLANTAO',
            horario: dados.horario || '09:00 - 12:00',
            status: 'Pendente',
            timestamp: Date.now()
        };

        // Criar referência para os registros de plantão do usuário
        const plantoesRef = ref(db, `plantoes/${currentUser.uid}/registros`);
        
        // Verificar se já existe plantão nesta data
        const snapshot = await get(plantoesRef);
        let plantaoExistente = false;
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const registroExistente = childSnapshot.val();
                if (registroExistente.data === plantao.data) {
                    plantaoExistente = true;
                }
            });
        }

        if (plantaoExistente) {
            alert('Já existe um plantão registrado para esta data!');
            return;
        }

        // Registrar novo plantão
        await push(plantoesRef, plantao);
        
        // Atualizar contadores
        await atualizarContadores();
        
        alert('Plantão registrado com sucesso!');
        document.getElementById('formPlantao').reset();
    } catch (error) {
        console.error('Erro ao registrar plantão:', error);
        alert('Erro ao registrar plantão: ' + error.message);
    }
}

// Função para carregar plantões
function carregarPlantoes() {
    const plantoesRef = ref(db, `plantoes/${currentUser.uid}/registros`);
    
    onValue(plantoesRef, (snapshot) => {
        const historicoList = document.getElementById('historicoPlantoesList');
        if (!historicoList) return;
        
        historicoList.innerHTML = '';
        plantoesRealizados = 0;
        
        if (snapshot.exists()) {
            const plantoes = new Map();
            
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                const id = childSnapshot.key;
                
                // Tratar a data como UTC para evitar problemas de fuso horário
                const [year, month, day] = plantao.data.split('-').map(Number);
                const dataPlantao = new Date(Date.UTC(year, month - 1, day));
                
                const dataKey = plantao.data; // Usar a string YYYY-MM-DD como chave
                
                if (!plantoes.has(dataKey)) {
                    const dataFormatada = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(dataPlantao);
                    const diaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(dataPlantao);
                    
                    const status = calcularStatus(plantao.data);
                    if (status === 'Realizado') {
                        plantoesRealizados++;
                    }
                    
                    plantoes.set(dataKey, {
                        id,
                        data: dataPlantao, // Armazenar como objeto Date UTC
                        dataFormatada,
                        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
                        tipo: plantao.tipo || 'PLANTAO',
                        horario: plantao.horario || '09:00 - 12:00',
                        status
                    });
                }
            });
            
            const plantoesArray = Array.from(plantoes.values());
            
            // Obter a data de hoje em UTC para uma comparação precisa
            const agora = new Date();
            const hojeUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));

            const plantoesFuturos = [];
            const plantoesPassados = [];

            plantoesArray.forEach(plantao => {
                if (plantao.data >= hojeUTC) {
                    plantoesFuturos.push(plantao);
                } else {
                    plantoesPassados.push(plantao);
                }
            });

            // Ordenar futuros do mais próximo para o mais distante (crescente)
            plantoesFuturos.sort((a, b) => a.data.getTime() - b.data.getTime());

            // Ordenar passados do mais recente para o mais antigo (decrescente)
            plantoesPassados.sort((a, b) => b.data.getTime() - a.data.getTime());

            const plantoesOrdenados = [...plantoesFuturos, ...plantoesPassados];
            
            // Renderizar plantões
            plantoesOrdenados.forEach(plantao => {
                const row = document.createElement('tr');
                row.setAttribute('data-plantao-id', plantao.id);
                if (plantao.status === 'Realizado') {
                    row.classList.add('registro-realizado');
                }
                
                row.innerHTML = `
                    <td class="data-cell">${plantao.dataFormatada}</td>
                    <td>${plantao.diaSemana}</td>
                    <td>${formatarTipo(plantao.tipo)}</td>
                    <td>
                        <span class="horario-cell">
                            <i class="fas fa-clock"></i>
                            ${plantao.horario}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${plantao.status.toLowerCase()}">
                            <i class="fas ${plantao.status === 'Realizado' ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${plantao.status}
                        </span>
                    </td>
                    <td>
                        ${plantao.status === 'Pendente' ? `
                            <button onclick="cancelarPlantao('${plantao.id}')" class="btn-delete" title="Cancelar plantão">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </td>
                `;
                historicoList.appendChild(row);
            });
            
            // Atualizar contadores
            atualizarTotalPlantoes();
        } else {
            // Se não houver registros, mostrar mensagem
            historicoList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        Nenhum plantão registrado
                    </td>
                </tr>
            `;
        }
    });
}

// Função para calcular status do plantão
function calcularStatus(dataPlantao) {
    const hoje = new Date();
    const dataPlantaoObj = new Date(dataPlantao);
    
    // Ajustar para comparar apenas as datas
    const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataPlantaoAjustada = new Date(dataPlantaoObj.getFullYear(), dataPlantaoObj.getMonth(), dataPlantaoObj.getDate());
    
    if (dataPlantaoAjustada < dataHoje) {
        return 'Realizado';
    } else if (dataPlantaoAjustada.getTime() === dataHoje.getTime()) {
        return hoje.getHours() >= 18 ? 'Realizado' : 'Em andamento';
    }
    return 'Pendente';
}

// Função para atualizar saldo de folgas
function atualizarSaldoFolgas() {
    saldoFolgas = plantoesRealizados;
    document.getElementById('saldoFolgas').textContent = saldoFolgas;
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
    const folgasRef = ref(db, `folgas/${currentUser.uid}/registros`);
    
    onValue(folgasRef, (snapshot) => {
        const historicoList = document.getElementById('historicoFolgasList');
        if (!historicoList) return;
        
        historicoList.innerHTML = '';
        
        if (snapshot.exists()) {
            const folgas = new Map();
            
            snapshot.forEach((childSnapshot) => {
                const folga = childSnapshot.val();
                const id = childSnapshot.key;
                
                // Ajustar a data para considerar o fuso horário
                const dataFolga = new Date(folga.data + 'T00:00:00');
                dataFolga.setMinutes(dataFolga.getMinutes() + dataFolga.getTimezoneOffset());
                
                const dataKey = dataFolga.toISOString().split('T')[0];
                
                if (!folgas.has(dataKey)) {
                    const dataFormatada = dataFolga.toLocaleDateString('pt-BR');
                    const diaSemana = dataFolga.toLocaleDateString('pt-BR', { weekday: 'long' });
                    
                    const status = calcularStatus(folga.data);
                    
                    folgas.set(dataKey, {
                        id,
                        data: dataFolga,
                        dataFormatada,
                        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
                        status
                    });
                }
            });
            
            const folgasArray = Array.from(folgas.values());
            folgasArray.sort((a, b) => b.data - a.data);
            
            // Renderizar folgas
            folgasArray.forEach(folga => {
                const row = document.createElement('tr');
                if (folga.status === 'Realizado') {
                    row.classList.add('registro-realizado');
                }
                
                row.innerHTML = `
                    <td>${folga.dataFormatada}</td>
                    <td>${folga.diaSemana}</td>
                    <td>
                        <span class="badge badge-${folga.status.toLowerCase()}">
                            ${folga.status}
                        </span>
                    </td>
                    <td>
                        ${folga.status === 'Pendente' ? `
                            <button onclick="cancelarFolga('${folga.id}')" class="btn-delete" title="Cancelar folga">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : ''}
                    </td>
                `;
                historicoList.appendChild(row);
            });
        } else {
            historicoList.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">
                        Nenhuma folga registrada
                    </td>
                </tr>
            `;
        }
    });
}

// Função para registrar folga
async function registrarFolga(data) {
    try {
        // Verificar saldo de folgas
        const { saldoFolgas } = await atualizarContadores();
        
        if (saldoFolgas <= 0) {
            alert('Você não possui saldo de folgas disponível!');
            return false;
        }

        // Ajustar a data para considerar o fuso horário
        const dataAjustada = new Date(data + 'T00:00:00');
        dataAjustada.setMinutes(dataAjustada.getMinutes() + dataAjustada.getTimezoneOffset());
        
        const folga = {
            data: dataAjustada.toISOString().split('T')[0],
            status: 'Pendente',
            timestamp: Date.now()
        };

        // Criar referência para os registros de folga do usuário
        const folgasRef = ref(db, `folgas/${currentUser.uid}/registros`);
        
        // Verificar se já existe folga nesta data
        const snapshot = await get(folgasRef);
        let folgaExistente = false;
        
        if (snapshot.exists()) {
            const folgas = snapshot.val();
            const folgasAtivas = Object.values(folgas).filter(f => f.status !== 'cancelado');
            
            folgaExistente = folgasAtivas.some(f => f.data === folga.data);
            
            if (folgaExistente) {
                alert('Existe uma folga registrada para esta data.');
                return false;
            }
        }

        // Registrar nova folga
        await push(folgasRef, folga);
        
        // Atualizar contadores
        await atualizarContadores();
        
        alert('Folga registrada com sucesso!');
        return true;
    } catch (error) {
        console.error('Erro ao registrar folga:', error);
        alert('Erro ao registrar folga: ' + error.message);
        return false;
    }
}

// Função para cancelar folga
async function cancelarFolga(folgaId) {
    if (confirm('Tem certeza que deseja cancelar esta folga?')) {
        try {
            const folgaRef = ref(db, `folgas/${currentUser.uid}/registros/${folgaId}`);
            await remove(folgaRef);
            
            // Atualizar contadores
            await atualizarContadores();
            
            alert('Folga cancelada com sucesso!');
        } catch (error) {
            console.error('Erro ao cancelar folga:', error);
            alert('Erro ao cancelar folga: ' + error.message);
        }
    }
}

// Adicionar funções ao objeto window
window.registrarFolga = registrarFolga;
window.cancelarFolga = cancelarFolga;

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
document.getElementById('formPlantao').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = document.getElementById('dataPlantao').value;
    const horarioSelecionado = document.querySelector('input[name="horarioPlantao"]:checked').value;
    
    const horario = horarioSelecionado === 'MANHA' ? '09:00 - 12:00' : '14:00 - 18:00';
    
    try {
        await registrarPlantao({
            data: data,
            horario: horario,
            tipo: horarioSelecionado === 'MANHA' ? 'PLANTAO' : 'RECESSO'
        });
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
        const registroSucesso = await registrarFolga(dataFolga);
        
        if (registroSucesso) {
            document.getElementById('folgaForm').reset();
        }
    } catch (error) {
        console.error('Erro ao registrar folga:', error);
        alert('Erro ao registrar folga: ' + error.message);
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
                { header: 'Tipo', dataKey: 'tipo' },
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
                    tipo: cells[2].textContent,
                    horario: cells[3].textContent,
                    status: cells[4].textContent.trim()
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

// Adicionar funções ao objeto window
window.editarSaldoFolgas = editarSaldoFolgas;
window.fecharModal = fecharModal;
window.salvarSaldoFolgas = salvarSaldoFolgas;

// Função para fechar o modal
function fecharModal() {
    document.getElementById('modalEditarSaldo').style.display = 'none';
}

// Atualizar funções do modal
function editarSaldoFolgas() {
    const modal = document.getElementById('modalEditarSaldo');
    const input = document.getElementById('saldoFolgasInput');
    
    // Atualizar título do modal
    modal.querySelector('h3').innerHTML = '<i class="fas fa-edit"></i> Editar Saldo de Plantões';
    modal.querySelector('.input-help').textContent = 'Insira o saldo de plantões anteriores';
    
    // Carregar saldo atual
    const saldoRef = ref(db, `plantoes/${currentUser.uid}/saldoAnterior`);
    get(saldoRef).then((snapshot) => {
        input.value = snapshot.exists() ? snapshot.val() : 0;
    });
    
    modal.style.display = 'block';
}

async function salvarSaldoFolgas() {
    try {
        const saldo = parseInt(document.getElementById('saldoFolgasInput').value) || 0; // Usar novo ID
        
        // Salvar no Firebase
        await set(ref(db, `plantoes/${currentUser.uid}/saldoAnterior`), saldo);
        
        // Atualizar display
        await atualizarTotalPlantoes();
        
        fecharModal();
        alert('Saldo de folgas atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao salvar saldo:', error);
        alert('Erro ao salvar saldo de folgas: ' + error.message);
    }
}

// Atualizar função de carregar total
async function atualizarTotalPlantoes() {
    const plantoesRef = ref(db, `plantoes/${currentUser.uid}`);
    const snapshot = await get(plantoesRef);
    
    let totalPlantoes = 0;
    
    if (snapshot.exists()) {
        // Somar plantões normais
        const plantoes = snapshot.val();
        if (plantoes.registros) {
            Object.values(plantoes.registros).forEach(plantao => {
                if (plantao.status !== 'cancelado' && calcularStatus(plantao.data) === 'Realizado') {
                    totalPlantoes++;
                }
            });
        }
        
        // Adicionar saldo anterior
        if (plantoes.saldoAnterior) {
            totalPlantoes += parseInt(plantoes.saldoAnterior);
        }
    }
    
    // Atualizar ambos os contadores com o mesmo valor
    document.getElementById('totalPlantoes').textContent = totalPlantoes;
    document.getElementById('saldoFolgas').textContent = totalPlantoes;
}

// Fechar modal se clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('modalEditarSaldo');
    if (event.target === modal) {
        fecharModal();
    }
}

// Função para cancelar plantão
function cancelarPlantao(plantaoId) {
    if (!confirm('Tem certeza que deseja cancelar este plantão?')) {
        return;
    }

    // Corrigir o caminho da referência para o plantão
    const plantaoRef = ref(db, `plantoes/${currentUser.uid}/registros/${plantaoId}`);
    
    remove(plantaoRef)
        .then(() => {
            // Atualizar contadores
            atualizarContadores();
            
            // Remover a linha da tabela
            const row = document.querySelector(`tr[data-plantao-id="${plantaoId}"]`);
            if (row) {
                row.remove();
            }
            
            alert('Plantão cancelado com sucesso!');
        })
        .catch((error) => {
            console.error('Erro ao cancelar plantão:', error);
            alert('Erro ao cancelar plantão: ' + error.message);
        });
}

// Garantir que a função está disponível globalmente
window.cancelarPlantao = cancelarPlantao;

// Função para carregar saldo inicial
async function carregarSaldoInicial() {
    try {
        // Primeiro atualizar os contadores
        const { totalPlantoes, saldoFolgas } = await atualizarContadores();
        
        // Atualizar interface
        document.getElementById('totalPlantoes').textContent = totalPlantoes;
        document.getElementById('saldoFolgas').textContent = saldoFolgas;
        
        return saldoFolgas;
    } catch (error) {
        console.error('Erro ao carregar saldo inicial:', error);
        throw error;
    }
}

// Adicionar evento de submit para o formulário de folgas
document.addEventListener('DOMContentLoaded', () => {
    const folgaForm = document.getElementById('folgaForm');
    if (folgaForm) {
        folgaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const dataFolga = document.getElementById('dataFolga').value;
                const registroSucesso = await registrarFolga(dataFolga);
                
                if (registroSucesso) {
                    document.getElementById('folgaForm').reset();
                }
            } catch (error) {
                console.error('Erro ao registrar folga:', error);
                alert('Erro ao registrar folga: ' + error.message);
            }
        });
    }
});

// Função para formatar o tipo do plantão
function formatarTipo(tipo) {
    const tipos = {
        'PLANTAO': 'Plantão Judiciário',
        'RECESSO': 'Plantão Recesso',
        'FERIADO': 'Plantão Feriado'
    };

    return `
        <span class="tipo-badge ${tipo.toLowerCase()}">
            <i class="fas ${getTipoIcon(tipo)}"></i>
            ${tipos[tipo] || 'Plantão Judiciário'}
        </span>
    `;
}

// Função auxiliar para obter o ícone do tipo
function getTipoIcon(tipo) {
    const icons = {
        'PLANTAO': 'fa-gavel',
        'RECESSO': 'fa-home',
        'FERIADO': 'fa-calendar-day'
    };
    return icons[tipo] || 'fa-calendar';
}

function carregarHistoricoPlantoes() {
    const historicoList = document.getElementById('historicoPlantoesList');
    const userId = auth.currentUser.uid;
    const plantoesRef = ref(db, `plantoes/${userId}/registros`);

    get(plantoesRef).then((snapshot) => {
        if (snapshot.exists()) {
            let plantoes = [];
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                plantoes.push({
                    id: childSnapshot.key,
                    ...plantao
                });
            });

            // Log para debug: antes da ordenação
            console.log('Antes da ordenação:', plantoes.map(p => p.data));

            // Ordenar do mais antigo para o mais recente
            plantoes.sort((a, b) => {
                // Extrai dia, mês, ano
                const [diaA, mesA, anoA] = a.data.split('/').map(Number);
                const [diaB, mesB, anoB] = b.data.split('/').map(Number);
                
                const dateA = new Date(anoA, mesA - 1, diaA).getTime();
                const dateB = new Date(anoB, mesB - 1, diaB).getTime();

                return dateA - dateB; // Mais antigo primeiro (ascendente)
            });

            // Log para debug: depois da ordenação
            console.log('Depois da ordenação:', plantoes.map(p => p.data));

            let html = '';
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            // Montar o HTML do histórico
            plantoes.forEach(plantao => {
                const [dia, mes, ano] = plantao.data.split('/').map(Number);
                const dataPlantao = new Date(ano, mes - 1, dia);
                const diaSemana = dataPlantao.toLocaleDateString('pt-BR', {
                    weekday: 'long'
                });

                const status = plantao.status || 'agendado';
                let statusClass = '';
                let statusText = '';
                let acoes = '';

                switch(status) {
                    case 'realizado':
                        statusClass = 'badge-success';
                        statusText = 'Realizado';
                        break;
                    case 'cancelado':
                        statusClass = 'badge-danger';
                        statusText = 'Cancelado';
                        break;
                    default:
                        statusClass = dataPlantao < hoje ? 'badge-warning' : 'badge-primary';
                        statusText = dataPlantao < hoje ? 'Pendente' : 'Agendado';
                        if (dataPlantao >= hoje && status !== 'cancelado') {
                            acoes = `
                                <button class="btn-action cancel" onclick="cancelarPlantao('${plantao.id}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            `;
                        }
                        if (dataPlantao < hoje && status === 'agendado') {
                            acoes = `
                                <button class="btn-action complete" onclick="marcarRealizado('${plantao.id}')">
                                    <i class="fas fa-check"></i>
                                </button>
                            `;
                        }
                }

                html += `
                    <tr>
                        <td>${plantao.data}</td>
                        <td>${diaSemana}</td>
                        <td>
                            <span class="tipo-badge plantao">
                                <i class="fas fa-calendar-check"></i>
                                Plantão
                            </span>
                        </td>
                        <td>${plantao.horario || '09:00 - 12:00'}</td>
                        <td><span class="badge ${statusClass}">${statusText}</span></td>
                        <td class="actions">${acoes}</td>
                    </tr>
                `;
            });

            historicoList.innerHTML = html;
        } else {
            historicoList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">Nenhum plantão registrado.</td>
                </tr>
            `;
        }
    }).catch((error) => {
        console.error("Erro ao carregar histórico:", error);
        historicoList.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">Erro ao carregar histórico.</td>
            </tr>
        `;
    });
}

// Atualizar também a função de carregar histórico de folgas
function carregarHistoricoFolgas() {
    // Implementação similar para folgas...
}

// Chamar as funções quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    carregarHistoricoPlantoes();
    carregarHistoricoFolgas();
});
