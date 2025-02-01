// Importações do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { 
    getDatabase,
    ref,
    set,
    get
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

document.addEventListener('DOMContentLoaded', () => {
    // Configuração do Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyDWk2EEgQu1UMEJ0XfDWVgzM5lqZxXcqhE",
        authDomain: "controle-ferias-1f8b4.firebaseapp.com",
        projectId: "controle-ferias-1f8b4",
        storageBucket: "controle-ferias-1f8b4.appspot.com",
        messagingSenderId: "937309914645",
        appId: "1:937309914645:web:bd6ed991b4a2487ee0f6bf",
        databaseURL: "https://controle-ferias-1f8b4-default-rtdb.firebaseio.com"
    };

    // Inicializar Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const database = getDatabase(app);

    // Verificar estado da autenticação
    auth.onAuthStateChanged((user) => {
        if (!user && !window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
    });

    const loginForm = document.getElementById('loginForm');
    const registroForm = document.getElementById('registroForm');
    const loginToggle = document.getElementById('loginToggle');
    const registroToggle = document.getElementById('registroToggle');
    const loginContainer = document.getElementById('login-container');
    const registroContainer = document.getElementById('registro-container');
    const loginMensagem = document.getElementById('login-mensagem');
    const registroMensagem = document.getElementById('registro-mensagem');

    loginToggle.addEventListener('click', () => {
        loginContainer.style.display = 'block';
        registroContainer.style.display = 'none';
    });

    registroToggle.addEventListener('click', () => {
        loginContainer.style.display = 'none';
        registroContainer.style.display = 'block';
    });

    // Registro de novo usuário
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('registroNome').value;
        const email = document.getElementById('registroEmail').value;
        const senha = document.getElementById('registroSenha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;

        if (senha !== confirmarSenha) {
            registroMensagem.textContent = 'Senhas não conferem';
            registroMensagem.style.color = 'red';
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            // Salvar dados adicionais do usuário no Realtime Database
            const userRef = ref(database, 'users/' + user.uid);
            await set(userRef, {
                nome: nome,
                email: email,
                totalFerias: 30,
                feriasUtilizadas: 0,
                historicoFerias: []
            });

            registroMensagem.textContent = 'Registro realizado com sucesso!';
            registroMensagem.style.color = 'green';

            // Limpar formulário
            registroForm.reset();
        } catch (error) {
            registroMensagem.textContent = 'Erro ao registrar usuário. Tente novamente.';
            console.error('Erro de registro:', error);
        }
    });

    // Login de usuário
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar loading
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        loginMensagem.textContent = 'Realizando login...';
        loginMensagem.style.color = 'blue';
        
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;

        try {
            // Adicionar timeout de 15 segundos
            const loginPromise = signInWithEmailAndPassword(auth, email, senha);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout: O login demorou muito tempo')), 15000)
            );

            const userCredential = await Promise.race([loginPromise, timeoutPromise]);
            const user = userCredential.user;

            // Buscar dados do usuário
            const userRef = ref(database, 'users/' + user.uid);
            const snapshot = await get(userRef);
            const userData = snapshot.val();

            if (!userData) {
                throw new Error('Dados do usuário não encontrados');
            }

            localStorage.setItem('usuarioLogado', JSON.stringify({
                uid: user.uid,
                email: user.email,
                nome: userData.nome,
                totalFerias: userData.totalFerias,
                feriasUtilizadas: userData.feriasUtilizadas,
                historicoFerias: userData.historicoFerias
            }));

            window.location.href = 'dashboard.html';
        } catch (error) {
            console.error('Erro de login:', error);
            loginMensagem.textContent = error.message === 'Timeout: O login demorou muito tempo'
                ? 'O login está demorando muito. Por favor, tente novamente.'
                : 'Erro ao fazer login. Verifique seu email e senha.';
            loginMensagem.style.color = 'red';
            
            // Esconder loading
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });
});
