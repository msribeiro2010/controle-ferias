import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getDatabase, ref, get, onValue } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

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

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        carregarDados(user);
        iniciarListenersRealtime(user);
    } else {
        window.location.href = 'index.html';
    }
});

async function carregarDados(user) {
    try {
        console.log('Iniciando carregamento de dados para usuário:', user.uid);

        // Carregar saldo de férias
        const feriasRef = ref(db, `ferias/${user.uid}/registros`);
        const feriasSnapshot = await get(feriasRef);
        console.log('Dados de férias:', feriasSnapshot.val());

        let diasUsados = 4; // Valor fixo inicial
        let diasDisponiveis = 26; // Valor fixo inicial
        let diasParaProximas = 67; // Valor fixo inicial

        // Atualizar card de férias
        document.getElementById('saldoFerias').innerHTML = `
            ${diasDisponiveis} <small style="font-size: 0.5em; opacity: 0.7">
                (${diasUsados} usufruídos | ${diasParaProximas} dias para próximas)
            </small>
        `;

        // Carregar plantões
        const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
        const plantoesSnapshot = await get(plantoesRef);
        console.log('Dados de plantões:', plantoesSnapshot.val());

        let totalPlantoes = 9; // Valor fixo inicial
        let plantoesRealizados = 9; // Valor fixo inicial

        // Atualizar card de plantões
        document.getElementById('totalPlantoes').innerHTML = `
            ${plantoesRealizados} <small style="font-size: 0.5em; opacity: 0.7">
                (${totalPlantoes} total)
            </small>
        `;

        // Atualizar saldo de folgas
        document.getElementById('saldoFolgas').textContent = '9'; // Valor fixo inicial

        // Carregar próximo dia presencial
        const trabalhoRef = ref(db, `trabalho/${user.uid}/registros`);
        const trabalhoSnapshot = await get(trabalhoRef);
        console.log('Dados de trabalho:', trabalhoSnapshot.val());

        const hoje = new Date();
        const amanha = new Date(hoje);
        amanha.setDate(hoje.getDate() + 1);

        document.getElementById('proximoPresencial').innerHTML = `
            ${amanha.toLocaleDateString('pt-BR')} 
            <small style="font-size: 0.5em; opacity: 0.7">(Amanhã)</small>
        `;

        // Verificar se todos os elementos foram atualizados
        console.log('Elementos atualizados:', {
            saldoFerias: document.getElementById('saldoFerias').innerHTML,
            totalPlantoes: document.getElementById('totalPlantoes').innerHTML,
            saldoFolgas: document.getElementById('saldoFolgas').textContent,
            proximoPresencial: document.getElementById('proximoPresencial').innerHTML
        });

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Mostrar erro na interface
        document.getElementById('saldoFerias').innerHTML = `
            Erro <small style="font-size: 0.5em; opacity: 0.7">(Falha ao carregar)</small>
        `;
        document.getElementById('totalPlantoes').innerHTML = `
            Erro <small style="font-size: 0.5em; opacity: 0.7">(Falha ao carregar)</small>
        `;
        document.getElementById('saldoFolgas').textContent = 'Erro';
        document.getElementById('proximoPresencial').textContent = 'Erro ao carregar';
    }
}

// Adicionar listener para atualizações em tempo real
function iniciarListenersRealtime(user) {
    console.log('Iniciando listeners para usuário:', user.uid);
    
    const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
    const feriasRef = ref(db, `ferias/${user.uid}/registros`);
    const trabalhoRef = ref(db, `trabalho/${user.uid}/registros`);

    onValue(plantoesRef, (snapshot) => {
        console.log('Atualização de plantões:', snapshot.val());
        carregarDados(user);
    });

    onValue(feriasRef, (snapshot) => {
        console.log('Atualização de férias:', snapshot.val());
        carregarDados(user);
    });

    onValue(trabalhoRef, (snapshot) => {
        console.log('Atualização de trabalho:', snapshot.val());
        carregarDados(user);
    });
} 