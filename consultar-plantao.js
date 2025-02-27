// Importar módulos do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, get, update, set } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Elemento para exibir saída
const outputElement = document.getElementById('output');

// Função para adicionar mensagem ao output
function log(message) {
    console.log(message);
    if (outputElement) {
        outputElement.textContent += message + '\n';
    }
}

// Função para atualizar o plantão
async function atualizarPlantao(userId, plantaoId, novaData) {
    try {
        // Referência para o plantão específico
        const plantaoRef = ref(db, `plantoes/${userId}/registros/${plantaoId}`);
        
        // Obter os dados atuais do plantão
        const snapshot = await get(plantaoRef);
        
        if (snapshot.exists()) {
            const plantao = snapshot.val();
            log(`Plantão encontrado: Data: ${plantao.data}, Tipo: ${plantao.tipo}, Status: ${plantao.status}`);
            
            // Criar um novo objeto com a data atualizada
            const plantaoAtualizado = {
                ...plantao,
                data: novaData
            };
            
            // Atualizar no banco de dados usando set para substituir completamente
            await set(plantaoRef, plantaoAtualizado);
            log('Plantão atualizado com sucesso!');
            
            // Verificar se a atualização foi bem-sucedida
            const verificacao = await get(plantaoRef);
            if (verificacao.exists()) {
                const plantaoVerificado = verificacao.val();
                log(`Verificação: Plantão agora tem data = ${plantaoVerificado.data}`);
            }
            
            return true;
        } else {
            log('Plantão não encontrado');
            return false;
        }
    } catch (error) {
        console.error('Erro ao atualizar plantão:', error);
        log(`Erro ao atualizar plantão: ${error.message}`);
        return false;
    }
}

// Função para encontrar e atualizar o plantão de 02/03/2025 para 03/03/2025
async function encontrarEAtualizarPlantao(userId) {
    try {
        // Verificar os dois formatos possíveis da data
        const dataAntigaISO = '2025-03-02';
        const dataAntigaBR = '02/03/2025';
        const dataNovaISO = '2025-03-03';
        const dataNovaBR = '03/03/2025';
        
        log(`Procurando plantão com data ${dataAntigaISO} ou ${dataAntigaBR}...`);
        
        const plantoesRef = ref(db, `plantoes/${userId}/registros`);
        const snapshot = await get(plantoesRef);
        
        if (snapshot.exists()) {
            let plantaoEncontrado = false;
            let plantaoId = null;
            let formatoData = null; // Para saber qual formato de data está sendo usado
            
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                if (plantao.data === dataAntigaISO || plantao.data === dataAntigaBR) {
                    plantaoEncontrado = true;
                    plantaoId = childSnapshot.key;
                    formatoData = plantao.data === dataAntigaISO ? 'ISO' : 'BR';
                    log(`Plantão encontrado! ID: ${plantaoId}, Data: ${plantao.data}, Tipo: ${plantao.tipo}, Formato: ${formatoData}`);
                }
            });
            
            if (plantaoEncontrado && plantaoId) {
                const novaData = formatoData === 'ISO' ? dataNovaISO : dataNovaBR;
                log(`Atualizando plantão de ${formatoData === 'ISO' ? dataAntigaISO : dataAntigaBR} para ${novaData}...`);
                await atualizarPlantao(userId, plantaoId, novaData);
                return true;
            } else {
                log(`Nenhum plantão encontrado com a data ${dataAntigaISO} ou ${dataAntigaBR}`);
                return false;
            }
        } else {
            log('Nenhum plantão encontrado para este usuário');
            return false;
        }
    } catch (error) {
        console.error('Erro ao encontrar e atualizar plantão:', error);
        log(`Erro ao encontrar e atualizar plantão: ${error.message}`);
        return false;
    }
}

// Função para listar todos os plantões do usuário
async function listarPlantoes(userId) {
    try {
        const plantoesRef = ref(db, `plantoes/${userId}/registros`);
        const snapshot = await get(plantoesRef);
        
        log('Lista de plantões:');
        
        if (snapshot.exists()) {
            let contador = 0;
            snapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                const plantaoId = childSnapshot.key;
                log(`${++contador}. ID: ${plantaoId}, Data: ${plantao.data}, Tipo: ${plantao.tipo}, Status: ${plantao.status}`);
            });
        } else {
            log('Nenhum plantão encontrado');
        }
    } catch (error) {
        console.error('Erro ao listar plantões:', error);
        log(`Erro ao listar plantões: ${error.message}`);
    }
}

// Adicionar evento ao botão
document.getElementById('btnAtualizar').addEventListener('click', async () => {
    // Limpar output
    if (outputElement) {
        outputElement.textContent = '';
    }
    
    log('Iniciando processo de atualização...');
    
    // Verificar autenticação
    const user = auth.currentUser;
    if (user) {
        log(`Usuário autenticado: ${user.uid}`);
        
        // Listar todos os plantões do usuário
        await listarPlantoes(user.uid);
        
        // Encontrar e atualizar o plantão
        const sucesso = await encontrarEAtualizarPlantao(user.uid);
        
        if (sucesso) {
            // Listar novamente para confirmar a atualização
            log('\nLista de plantões após a atualização:');
            await listarPlantoes(user.uid);
            log('\nProcesso concluído com sucesso!');
        } else {
            log('\nNão foi possível atualizar o plantão.');
        }
    } else {
        log('Usuário não autenticado. Por favor, faça login primeiro.');
    }
});

// Verificar autenticação ao carregar a página
auth.onAuthStateChanged(async (user) => {
    if (user) {
        log(`Página carregada. Usuário autenticado: ${user.uid}`);
        log('Clique no botão "Atualizar Plantão" para iniciar o processo.');
    } else {
        log('Usuário não autenticado. Por favor, faça login primeiro.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
    }
});
