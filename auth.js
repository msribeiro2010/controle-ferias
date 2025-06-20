// Importações do Firebase
import { app, auth, database } from './firebase-config.js';
import { config, sanitizeString, validateEmail, secureLog } from './config.js';
import { 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { 
    ref,
    set,
    get
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

document.addEventListener('DOMContentLoaded', () => {

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
    const resetPasswordContainer = document.getElementById('reset-password-container');
    const resetPasswordForm = document.querySelector('#reset-password-container form');

    // Funções de toggle
    function showResetPassword() {
        loginContainer.style.display = 'none';
        registroContainer.style.display = 'none';
        resetPasswordContainer.style.display = 'flex';
    }

    function showLogin() {
        loginContainer.style.display = 'flex';
        resetPasswordContainer.style.display = 'none';
    }

    // Event listeners para os links
    const forgotPasswordLink = document.querySelector('a[onclick="showResetPassword()"]');
    if(forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            showResetPassword();
        });
    }

    const backToLoginLink = document.querySelector('a[onclick="showLogin()"]');
    if(backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            showLogin();
        });
    }

    loginToggle.addEventListener('click', () => {
        loginContainer.style.display = 'block';
        registroContainer.style.display = 'none';
        resetPasswordContainer.style.display = 'none';
        loginToggle.classList.add('active');
        registroToggle.classList.remove('active');
    });

    registroToggle.addEventListener('click', () => {
        loginContainer.style.display = 'none';
        registroContainer.style.display = 'block';
        resetPasswordContainer.style.display = 'none';
        loginToggle.classList.remove('active');
        registroToggle.classList.add('active');
    });

    // Reset de senha
    resetPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value;
        if (!email) {
            alert('Por favor, digite seu email.');
            return;
        }

        sendPasswordResetEmail(auth, email)
            .then(() => {
                alert('Email de recuperação de senha enviado! Verifique sua caixa de entrada.');
                showLogin();
            })
            .catch((error) => {
                console.error('Erro ao enviar email de recuperação:', error);
                if (error.code === 'auth/user-not-found') {
                    alert('Email não encontrado. Verifique se digitou corretamente.');
                } else {
                    alert('Erro ao enviar email de recuperação. Por favor, tente novamente.');
                }
            });
    });

    // Registro de novo usuário
    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = sanitizeString(document.getElementById('registroNome').value.trim());
        const email = document.getElementById('registroEmail').value.trim();
        const senha = document.getElementById('registroSenha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;

        // Validações de entrada
        if (!nome || nome.length < 2) {
            registroMensagem.textContent = 'Nome deve ter pelo menos 2 caracteres';
            registroMensagem.style.color = 'red';
            return;
        }

        if (!validateEmail(email)) {
            registroMensagem.textContent = 'Email inválido';
            registroMensagem.style.color = 'red';
            return;
        }

        if (senha.length < 8) {
            registroMensagem.textContent = 'Senha deve ter pelo menos 8 caracteres';
            registroMensagem.style.color = 'red';
            return;
        }

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

            // Armazenamento mais seguro usando sessionStorage com dados mínimos
            sessionStorage.setItem('userAuth', JSON.stringify({
                uid: user.uid,
                email: user.email,
                timestamp: Date.now()
            }));
            
            // Dados do usuário podem ser buscados quando necessário
            secureLog('Login realizado com sucesso', { email: user.email });

            window.location.href = 'dashboard.html';
        } catch (error) {
            secureLog('Erro de login', { error: error.message });
            loginMensagem.textContent = error.message === 'Timeout: O login demorou muito tempo'
                ? 'O login está demorando muito. Por favor, tente novamente.'
                : 'Erro ao fazer login. Verifique seu email e senha.';
            loginMensagem.style.color = 'red';
            
            // Esconder loading
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        }
    });
});
