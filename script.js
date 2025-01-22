console.log('Script carregado!');

document.addEventListener('DOMContentLoaded', () => {
    console.log('Página carregada, verificando localização:', window.location.pathname);

    // Verificar se estamos na página de login
    if (window.location.pathname.includes('login.html')) {
        console.log('Página de login detectada');

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const loginTab = document.getElementById('loginTab');
        const registerTab = document.getElementById('registerTab');

        console.log('Elementos encontrados:', {
            loginForm: !!loginForm,
            registerForm: !!registerForm,
            loginTab: !!loginTab,
            registerTab: !!registerTab
        });

        // Limpar qualquer usuário logado anteriormente
        localStorage.removeItem('usuarioLogado');

        // Trocar entre login e registro
        if (loginTab && registerTab) {
            loginTab.addEventListener('click', () => {
                console.log('Login tab clicked');
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
            });

            registerTab.addEventListener('click', () => {
                console.log('Register tab clicked');
                registerForm.classList.remove('hidden');
                loginForm.classList.add('hidden');
                registerTab.classList.add('active');
                loginTab.classList.remove('active');
            });
        } else {
            console.error('Tabs não encontradas');
        }

        // Login de usuário
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const username = document.getElementById('loginUser').value;
                const senha = document.getElementById('loginSenha').value;

                console.log('Login attempt:', username);

                const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
                console.log('Usuários cadastrados:', usuarios);

                const usuario = usuarios.find(u => u.username === username && u.senha === btoa(senha));

                if (usuario) {
                    console.log('Usuário encontrado:', usuario);
                    // Salvar usuário logado
                    localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
                    
                    // Log adicional para verificar o usuário salvo
                    console.log('Usuário salvo no localStorage:', 
                        JSON.parse(localStorage.getItem('usuarioLogado'))
                    );
                    
                    // Redirecionar para dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    console.error('Usuário não encontrado');
                    alert('Usuário ou senha incorretos.');
                }
            });
        } else {
            console.error('Formulário de login não encontrado');
        }

        // Registro de usuário
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                console.log('Register form submitted');

                // Verificar se todos os campos estão preenchidos
                const nome = document.getElementById('registerNome').value.trim();
                const username = document.getElementById('registerUser').value.trim();
                const email = document.getElementById('registerEmail').value.trim();
                const senha = document.getElementById('registerSenha').value;
                const confirmSenha = document.getElementById('registerConfirmSenha').value;

                console.log('Register details:', { 
                    nome: nome, 
                    username: username, 
                    email: email, 
                    senhaPreenchida: !!senha, 
                    confirmSenhaPreenchida: !!confirmSenha 
                });

                // Validações
                if (!nome || !username || !email || !senha || !confirmSenha) {
                    console.error('Todos os campos são obrigatórios');
                    alert('Por favor, preencha todos os campos.');
                    return;
                }

                if (senha !== confirmSenha) {
                    console.error('Senhas não coincidem');
                    alert('As senhas não coincidem.');
                    return;
                }

                // Verificar se usuário já existe
                const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
                console.log('Usuários existentes:', usuarios);

                const usuarioExistente = usuarios.find(u => u.username === username);
                if (usuarioExistente) {
                    console.error('Usuário já existe');
                    alert('Este usuário já está cadastrado.');
                    return;
                }

                // Criar novo usuário
                const novoUsuario = {
                    id: Date.now(), // ID único
                    nome,
                    username,
                    email,
                    senha: btoa(senha), // Codificar senha
                    totalFerias: 30, // Padrão de 30 dias
                    feriasUtilizadas: 0,
                    historicoFerias: []
                };

                // Adicionar usuário
                usuarios.push(novoUsuario);
                localStorage.setItem('usuarios', JSON.stringify(usuarios));

                console.log('Usuário registrado com sucesso');
                alert('Usuário registrado com sucesso!');
                
                // Limpar formulário
                registerForm.reset();
                
                // Trocar para aba de login
                loginForm.classList.remove('hidden');
                registerForm.classList.add('hidden');
                loginTab.classList.add('active');
                registerTab.classList.remove('active');
            });
        } else {
            console.error('Formulário de registro não encontrado');
        }
    } else {
        console.log('Não está na página de login');
    }

    // Verificar se estamos na página de dashboard
    if (window.location.pathname.includes('dashboard.html')) {
        const employeeForm = document.getElementById('employeeForm');
        const adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
        const saldoFeriasElement = document.getElementById('saldoFerias');
        const historicoCorpo = document.getElementById('historicoCorpo');

        // Adicionar verificação de nulidade
        if (employeeForm) {
            employeeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const nome = document.getElementById('nome').value;
                
                // Reinicia o saldo para 30 dias
                let totalFerias = 30;
                let feriasUtilizadas = 0;
                let historicoFerias = [];

                atualizarSaldoFerias(totalFerias, feriasUtilizadas, saldoFeriasElement);
                atualizarTabelaHistorico(historicoFerias, historicoCorpo);
                salvarDados(totalFerias, feriasUtilizadas, historicoFerias);
            });
        } else {
            console.error('Elemento employeeForm não encontrado');
        }

        if (adicionarFeriasForm) {
            adicionarFeriasForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const periodo = document.getElementById('periodoFerias').value;
                const diasFerias = parseInt(document.getElementById('diasFerias').value);

                // Verificar se já existem 3 períodos
                if (historicoFerias.length >= 3) {
                    alert(`Limite de 3 períodos de férias atingido.`);
                    return;
                }

                // Verificar se o período já está sendo usado por outro funcionário
                const periodoJaUtilizado = false; // Verificar se o período já está sendo usado por outro funcionário

                if (periodoJaUtilizado) {
                    alert('Este período de férias já está sendo usado por outro funcionário.');
                    return;
                }

                // Verificar se há saldo suficiente de férias
                if (diasFerias > (totalFerias - feriasUtilizadas)) {
                    alert('Saldo de férias insuficiente.');
                    return;
                }

                historicoFerias.push({ periodo, diasFerias });
                feriasUtilizadas += diasFerias;

                atualizarSaldoFerias(totalFerias, feriasUtilizadas, saldoFeriasElement);
                atualizarTabelaHistorico(historicoFerias, historicoCorpo);
                salvarDados(totalFerias, feriasUtilizadas, historicoFerias);
                adicionarFeriasForm.reset();
            });
        } else {
            console.error('Elemento adicionarFeriasForm não encontrado');
        }

        // Adicionar funcionalidade de exclusão de período
        if (historicoCorpo) {
            historicoCorpo.addEventListener('click', (e) => {
                if (e.target.classList.contains('excluir-periodo')) {
                    const periodoParaExcluir = e.target.closest('tr').dataset.periodo;
                    const indexPeriodo = historicoFerias.findIndex(ferias => ferias.periodo === periodoParaExcluir);
                    
                    if (indexPeriodo !== -1) {
                        const diasExcluidos = historicoFerias[indexPeriodo].diasFerias;
                        historicoFerias.splice(indexPeriodo, 1);
                        feriasUtilizadas -= diasExcluidos;

                        atualizarSaldoFerias(totalFerias, feriasUtilizadas, saldoFeriasElement);
                        atualizarTabelaHistorico(historicoFerias, historicoCorpo);
                        salvarDados(totalFerias, feriasUtilizadas, historicoFerias);
                    }
                }
            });
        } else {
            console.error('Elemento historicoCorpo não encontrado');
        }

        // Carregar dados salvos
        const dadosSalvos = localStorage.getItem('dadosFerias');
        if (dadosSalvos) {
            const dados = JSON.parse(dadosSalvos);
            let totalFerias = dados.totalFerias || 30;
            let feriasUtilizadas = dados.feriasUtilizadas || 0;
            let historicoFerias = dados.historicoFerias || [];

            atualizarSaldoFerias(totalFerias, feriasUtilizadas, saldoFeriasElement);
            atualizarTabelaHistorico(historicoFerias, historicoCorpo);
        }

        function atualizarSaldoFerias(totalFerias, feriasUtilizadas, saldoFeriasElement) {
            const saldoFerias = totalFerias - feriasUtilizadas;
            saldoFeriasElement.textContent = `${saldoFerias} dias`;
        }

        function atualizarTabelaHistorico(historicoFerias, historicoCorpo) {
            historicoCorpo.innerHTML = '';
            historicoFerias.forEach(entry => {
                const linha = document.createElement('tr');
                linha.dataset.periodo = entry.periodo;
                linha.innerHTML = `
                    <td>${entry.periodo}</td>
                    <td>${entry.diasFerias} dias</td>
                    <td><button class="excluir-periodo">Excluir</button></td>
                `;
                historicoCorpo.appendChild(linha);
            });
        }

        function salvarDados(totalFerias, feriasUtilizadas, historicoFerias) {
            localStorage.setItem('dadosFerias', JSON.stringify({
                totalFerias,
                feriasUtilizadas,
                historicoFerias
            }));
        }
    }
});

// Adicionar log global para capturar erros
window.addEventListener('error', (event) => {
    console.error('Erro global capturado:', event.error);
});
