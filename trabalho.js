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
                const modalidade = document.querySelector('input[name="modalidade"]:checked').value;
                const observacao = document.getElementById('observacao').value;

                const registro = {
                    dataTrabalho: dataTrabalho,
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

// Função para formatar data com dia da semana
function formatarDataCompleta(data) {
    // Ajustar para o fuso horário local
    const dataLocal = new Date(data.getTime() + data.getTimezoneOffset() * 60000);
    
    return dataLocal.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Função para carregar registros
function carregarRegistros() {
    const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
    
    onValue(registrosRef, (snapshot) => {
        const historicoTrabalho = document.getElementById('historicoTrabalho');
        historicoTrabalho.innerHTML = '';
        let diasPresencial = 0;
        let diasRemoto = 0;
        
        if (snapshot.exists()) {
            const registros = [];
            
            snapshot.forEach((childSnapshot) => {
                const registro = childSnapshot.val();
                registro.id = childSnapshot.key;
                
                // Ajustar a data para o fuso horário local
                const dataOriginal = new Date(registro.dataTrabalho || registro.data);
                const dataAjustada = new Date(dataOriginal.getTime() + dataOriginal.getTimezoneOffset() * 60000);
                registro.dataAjustada = dataAjustada;
                
                registros.push(registro);
                
                if (registro.modalidade === 'presencial') {
                    diasPresencial++;
                } else {
                    diasRemoto++;
                }
            });

            // Ordenar por data em ordem crescente
            registros.sort((a, b) => a.dataAjustada - b.dataAjustada);

            registros.forEach(registro => {
                const dataFormatada = formatarDataCompleta(registro.dataAjustada);
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>${dataFormatada}</td>
                    <td>
                        <span class="badge ${registro.modalidade === 'presencial' ? 'badge-presencial' : 'badge-remoto'}">
                            <i class="fas fa-${registro.modalidade === 'presencial' ? 'building' : 'laptop-house'}"></i>
                            ${registro.modalidade.charAt(0).toUpperCase() + registro.modalidade.slice(1)}
                        </span>
                    </td>
                    <td>${registro.observacao || '-'}</td>
                    <td>
                        <div class="table-actions">
                            <button onclick="editarRegistro('${registro.id}')" class="btn-icon" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="excluirRegistro('${registro.id}')" class="btn-icon" title="Excluir">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                
                historicoTrabalho.appendChild(row);
            });

            // Atualizar contadores
            document.getElementById('diasPresencial').textContent = diasPresencial;
            document.getElementById('diasRemoto').textContent = diasRemoto;
        }
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
