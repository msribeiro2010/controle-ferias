import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { getDatabase, ref, get } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

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

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        carregarDadosUsuario(user);
    } else {
        window.location.href = 'index.html';
    }
});

// Função para carregar dados do usuário
async function carregarDadosUsuario(user) {
    try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            const nome = userData.nome || 'Nome não informado';
            const email = userData.email || user.email;
            
            // Atualizar cabeçalho
            document.getElementById('headerUserName').textContent = nome;
            document.getElementById('headerUserEmail').textContent = email;
            
            // Atualizar cards de informação
            document.getElementById('userName').textContent = nome;
            document.getElementById('userEmail').textContent = email;
            document.getElementById('userUsername').textContent = userData.username || 'Não definido';
            
            // Formatar data de cadastro
            const createdAt = new Date(user.metadata.creationTime);
            document.getElementById('userCreatedAt').textContent = createdAt.toLocaleDateString('pt-BR');
            
        } else {
            console.log('Dados do usuário não encontrados');
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
} 