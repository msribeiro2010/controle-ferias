import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { 
    getAuth, 
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    deleteUser
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    update,
    remove
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

// Configuração do Firebase
const firebaseConfig = {
    // ... suas configurações do Firebase ...
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Carregar dados do usuário
const carregarDadosUsuario = () => {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    
    // Preencher formulário de dados pessoais
    document.getElementById('nome').value = usuarioLogado.nome || '';
    document.getElementById('username').value = usuarioLogado.username || '';
    document.getElementById('email').value = usuarioLogado.email || '';
};

// Atualizar dados pessoais
const atualizarDadosPessoais = async (event) => {
    event.preventDefault();
    
    try {
        const nome = document.getElementById('nome').value;
        const username = document.getElementById('username').value;
        
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');

        // Atualizar no Firebase
        const userRef = ref(database, 'users/' + user.uid);
        await update(userRef, {
            nome,
            username
        });

        // Atualizar no localStorage
        const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
        usuarioLogado.nome = nome;
        usuarioLogado.username = username;
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));

        alert('Dados atualizados com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar dados:', error);
        alert('Erro ao atualizar dados: ' + error.message);
    }
};

// Alterar senha
const alterarSenha = async (event) => {
    event.preventDefault();
    
    try {
        const senhaAtual = document.getElementById('senhaAtual').value;
        const novaSenha = document.getElementById('novaSenha').value;
        const confirmarSenha = document.getElementById('confirmarSenha').value;

        if (novaSenha !== confirmarSenha) {
            throw new Error('As senhas não coincidem');
        }

        if (novaSenha.length < 6) {
            throw new Error('A nova senha deve ter pelo menos 6 caracteres');
        }

        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');

        // Reautenticar usuário
        const credential = EmailAuthProvider.credential(user.email, senhaAtual);
        await reauthenticateWithCredential(user, credential);

        // Atualizar senha
        await updatePassword(user, novaSenha);

        // Limpar formulário
        event.target.reset();
        
        alert('Senha alterada com sucesso!');
    } catch (error) {
        console.error('Erro ao alterar senha:', error);
        let mensagem = 'Erro ao alterar senha';
        
        switch (error.code) {
            case 'auth/wrong-password':
                mensagem = 'Senha atual incorreta';
                break;
            case 'auth/weak-password':
                mensagem = 'A nova senha é muito fraca';
                break;
            default:
                mensagem = error.message;
        }
        
        alert(mensagem);
    }
};

// Excluir conta do usuário
const excluirConta = async () => {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error('Usuário não autenticado');

        // Remover dados do usuário do Realtime Database
        const userRef = ref(database, 'users/' + user.uid);
        await remove(userRef);

        // Deletar a conta do usuário
        await deleteUser(user);

        // Limpar localStorage e redirecionar para a página inicial
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Erro ao excluir conta:', error);
        alert('Erro ao excluir conta: ' + error.message);
    }
};

// Toggle visibilidade da senha
const togglePassword = (button) => {
    const input = button.parentElement.querySelector('input');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// Mostrar modal de confirmação
const mostrarModalConfirmacao = () => {
    const modal = document.getElementById('modalConfirmacao');
    modal.style.display = 'flex';
};

// Fechar modal de confirmação
const fecharModalConfirmacao = () => {
    const modal = document.getElementById('modalConfirmacao');
    modal.style.display = 'none';
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    carregarDadosUsuario();

    // Form submit listeners
    document.getElementById('formDadosPessoais').addEventListener('submit', atualizarDadosPessoais);
    document.getElementById('formAlterarSenha').addEventListener('submit', alterarSenha);

    // Password toggle listeners
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => togglePassword(button));
    });

    // Exclusão de conta
    document.getElementById('btnExcluirConta').addEventListener('click', mostrarModalConfirmacao);
    document.getElementById('btnCancelarExclusao').addEventListener('click', fecharModalConfirmacao);
    document.getElementById('btnConfirmarExclusao').addEventListener('click', excluirConta);

    // Fechar modal ao clicar fora
    document.getElementById('modalConfirmacao').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalConfirmacao')) {
            fecharModalConfirmacao();
        }
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', () => {
        auth.signOut().then(() => {
            localStorage.removeItem('usuarioLogado');
            window.location.href = 'index.html';
        });
    });
}); 