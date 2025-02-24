import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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

        // Calcular dias de férias
        let diasUsados = 0;
        let diasDisponiveis = 30; // Total padrão anual
        
        if (feriasSnapshot.exists()) {
            const ferias = Object.values(feriasSnapshot.val())
                .filter(f => f.status !== 'cancelada');
            diasUsados = ferias.reduce((total, f) => total + parseInt(f.dias || 0), 0);
            diasDisponiveis = 30 - diasUsados;
        }

        // Calcular dias para próximas férias
        const hoje = new Date();
        const ultimasFerias = feriasSnapshot.exists() ? 
            Object.values(feriasSnapshot.val())
                .filter(f => f.status !== 'cancelada')
                .sort((a, b) => new Date(b.dataInicio) - new Date(a.dataInicio))[0] : null;

        let diasParaProximas = 365;
        if (ultimasFerias) {
            const dataUltimasFerias = new Date(ultimasFerias.dataInicio);
            const diffTime = Math.abs(hoje - dataUltimasFerias);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            diasParaProximas = Math.max(0, 365 - diffDays);
        }

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

        let totalPlantoes = 0;
        let plantoesRealizados = 0;

        if (plantoesSnapshot.exists()) {
            const plantoes = Object.values(plantoesSnapshot.val());
            totalPlantoes = plantoes.length;
            plantoesRealizados = plantoes.filter(p => p.status === 'realizado').length;

            // Encontrar próximo plantão
            const proximoPlantao = plantoes
                .filter(p => new Date(p.data.split('/').reverse().join('-')) >= hoje)
                .sort((a, b) => new Date(a.data.split('/').reverse().join('-')) - new Date(b.data.split('/').reverse().join('-')))[0];

            if (proximoPlantao) {
                const [dia, mes, ano] = proximoPlantao.data.split('/');
                const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                
                document.getElementById('proximoPlantaoDay').textContent = dia;
                document.getElementById('proximoPlantaoMonth').textContent = meses[parseInt(mes) - 1];
                document.getElementById('proximoPlantaoTime').textContent = `Horário: ${proximoPlantao.horario || '08:00'}`;
            }
        }

        // Atualizar card de plantões
        document.getElementById('totalPlantoes').innerHTML = `
            ${plantoesRealizados} <small style="font-size: 0.5em; opacity: 0.7">
                (${totalPlantoes} total)
            </small>
        `;

        // Calcular saldo de folgas
        let saldoFolgas = plantoesRealizados; // Cada plantão realizado gera uma folga

        // Subtrair folgas já utilizadas
        const folgasRef = ref(db, `folgas/${user.uid}/registros`);
        const folgasSnapshot = await get(folgasRef);
        
        if (folgasSnapshot.exists()) {
            const folgas = Object.values(folgasSnapshot.val());
            const folgasUsadas = folgas.filter(f => f.status !== 'cancelada').length;
            saldoFolgas -= folgasUsadas;

            // Encontrar próxima folga
            const proximaFolga = folgas
                .filter(f => f.status !== 'cancelada' && new Date(f.data.split('/').reverse().join('-')) >= hoje)
                .sort((a, b) => new Date(a.data.split('/').reverse().join('-')) - new Date(b.data.split('/').reverse().join('-')))[0];

            if (proximaFolga) {
                const [dia, mes, ano] = proximaFolga.data.split('/');
                const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                
                document.getElementById('proximaFolgaDay').textContent = dia;
                document.getElementById('proximaFolgaMonth').textContent = meses[parseInt(mes) - 1];
            }
        }

        // Atualizar saldo de folgas
        document.getElementById('saldoFolgas').textContent = saldoFolgas.toString();

        // Carregar próximo dia presencial
        const trabalhoRef = ref(db, `trabalho/${user.uid}/registros`);
        const trabalhoSnapshot = await get(trabalhoRef);
        console.log('Dados de trabalho:', trabalhoSnapshot.val());

        let proximoPresencial = 'Não encontrado';
        let descricaoPresencial = '';

        if (trabalhoSnapshot.exists()) {
            const registros = Object.values(trabalhoSnapshot.val())
                .filter(t => t.tipo === 'presencial' && new Date(t.data.split('/').reverse().join('-')) >= hoje)
                .sort((a, b) => new Date(a.data.split('/').reverse().join('-')) - new Date(b.data.split('/').reverse().join('-')));

            if (registros.length > 0) {
                const proximoRegistro = registros[0];
                proximoPresencial = proximoRegistro.data;
                
                // Calcular descrição (Hoje, Amanhã, ou em X dias)
                const dataPresencial = new Date(proximoRegistro.data.split('/').reverse().join('-'));
                const diffTime = Math.abs(dataPresencial - hoje);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    descricaoPresencial = 'Hoje';
                } else if (diffDays === 1) {
                    descricaoPresencial = 'Amanhã';
                } else {
                    descricaoPresencial = `Em ${diffDays} dias`;
                }
            }
        }

        document.getElementById('proximoPresencial').innerHTML = `
            ${proximoPresencial} 
            <small style="font-size: 0.5em; opacity: 0.7">(${descricaoPresencial})</small>
        `;

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

function iniciarListenersRealtime(user) {
    // Listener para férias
    const feriasRef = ref(db, `ferias/${user.uid}/registros`);
    onValue(feriasRef, (snapshot) => {
        console.log('Atualização em tempo real - férias:', snapshot.val());
        carregarDados(user);
    });

    // Listener para plantões
    const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
    onValue(plantoesRef, (snapshot) => {
        console.log('Atualização em tempo real - plantões:', snapshot.val());
        carregarDados(user);
    });

    // Listener para folgas
    const folgasRef = ref(db, `folgas/${user.uid}/registros`);
    onValue(folgasRef, (snapshot) => {
        console.log('Atualização em tempo real - folgas:', snapshot.val());
        carregarDados(user);
    });

    // Listener para trabalho
    const trabalhoRef = ref(db, `trabalho/${user.uid}/registros`);
    onValue(trabalhoRef, (snapshot) => {
        console.log('Atualização em tempo real - trabalho:', snapshot.val());
        carregarDados(user);
    });
}