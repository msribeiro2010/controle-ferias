import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
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
    const plantoesRef = ref(db, 'plantoes');
    onValue(plantoesRef, (snapshot) => {
        if (snapshot.exists()) {
            todosPlantoes = [];
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                plantao.id = childSnapshot.key;
                todosPlantoes.push(plantao);
            });
            aplicarFiltros();
        }
    });
}

// Função para aplicar filtros
function aplicarFiltros() {
    const mes = document.getElementById('filterMes').value;
    const ano = document.getElementById('filterAno').value;
    const funcionario = document.getElementById('filterFuncionario').value;
    
    let plantoesFilter = [...todosPlantoes];
    
    // Filtrar por mês e ano
    if (mes) {
        plantoesFilter = plantoesFilter.filter(plantao => {
            const [anoPlantao, mesPlantao] = plantao.data.split('-');
            return mesPlantao === mes.padStart(2, '0') && anoPlantao === ano;
        });
    } else if (ano) {
        plantoesFilter = plantoesFilter.filter(plantao => {
            const [anoPlantao] = plantao.data.split('-');
            return anoPlantao === ano;
        });
    }
    
    // Filtrar por funcionário
    if (funcionario) {
        plantoesFilter = plantoesFilter.filter(plantao => plantao.userId === funcionario);
    }
    
    // Ordenar por data (mais recentes primeiro)
    plantoesFilter.sort((a, b) => {
        const [anoA, mesA, diaA] = a.data.split('-').map(Number);
        const [anoB, mesB, diaB] = b.data.split('-').map(Number);
        const dataA = new Date(anoA, mesA - 1, diaA);
        const dataB = new Date(anoB, mesB - 1, diaB);
        return dataB - dataA;
    });
    
    exibirPlantoes(plantoesFilter);
}

// Função para exibir plantões filtrados
function exibirPlantoes(plantoes) {
    const listaPlantoesList = document.getElementById('listaPlantoesList');
    listaPlantoesList.innerHTML = '';
    document.getElementById('totalPlantoes').textContent = plantoes.length;
    
    plantoes.forEach(plantao => {
        const [ano, mes, dia] = plantao.data.split('-').map(Number);
        const data = new Date(ano, mes - 1, dia);
        const funcionario = todosFuncionarios.get(plantao.userId);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${formatarData(plantao.data)}</td>
            <td>${data.toLocaleDateString('pt-BR', { weekday: 'long' })}</td>
            <td>${funcionario ? (funcionario.nome || funcionario.email) : 'Usuário não encontrado'}</td>
            <td>${plantao.horarioInicio} - ${plantao.horarioFim}</td>
            <td>
                <span class="tipo-badge ${plantao.tipo.toLowerCase()}">
                    ${plantao.tipo}
                </span>
            </td>
            <td>
                <span class="status-badge ${plantaoJaPassou(plantao.data) ? 'realizado' : 'pendente'}">
                    ${plantaoJaPassou(plantao.data) ? 'Realizado' : 'Pendente'}
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
