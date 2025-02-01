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
let todasFolgas = [];
let todosFuncionarios = new Map();

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        carregarFuncionarios();
        carregarFolgas();
        atualizarDataHora();
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

// Função para carregar funcionários
async function carregarFuncionarios() {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (snapshot.exists()) {
        const selectFuncionario = document.getElementById('filterFuncionario');
        selectFuncionario.innerHTML = '<option value="">Todos</option>';
        
        snapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key;
            const userData = childSnapshot.val();
            todosFuncionarios.set(userId, userData);
            
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = userData.nome;
            selectFuncionario.appendChild(option);
        });
    }
}

// Função para carregar folgas
async function carregarFolgas() {
    try {
        // Primeiro carregar todos os usuários
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        const usuarios = {};
        
        if (usersSnapshot.exists()) {
            usersSnapshot.forEach((userSnap) => {
                const userData = userSnap.val();
                usuarios[userSnap.key] = {
                    nome: userData.nome,
                    email: userData.email
                };
            });
        }
        
        // Depois carregar as folgas
        const folgasRef = ref(db, 'folgas');
        onValue(folgasRef, (snapshot) => {
            todasFolgas = [];
            
            if (snapshot.exists()) {
                snapshot.forEach((userSnapshot) => {
                    const userId = userSnapshot.key;
                    const userData = usuarios[userId];
                    
                    if (userSnapshot.val().registros) {
                        Object.entries(userSnapshot.val().registros).forEach(([folgaId, folga]) => {
                            if (folga.status !== 'cancelado') {
                                const dataFolga = new Date(folga.data + 'T00:00:00');
                                
                                todasFolgas.push({
                                    id: folgaId,
                                    userId: userId,
                                    nome: userData ? userData.nome : 'Usuário não encontrado',
                                    email: userData ? userData.email : '',
                                    data: dataFolga,
                                    dataFormatada: dataFolga.toLocaleDateString('pt-BR'),
                                    diaSemana: dataFolga.toLocaleDateString('pt-BR', { weekday: 'long' }),
                                    status: calcularStatus(folga.data)
                                });
                            }
                        });
                    }
                });
                
                // Ordenar por data mais recente
                todasFolgas.sort((a, b) => b.data - a.data);
                
                // Aplicar filtros e exibir
                aplicarFiltros();
            }
        });
    } catch (error) {
        console.error('Erro ao carregar folgas:', error);
    }
}

// Função para calcular status
function calcularStatus(dataFolga) {
    const hoje = new Date();
    const dataFolgaObj = new Date(dataFolga);
    
    const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataFolgaAjustada = new Date(dataFolgaObj.getFullYear(), dataFolgaObj.getMonth(), dataFolgaObj.getDate());
    
    if (dataFolgaAjustada < dataHoje) {
        return 'Realizado';
    } else if (dataFolgaAjustada.getTime() === dataHoje.getTime()) {
        return hoje.getHours() >= 18 ? 'Realizado' : 'Em andamento';
    }
    return 'Pendente';
}

// Função para aplicar filtros
function aplicarFiltros() {
    let folgasFiltradas = [...todasFolgas];
    
    const mes = document.getElementById('filterMes').value;
    const ano = document.getElementById('filterAno').value;
    const funcionario = document.getElementById('filterFuncionario').value;
    const status = document.getElementById('filterStatus').value;
    
    if (mes && ano) {
        folgasFiltradas = folgasFiltradas.filter(folga => {
            const dataFolga = folga.data;
            return dataFolga.getMonth() + 1 === parseInt(mes) && 
                   dataFolga.getFullYear() === parseInt(ano);
        });
    }
    
    if (funcionario) {
        folgasFiltradas = folgasFiltradas.filter(folga => folga.userId === funcionario);
    }
    
    if (status) {
        folgasFiltradas = folgasFiltradas.filter(folga => folga.status === status);
    }
    
    // Ordenar por data mais recente
    folgasFiltradas.sort((a, b) => b.data - a.data);
    
    exibirFolgas(folgasFiltradas);
}

// Função para exibir folgas
function exibirFolgas(folgas) {
    const listaFolgasList = document.getElementById('listaFolgasList');
    listaFolgasList.innerHTML = '';
    
    if (folgas.length > 0) {
        folgas.forEach(folga => {
            const row = document.createElement('tr');
            if (folga.status === 'Realizado') {
                row.classList.add('registro-realizado');
            }
            
            row.innerHTML = `
                <td>${folga.dataFormatada}</td>
                <td>${folga.diaSemana}</td>
                <td>${folga.nome || 'Nome não encontrado'}</td>
                <td>
                    <span class="badge badge-${folga.status.toLowerCase()}">
                        ${folga.status}
                    </span>
                </td>
            `;
            listaFolgasList.appendChild(row);
        });
    } else {
        listaFolgasList.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">
                    Nenhuma folga encontrada
                </td>
            </tr>
        `;
    }
}

// Função para exportar lista de folgas
window.exportarListaFolgas = async function() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Configurar título
        const titulo = 'Lista de Folgas';
        doc.setFontSize(16);
        doc.text(titulo, 15, 15);
        
        // Adicionar data de geração
        doc.setFontSize(10);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 22);
        
        // Preparar dados para a tabela
        const dados = todasFolgas.map(folga => ({
            data: folga.dataFormatada,
            dia: folga.diaSemana,
            funcionario: folga.nome,
            status: folga.status
        }));
        
        // Definir colunas
        const colunas = [
            { header: 'Data', dataKey: 'data' },
            { header: 'Dia', dataKey: 'dia' },
            { header: 'Funcionário', dataKey: 'funcionario' },
            { header: 'Status', dataKey: 'status' }
        ];
        
        // Criar tabela
        doc.autoTable({
            startY: 30,
            head: [colunas.map(col => col.header)],
            body: dados.map(item => colunas.map(col => item[col.dataKey])),
            theme: 'grid',
            headStyles: {
                fillColor: [74, 144, 226],
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
        
        // Gerar nome do arquivo
        const dataExport = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const nomeArquivo = `lista-folgas_${dataExport}.pdf`;
        
        // Salvar PDF
        doc.save(nomeArquivo);
        
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + error.message);
    }
};

// Adicionar função ao objeto window
window.aplicarFiltros = aplicarFiltros; 