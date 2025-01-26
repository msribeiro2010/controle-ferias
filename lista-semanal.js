import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

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

// Definir a data atual como 26/01/2025
const hoje = new Date('2025-01-26T00:00:00-03:00');
// Definir a data inicial da semana como 27/01/2025
let currentWeekStart = new Date('2025-01-27T00:00:00-03:00');

function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit',
        year: 'numeric'
    });
}

function formatarDataCompleta(data) {
    return data.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
    });
}

function atualizarDataHora() {
    const atualizarHora = () => {
        // Usar a data fixa de hoje (26/01/2025) ao invés da data atual do sistema
        const agora = new Date(hoje);
        agora.setHours(new Date().getHours());
        agora.setMinutes(new Date().getMinutes());
        
        document.getElementById('current-time').textContent = 
            agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('current-date').textContent = 
            formatarDataCompleta(agora);
    };

    atualizarHora();
    setInterval(atualizarHora, 1000);
}

function atualizarSemanaExibida() {
    const inicio = new Date(currentWeekStart);
    const fim = new Date(currentWeekStart);
    fim.setDate(inicio.getDate() + 4);
    
    inicio.setHours(0, 0, 0, 0);
    fim.setHours(0, 0, 0, 0);
    
    const textoSemana = `${formatarData(inicio)} a ${formatarData(fim)}`;
    document.getElementById('currentWeek').textContent = textoSemana;
    document.querySelector('.nav-title').textContent = 
        `Lista Semanal de Trabalho (${textoSemana})`;
}

window.semanaAnterior = function() {
    const novaData = new Date(currentWeekStart);
    novaData.setDate(novaData.getDate() - 7);
    currentWeekStart = novaData;
    atualizarSemanaExibida();
    carregarDadosSemana();
};

window.proximaSemana = function() {
    const novaData = new Date(currentWeekStart);
    novaData.setDate(novaData.getDate() + 7);
    currentWeekStart = novaData;
    atualizarSemanaExibida();
    carregarDadosSemana();
};

function carregarDadosSemana() {
    const usersRef = ref(db, 'users');
    const trabalhoRef = ref(db, 'trabalho');
    
    onValue(usersRef, (usersSnapshot) => {
        onValue(trabalhoRef, (trabalhoSnapshot) => {
            const tableBody = document.getElementById('weeklyTableBody');
            tableBody.innerHTML = '';
            
            if (usersSnapshot.exists() && trabalhoSnapshot.exists()) {
                const usuarios = [];
                const trabalhos = trabalhoSnapshot.val();

                usersSnapshot.forEach((userSnapshot) => {
                    const user = {
                        id: userSnapshot.key,
                        ...userSnapshot.val()
                    };

                    const registrosSemana = verificarRegistrosSemana(
                        trabalhos[user.id],
                        currentWeekStart
                    );

                    if (registrosSemana) {
                        usuarios.push(user);
                    }
                });

                usuarios.sort((a, b) => a.nome.localeCompare(b.nome));

                usuarios.forEach(user => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${user.nome}</td>`;
                    
                    for (let i = 0; i < 5; i++) {
                        const currentDate = new Date(currentWeekStart);
                        currentDate.setDate(currentWeekStart.getDate() + i);
                        
                        const modalidade = encontrarModalidade(
                            trabalhos[user.id], 
                            currentDate
                        );
                        
                        row.innerHTML += `
                            <td>
                                ${modalidade ? `
                                    <span class="badge-${modalidade.toLowerCase()}">
                                        <i class="fas fa-${modalidade === 'Presencial' ? 'building' : 'laptop-house'}"></i>
                                        ${modalidade}
                                    </span>
                                ` : '-'}
                            </td>
                        `;
                    }
                    
                    tableBody.appendChild(row);
                });
            }
        });
    });
}

function verificarRegistrosSemana(registrosUsuario, dataInicio) {
    if (!registrosUsuario) return false;

    const inicio = new Date(dataInicio);
    const fim = new Date(dataInicio);
    fim.setDate(fim.getDate() + 4);
    
    // Converter para strings de data para comparação
    const inicioString = inicio.toISOString().split('T')[0];
    const fimString = fim.toISOString().split('T')[0];

    return Object.values(registrosUsuario).some(registro => {
        const dataRegistroString = new Date(registro.dataTrabalho || registro.data)
            .toISOString().split('T')[0];
        return dataRegistroString >= inicioString && dataRegistroString <= fimString;
    });
}

function encontrarModalidade(registrosUsuario, data) {
    if (!registrosUsuario) return null;
    
    const dataString = data.toISOString().split('T')[0];
    
    const registro = Object.values(registrosUsuario).find(reg => {
        const regDataString = new Date(reg.dataTrabalho || reg.data)
            .toISOString().split('T')[0];
        return regDataString === dataString;
    });
    
    if (!registro) return null;
    
    // Garantir que a modalidade seja exatamente como foi registrada
    return registro.modalidade === 'presencial' ? 'Presencial' : 'Remoto';
}

// Inicialização
auth.onAuthStateChanged((user) => {
    if (user) {
        // Garantir que as atualizações aconteçam na ordem correta
        Promise.resolve().then(() => {
            atualizarSemanaExibida();
            atualizarDataHora();
            carregarDadosSemana();
        });
    } else {
        window.location.href = 'index.html';
    }
}); 