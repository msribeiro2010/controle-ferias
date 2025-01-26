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

// Função para formatar data
function formatarData(data) {
    if (typeof data === 'string') {
        const [ano, mes, dia] = data.split('-').map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
    }
    return data.toLocaleDateString('pt-BR');
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

// Função para exportar PDF
window.exportarPDF = async function() {
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
                registros.sort((a, b) => {
                    const dataA = new Date(a.dataTrabalho || a.data);
                    const dataB = new Date(b.dataTrabalho || b.data);
                    return dataB - dataA;
                });

                // Criar conteúdo do PDF
                const content = `
                    <div style="padding: 20px; font-family: Arial, sans-serif;">
                        <h2 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">
                            Histórico de Trabalho
                        </h2>
                        <div style="margin-bottom: 20px;">
                            Data de geração: ${formatarData(new Date())}
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Data</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Modalidade</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${registros.map(registro => `
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #dee2e6;">
                                            ${formatarData(registro.dataTrabalho || registro.data)}
                                        </td>
                                        <td style="padding: 12px; border: 1px solid #dee2e6;">
                                            <span style="
                                                padding: 6px 12px;
                                                border-radius: 20px;
                                                background-color: ${registro.modalidade === 'presencial' ? '#e8f5e9' : '#e3f2fd'};
                                                color: ${registro.modalidade === 'presencial' ? '#4caf50' : '#2196f3'};
                                            ">
                                                ${registro.modalidade.charAt(0).toUpperCase() + registro.modalidade.slice(1)}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; border: 1px solid #dee2e6;">
                                            ${registro.observacao || '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                // Configurações do PDF
                const opt = {
                    margin: 1,
                    filename: `historico-trabalho-${formatarData(new Date())}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { 
                        unit: 'cm', 
                        format: 'a4', 
                        orientation: 'portrait'
                    }
                };

                // Gerar PDF
                const element = document.createElement('div');
                element.innerHTML = content;
                html2pdf().set(opt).from(element).save();
            }
        }, { once: true });
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + error.message);
    }
};
