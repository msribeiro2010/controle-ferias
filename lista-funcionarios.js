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
    carregarFuncionarios();
    atualizarDataHora();
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

// Função para carregar funcionários
async function carregarFuncionarios() {
    const hoje = new Date().toISOString().split('T')[0];
    const usersRef = ref(db, 'users');
    
    try {
        const usersSnapshot = await get(usersRef);
        const listaFuncionarios = document.getElementById('listaFuncionarios');
        listaFuncionarios.innerHTML = '';
        
        let totalFuncionarios = 0;
        let totalPresencial = 0;
        let totalRemoto = 0;

        if (usersSnapshot.exists()) {
            const funcionarios = [];
            
            for (const [userId, userData] of Object.entries(usersSnapshot.val())) {
                totalFuncionarios++;
                
                // Buscar status do trabalho para hoje
                const trabalhoRef = ref(db, `trabalho/${userId}`);
                const trabalhoSnapshot = await get(trabalhoRef);
                
                if (trabalhoSnapshot.exists()) {
                    const registros = [];
                    trabalhoSnapshot.forEach((childSnapshot) => {
                        const registro = childSnapshot.val();
                        if (registro.data === hoje) {
                            registros.push(registro);
                        }
                    });

                    if (registros.length > 0) {
                        const registroHoje = registros[0];
                        const statusHoje = registroHoje.modalidade === 'presencial' ? 'Presencial' : 'Remoto';
                        const ultimaAtualizacao = new Date(registroHoje.timestamp).toLocaleTimeString('pt-BR');
                        const observacao = registroHoje.observacao || '-';
                        
                        if (registroHoje.modalidade === 'presencial') {
                            totalPresencial++;
                        } else {
                            totalRemoto++;
                        }

                        // Adicionar apenas funcionários com registro
                        funcionarios.push({
                            nome: userData.nome || 'Sem nome',
                            email: userData.email,
                            statusHoje,
                            ultimaAtualizacao,
                            observacao
                        });
                    }
                }
            }
            
            // Ordenar primeiro por status (Presencial primeiro) e depois por nome
            funcionarios.sort((a, b) => {
                if (a.statusHoje === b.statusHoje) {
                    return a.nome.localeCompare(b.nome);
                }
                return a.statusHoje === 'Presencial' ? -1 : 1;
            });
            
            // Renderizar lista
            funcionarios.forEach(funcionario => {
                const row = document.createElement('tr');
                const statusClass = funcionario.statusHoje.toLowerCase().replace(' ', '-');
                row.innerHTML = `
                    <td>${funcionario.nome}</td>
                    <td>${funcionario.email}</td>
                    <td>
                        <span class="badge ${statusClass}">
                            ${funcionario.statusHoje}
                        </span>
                    </td>
                    <td>${funcionario.ultimaAtualizacao}</td>
                    <td>${funcionario.observacao}</td>
                `;
                listaFuncionarios.appendChild(row);
            });

            // Adicionar mensagem se não houver registros
            if (funcionarios.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="5" class="text-center">
                        <i class="fas fa-info-circle"></i>
                        Nenhum funcionário registrou presença hoje
                    </td>
                `;
                listaFuncionarios.appendChild(row);
            }
        }

        // Atualizar contadores
        document.getElementById('totalFuncionarios').textContent = totalFuncionarios;
        document.getElementById('totalPresencial').textContent = totalPresencial;
        document.getElementById('totalRemoto').textContent = totalRemoto;
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
        alert('Erro ao carregar funcionários: ' + error.message);
    }
}

// Função para exportar lista
window.exportarLista = async function() {
    try {
        const hoje = new Date().toLocaleDateString('pt-BR');
        const usersRef = ref(db, 'users');
        
        onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                let csv = 'Nome,Email,Status,Última Atualização,Observação\n';
                
                const funcionarios = [];
                snapshot.forEach((childSnapshot) => {
                    const userData = childSnapshot.val();
                    funcionarios.push({
                        nome: userData.nome || 'Sem nome',
                        email: userData.email,
                        status: userData.statusHoje || 'Não registrado',
                        ultimaAtualizacao: userData.ultimaAtualizacao || '-',
                        observacao: userData.observacao || '-'
                    });
                });

                // Ordenar por nome
                funcionarios.sort((a, b) => a.nome.localeCompare(b.nome));
                
                funcionarios.forEach(f => {
                    csv += `${f.nome},${f.email},${f.status},${f.ultimaAtualizacao},${f.observacao}\n`;
                });

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lista-funcionarios_${hoje}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        }, { once: true });
    } catch (error) {
        console.error('Erro ao exportar lista:', error);
        alert('Erro ao exportar lista: ' + error.message);
    }
}; 