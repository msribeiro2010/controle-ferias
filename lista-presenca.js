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
let todosRegistros = [];
let usuariosCache = new Map();

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        inicializarApp();
    } else {
        window.location.href = 'index.html';
    }
});

function inicializarApp() {
    const hoje = new Date();
    const anoMes = hoje.toISOString().slice(0, 7); // Formato: YYYY-MM
    document.getElementById('filterMes').value = anoMes;
    carregarUsuarios().then(() => {
        carregarRegistros();
    });
    atualizarDataHora();
}

// Carregar usuários para cache
async function carregarUsuarios() {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
            const userId = childSnapshot.key;
            const userData = childSnapshot.val();
            usuariosCache.set(userId, userData);
        });
    }
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

// Função para carregar registros
async function carregarRegistros() {
    const mesAno = document.getElementById('filterMes').value; // Formato: YYYY-MM
    const modalidadeFiltro = document.getElementById('filterModalidade').value;
    
    try {
        const trabalhoRef = ref(db, 'trabalho');
        const snapshot = await get(trabalhoRef);
        
        todosRegistros = [];
        let totalPresencial = 0;
        let totalRemoto = 0;
        let registrosPorDia = new Map(); // Para agrupar por dia

        if (snapshot.exists()) {
            // Primeiro, vamos coletar todos os registros do mês
            for (const [userId, userRegistros] of Object.entries(snapshot.val())) {
                const userData = usuariosCache.get(userId);
                
                for (const [registroId, registro] of Object.entries(userRegistros)) {
                    // Verifica se o registro é do mês selecionado
                    if (registro.data && registro.data.startsWith(mesAno) && 
                        (!modalidadeFiltro || registro.modalidade === modalidadeFiltro)) {
                        
                        const novoRegistro = {
                            id: registroId,
                            nome: userData?.nome || 'Sem nome',
                            data: registro.data,
                            modalidade: registro.modalidade,
                            horario: new Date(registro.timestamp).toLocaleTimeString('pt-BR'),
                            observacao: registro.observacao || '-',
                            dia: parseInt(registro.data.split('-')[2])
                        };

                        todosRegistros.push(novoRegistro);

                        // Agrupar por dia
                        if (!registrosPorDia.has(registro.data)) {
                            registrosPorDia.set(registro.data, {
                                presencial: 0,
                                remoto: 0,
                                registros: []
                            });
                        }
                        const diaInfo = registrosPorDia.get(registro.data);
                        diaInfo.registros.push(novoRegistro);
                        
                        if (registro.modalidade === 'presencial') {
                            diaInfo.presencial++;
                            totalPresencial++;
                        } else {
                            diaInfo.remoto++;
                            totalRemoto++;
                        }
                    }
                }
            }
        }

        // Atualizar tabela
        const tbody = document.getElementById('listaPresenca');
        tbody.innerHTML = '';
        
        if (todosRegistros.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <i class="fas fa-info-circle"></i>
                        Nenhum registro encontrado para o mês selecionado
                    </td>
                </tr>
            `;
        } else {
            // Agrupar por dia
            Array.from(registrosPorDia.entries())
                .sort((a, b) => b[0].localeCompare(a[0])) // Ordenar por data decrescente
                .forEach(([data, diaInfo]) => {
                    // Cabeçalho do dia
                    const headerRow = document.createElement('tr');
                    headerRow.className = 'date-header';
                    headerRow.innerHTML = `
                        <td colspan="5">
                            <div class="date-header-content">
                                <span class="date-label">${formatarData(data)}</span>
                                <div class="date-stats">
                                    <span class="badge presencial">
                                        <i class="fas fa-building"></i> ${diaInfo.presencial} Presencial
                                    </span>
                                    <span class="badge remoto">
                                        <i class="fas fa-house"></i> ${diaInfo.remoto} Remoto
                                    </span>
                                </div>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(headerRow);

                    // Registros do dia
                    diaInfo.registros
                        .sort((a, b) => a.nome.localeCompare(b.nome))
                        .forEach(registro => {
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td>${registro.nome}</td>
                                <td>${formatarData(registro.data)}</td>
                                <td>
                                    <span class="badge ${registro.modalidade}">
                                        ${registro.modalidade === 'presencial' ? 'Presencial' : 'Remoto'}
                                    </span>
                                </td>
                                <td>${registro.horario}</td>
                                <td>${registro.observacao}</td>
                            `;
                            tbody.appendChild(row);
                        });
                });
        }

        // Atualizar contadores
        document.getElementById('totalPresencial').textContent = totalPresencial;
        document.getElementById('totalRemoto').textContent = totalRemoto;
    } catch (error) {
        console.error('Erro ao carregar registros:', error);
        alert('Erro ao carregar registros: ' + error.message);
    }
}

// Função para formatar data
function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
}

// Função para aplicar filtros
window.aplicarFiltros = carregarRegistros;

// Função para exportar lista
window.exportarLista = function() {
    try {
        const dataFiltro = document.getElementById('filterData').value;
        const modalidadeFiltro = document.getElementById('filterModalidade').value;
        const dataFormatada = formatarData(dataFiltro);
        
        let csv = 'Nome,Data,Modalidade,Horário,Observação\n';
        
        todosRegistros.forEach(registro => {
            csv += `${registro.nome},${formatarData(registro.data)},${registro.modalidade},${registro.horario},${registro.observacao}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lista-presenca_${dataFormatada}${modalidadeFiltro ? '_' + modalidadeFiltro : ''}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Erro ao exportar lista:', error);
        alert('Erro ao exportar lista: ' + error.message);
    }
}; 