// Configuração do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, push, onValue, remove } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
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

// Função para inicializar o app
function inicializarApp() {
    carregarRegistros();
    atualizarDataHora();
    inicializarFormulario();
}

// Função para inicializar o formulário
function inicializarFormulario() {
    const form = document.getElementById('registroTrabalhoForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const dataTrabalho = document.getElementById('dataTrabalho').value;
                const modalidade = document.getElementById('modalidade').value;
                const observacao = document.getElementById('observacao').value;

                const registro = {
                    data: dataTrabalho,
                    modalidade: modalidade,
                    observacao: observacao,
                    userId: currentUser.uid,
                    timestamp: Date.now()
                };

                const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
                await push(registrosRef, registro);
                
                alert('Trabalho registrado com sucesso!');
                form.reset();
                
            } catch (error) {
                console.error('Erro ao registrar trabalho:', error);
                alert('Erro ao registrar trabalho: ' + error.message);
            }
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

// Função para formatar data
function formatarData(dataString) {
    const [ano, mes, dia] = dataString.split('-').map(Number);
    return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
}

// Função para carregar registros
function carregarRegistros() {
    const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
    
    onValue(registrosRef, (snapshot) => {
        const historicoTrabalho = document.getElementById('historicoTrabalho');
        if (!historicoTrabalho) return;
        
        historicoTrabalho.innerHTML = '';
        let diasPresencial = 0;
        let diasRemoto = 0;

        if (snapshot.exists()) {
            const registros = [];
            snapshot.forEach((childSnapshot) => {
                const registro = childSnapshot.val();
                registro.id = childSnapshot.key;
                registros.push(registro);
                
                if (registro.modalidade === 'presencial') {
                    diasPresencial++;
                } else {
                    diasRemoto++;
                }
            });

            // Ordenar por data (mais recentes primeiro)
            registros.sort((a, b) => new Date(b.data) - new Date(a.data));

            registros.forEach(registro => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${formatarData(registro.data)}</td>
                    <td>
                        <span class="badge ${registro.modalidade}">
                            ${registro.modalidade === 'presencial' ? 'Presencial' : 'Remoto'}
                        </span>
                    </td>
                    <td>${registro.observacao || '-'}</td>
                    <td>
                        <button onclick="window.excluirRegistro('${registro.id}')" class="btn-delete" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                historicoTrabalho.appendChild(row);
            });
        }

        // Atualizar contadores
        document.getElementById('diasPresencial').textContent = diasPresencial;
        document.getElementById('diasRemoto').textContent = diasRemoto;
    });
}

// Função para excluir registro
window.excluirRegistro = async function(registroId) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        try {
            const registroRef = ref(db, `trabalho/${currentUser.uid}/${registroId}`);
            await remove(registroRef);
            alert('Registro excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            alert('Erro ao excluir registro: ' + error.message);
        }
    }
};

// Função para exportar histórico
window.exportarHistorico = async function() {
    try {
        const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
        
        onValue(registrosRef, (snapshot) => {
            if (snapshot.exists()) {
                const registros = [];
                snapshot.forEach((childSnapshot) => {
                    const registro = childSnapshot.val();
                    registros.push(registro);
                });

                // Ordenar por data
                registros.sort((a, b) => new Date(b.data) - new Date(a.data));

                // Criar CSV
                let csv = 'Data,Modalidade,Observação\n';
                registros.forEach(registro => {
                    csv += `${formatarData(registro.data)},${registro.modalidade},${registro.observacao || ''}\n`;
                });

                // Download do arquivo
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'historico-trabalho.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        }, { once: true });
    } catch (error) {
        console.error('Erro ao exportar histórico:', error);
        alert('Erro ao exportar histórico: ' + error.message);
    }
};
