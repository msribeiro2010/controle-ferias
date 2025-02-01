import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, onValue, get } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
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
let todosPlantoes = [];
let todosFuncionarios = new Map();

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        carregarFuncionarios();
        carregarPlantoes();
        atualizarDataHora();
        inicializarFiltros();
    } else {
        window.location.href = 'index.html';
    }
});

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

// Função para carregar funcionários
function carregarFuncionarios() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
            const selectFuncionario = document.getElementById('filterFuncionario');
            selectFuncionario.innerHTML = '<option value="">Todos</option>';
            
            snapshot.forEach((childSnapshot) => {
                const userId = childSnapshot.key;
                const userData = childSnapshot.val();
                todosFuncionarios.set(userId, userData);
                
                const option = document.createElement('option');
                option.value = userId;
                option.textContent = userData.nome || userData.email;
                selectFuncionario.appendChild(option);
            });
        }
    });
}

// Função para carregar plantões
function carregarPlantoes() {
    // Referência para todos os plantões (não apenas do usuário atual)
    const plantoesRef = ref(db, 'plantoes');
    
    onValue(plantoesRef, (snapshot) => {
        const historicoList = document.getElementById('listaPlantoesList');
        if (!historicoList) return;
        
        historicoList.innerHTML = '';
        let todosPlantoes = [];
        
        if (snapshot.exists()) {
            // Coletar todos os plantões de todos os usuários
            snapshot.forEach((userSnapshot) => {
                const userId = userSnapshot.key;
                const userData = userSnapshot.val();
                
                if (userData.registros) {
                    Object.entries(userData.registros).forEach(([plantaoId, plantao]) => {
                        todosPlantoes.push({
                            id: plantaoId,
                            userId: userId,
                            ...plantao
                        });
                    });
                }
            });
            
            // Ordenar por data (mais antigo primeiro)
            todosPlantoes.sort((a, b) => {
                const dataA = new Date(a.data + 'T00:00:00');
                const dataB = new Date(b.data + 'T00:00:00');
                return dataA - dataB;
            });
            
            // Renderizar plantões
            todosPlantoes.forEach(plantao => {
                const dataPlantao = new Date(plantao.data + 'T00:00:00');
                const funcionario = todosFuncionarios.get(plantao.userId);
                const status = calcularStatus(plantao.data);
                
                const row = document.createElement('tr');
                row.setAttribute('data-plantao-id', plantao.id);
                
                // Adicionar classe para plantões realizados
                if (status === 'Realizado') {
                    row.classList.add('plantao-realizado');
                }
                
                row.innerHTML = `
                    <td class="data-cell">${dataPlantao.toLocaleDateString('pt-BR')}</td>
                    <td>${dataPlantao.toLocaleDateString('pt-BR', { weekday: 'long' })}</td>
                    <td class="funcionario-cell">
                        <i class="fas fa-user"></i>
                        ${funcionario ? (funcionario.nome || funcionario.email) : 'Usuário não encontrado'}
                    </td>
                    <td>${formatarTipo(plantao.tipo || 'PLANTAO')}</td>
                    <td>
                        <span class="horario-cell">
                            <i class="fas fa-clock"></i>
                            ${plantao.horario || '09:00 - 12:00'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${status.toLowerCase()}">
                            <i class="fas ${status === 'Realizado' ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${status}
                        </span>
                    </td>
                `;
                
                historicoList.appendChild(row);
            });
            
            // Atualizar contador
            document.getElementById('totalPlantoes').textContent = todosPlantoes.length;
        } else {
            historicoList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        Nenhum plantão encontrado
                    </td>
                </tr>
            `;
            document.getElementById('totalPlantoes').textContent = '0';
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

// Função para aplicar filtros
function aplicarFiltros() {
    const mes = document.getElementById('filterMes').value;
    const ano = document.getElementById('filterAno').value;
    const funcionario = document.getElementById('filterFuncionario').value;
    
    const historicoList = document.getElementById('listaPlantoesList');
    historicoList.innerHTML = '';
    
    const plantoesRef = ref(db, 'plantoes');
    
    onValue(plantoesRef, (snapshot) => {
        let plantoesFiltrados = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((userSnapshot) => {
                const userId = userSnapshot.key;
                const userData = userSnapshot.val();
                
                if (userData.registros) {
                    Object.entries(userData.registros).forEach(([plantaoId, plantao]) => {
                        // Converter a data do plantão
                        const [anoPlantao, mesPlantao] = plantao.data.split('-');
                        
                        // Aplicar filtros
                        let incluirPlantao = true;
                        
                        // Filtro de mês
                        if (mes) {
                            incluirPlantao = incluirPlantao && mesPlantao === mes.padStart(2, '0');
                        }
                        
                        // Filtro de ano
                        if (ano) {
                            incluirPlantao = incluirPlantao && anoPlantao === ano;
                        }
                        
                        // Filtro de funcionário
                        if (funcionario) {
                            incluirPlantao = incluirPlantao && userId === funcionario;
                        }
                        
                        if (incluirPlantao) {
                            plantoesFiltrados.push({
                                id: plantaoId,
                                userId: userId,
                                ...plantao
                            });
                        }
                    });
                }
            });
            
            // Ordenar por data
            plantoesFiltrados.sort((a, b) => {
                const dataA = new Date(a.data);
                const dataB = new Date(b.data);
                return dataA - dataB;
            });
            
            // Renderizar plantões filtrados
            plantoesFiltrados.forEach(plantao => {
                const dataPlantao = new Date(plantao.data + 'T00:00:00');
                const funcionario = todosFuncionarios.get(plantao.userId);
                const status = calcularStatus(plantao.data);
                
                const row = document.createElement('tr');
                row.setAttribute('data-plantao-id', plantao.id);
                
                if (status === 'Realizado') {
                    row.classList.add('plantao-realizado');
                }
                
                row.innerHTML = `
                    <td class="data-cell">${dataPlantao.toLocaleDateString('pt-BR')}</td>
                    <td>${dataPlantao.toLocaleDateString('pt-BR', { weekday: 'long' })}</td>
                    <td class="funcionario-cell">
                        <i class="fas fa-user"></i>
                        ${funcionario ? (funcionario.nome || funcionario.email) : 'Usuário não encontrado'}
                    </td>
                    <td>${formatarTipo(plantao.tipo || 'PLANTAO')}</td>
                    <td>
                        <span class="horario-cell">
                            <i class="fas fa-clock"></i>
                            ${plantao.horario || '09:00 - 12:00'}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${status.toLowerCase()}">
                            <i class="fas ${status === 'Realizado' ? 'fa-check-circle' : 'fa-clock'}"></i>
                            ${status}
                        </span>
                    </td>
                `;
                
                historicoList.appendChild(row);
            });
            
            // Atualizar contador
            document.getElementById('totalPlantoes').textContent = plantoesFiltrados.length;
        } else {
            historicoList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        Nenhum plantão encontrado
                    </td>
                </tr>
            `;
            document.getElementById('totalPlantoes').textContent = '0';
        }
    });
}

// Função para exibir plantões filtrados
function exibirPlantoes(plantoes) {
    const listaPlantoesList = document.getElementById('listaPlantoesList');
    listaPlantoesList.innerHTML = '';
    document.getElementById('totalPlantoes').textContent = plantoes.length;
    
    plantoes.forEach(plantao => {
        const [ano, mes, dia] = plantao.dataPlantao.split('-').map(Number);
        const data = new Date(ano, mes - 1, dia);
        const funcionario = todosFuncionarios.get(plantao.userId);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="data-cell">${formatarData(plantao.dataPlantao)}</td>
            <td>${data.toLocaleDateString('pt-BR', { weekday: 'long' })}</td>
            <td class="funcionario-cell">
                <i class="fas fa-user"></i>
                ${funcionario ? (funcionario.nome || funcionario.email) : 'Usuário não encontrado'}
            </td>
            <td>${formatarTipo(plantao.tipo || 'PLANTAO')}</td>
            <td>${formatarHorario(plantao.tipo || 'PLANTAO')}</td>
            <td>
                <span class="status-badge ${plantaoJaPassou(plantao.dataPlantao) ? 'status-concluido' : 'status-agendado'}">
                    <i class="fas ${plantaoJaPassou(plantao.dataPlantao) ? 'fa-check-circle' : 'fa-clock'}"></i>
                    ${plantaoJaPassou(plantao.dataPlantao) ? 'Realizado' : 'Pendente'}
                </span>
            </td>
        `;
        
        listaPlantoesList.appendChild(row);
    });
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

// Função para inicializar filtros
function inicializarFiltros() {
    const dataAtual = new Date();
    const mesAtual = (dataAtual.getMonth() + 1).toString();
    const anoAtual = dataAtual.getFullYear().toString();
    
    document.getElementById('filterMes').value = mesAtual;
    document.getElementById('filterAno').value = anoAtual;
}

// Função para exportar lista de plantões
async function exportarListaPlantoes() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurar fonte
        doc.setFont('helvetica');
        
        // Adicionar cabeçalho
        doc.setFontSize(20);
        doc.text('Lista de Plantões', 15, 20);
        
        // Adicionar informações dos filtros
        doc.setFontSize(12);
        const mes = document.getElementById('filterMes').value;
        const ano = document.getElementById('filterAno').value;
        const funcionario = document.getElementById('filterFuncionario');
        const funcionarioNome = funcionario.value ? funcionario.options[funcionario.selectedIndex].text : 'Todos';
        
        doc.text(`Período: ${mes ? `${mes}/${ano}` : ano}`, 15, 30);
        doc.text(`Funcionário: ${funcionarioNome}`, 15, 37);
        doc.text(`Data de exportação: ${new Date().toLocaleDateString('pt-BR')}`, 15, 44);
        
        // Preparar dados para a tabela
        const dados = [];
        const rows = document.querySelectorAll('#listaPlantoesList tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            dados.push([
                cells[0].textContent,
                cells[1].textContent,
                cells[2].textContent,
                cells[3].textContent,
                cells[4].textContent.trim(),
                cells[5].textContent.trim()
            ]);
        });
        
        // Criar tabela
        doc.autoTable({
            startY: 50,
            head: [['Data', 'Dia', 'Funcionário', 'Horário', 'Tipo', 'Status']],
            body: dados,
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
        const nomeArquivo = `lista-plantoes_${dataExport}.pdf`;
        
        // Salvar PDF
        doc.save(nomeArquivo);
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + error.message);
    }
}

// Adicionar funções ao objeto window
window.aplicarFiltros = aplicarFiltros;
window.exportarListaPlantoes = exportarListaPlantoes;

function formatarHorario(tipo) {
    const horarios = {
        'FERIADO': '09:00 - 12:00',
        'RECESSO': '14:00 - 18:00',
        'PLANTAO': '09:00 - 12:00'
    };

    return `
        <span class="horario-cell">
            <i class="fas fa-clock"></i>
            ${horarios[tipo] || '09:00 - 12:00'}
        </span>
    `;
}

function formatarTipo(tipo) {
    const tipos = {
        'FERIADO': 'Plantão Feriado',
        'RECESSO': 'Plantão Recesso',
        'PLANTAO': 'Plantão Judiciário'
    };

    return `
        <span class="tipo-badge ${tipo.toLowerCase()}">
            <i class="fas ${getTipoIcon(tipo)}"></i>
            ${tipos[tipo] || 'Plantão Judiciário'}
        </span>
    `;
}

function getTipoIcon(tipo) {
    const icons = {
        'FERIADO': 'fa-calendar-day',
        'RECESSO': 'fa-home',
        'PLANTAO': 'fa-gavel'
    };
    return icons[tipo] || 'fa-calendar';
}
