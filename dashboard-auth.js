// Importações do Firebase
import { auth, database } from './firebase-config.js';
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { 
    ref, 
    update, 
    get,
    set,
    onDisconnect,
    connectDatabaseEmulator,
    onValue
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

// Chaves para armazenamento
const USUARIO_KEY = 'usuarioLogado';
const USUARIOS_KEY = 'usuarios';

// Funções auxiliares
const removeLoadingClass = () => {
    document.body.classList.remove('loading');
    document.querySelector('.loading-overlay').style.display = 'none';
};

const formatarData = (dataString) => {
    const data = new Date(dataString + 'T00:00:00');
    return data.toLocaleDateString('pt-BR');
};

let reconnectAttempts = 0;

const handleConnectionError = (error) => {
    console.error(' Erro de conexão com o Firebase:', error);
    
    if (reconnectAttempts < 5) {
        reconnectAttempts++;
        console.log(`Tentativa de reconexão ${reconnectAttempts}/5`);
        
        setTimeout(() => {
            console.log('Tentando reconectar...');
            // Tentar reconectar
            const connectedRef = ref(database, '.info/connected');
            onValue(connectedRef, (snap) => {
                if (snap.val() === true) {
                    console.log(' Reconectado com sucesso!');
                    reconnectAttempts = 0;
                }
            });
        }, Math.pow(2, reconnectAttempts) * 1000); // Exponential backoff
    } else {
        console.error(' Número máximo de tentativas de reconexão atingido');
        alert('Erro de conexão. Por favor, verifique sua internet e recarregue a página.');
    }
};

const setupDisconnectHandling = () => {
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            console.log(' Conectado ao Firebase');
            
            // Configurar ações de desconexão
            const userStatusRef = ref(database, 'status/' + auth.currentUser.uid);
            onDisconnect(userStatusRef).set('offline');
            
            // Atualizar status para online
            set(userStatusRef, 'online');
        } else {
            console.log(' Desconectado do Firebase');
        }
    });
};

const buscarDadosUsuario = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return null;

        const userRef = ref(database, 'users/' + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log('Nenhum dado encontrado para o usuário');
            return null;
        }
    } catch (error) {
        console.error('Erro ao buscar dados do usuário:', error);
        handleConnectionError(error);
        return null;
    }
};

// Função para calcular os dias de férias
function calcularDiasFerias(dataInicio, dataFim) {
    if (!dataInicio || !dataFim) return 0;
    
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    // Verifica se as datas são válidas
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0;
    
    // Calcula a diferença em dias
    const diffTime = Math.abs(fim - inicio);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o último dia
    
    return diffDays;
}

const mostrarFeriadosDoMes = (feriados) => {
    const feriadosContainer = document.getElementById('feriados-mes');
    if (!feriadosContainer) return;

    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth() + 1;
    const anoAtual = dataAtual.getFullYear();
    const nomesMeses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Atualizar título com o mês atual
    feriadosContainer.innerHTML = `<h3>Feriados de ${nomesMeses[mesAtual - 1]} de ${anoAtual}</h3>`;
    
    // Filtrar feriados do mês atual
    const feriadosDoMes = feriados.filter(feriado => {
        const [ano, mes] = feriado.data.split('-').map(Number);
        return mes === mesAtual && ano === anoAtual;
    });

    if (feriadosDoMes.length === 0) {
        feriadosContainer.innerHTML += '<p>Não há feriados este mês</p>';
        return;
    }

    // Ordenar feriados por data
    feriadosDoMes.sort((a, b) => new Date(a.data) - new Date(b.data));

    // Criar lista de feriados
    const lista = document.createElement('ul');
    lista.className = 'feriados-lista';

    feriadosDoMes.forEach(feriado => {
        const dia = feriado.data.split('-')[2];
        const li = document.createElement('li');
        const tipoClass = feriado.tipo.toLowerCase().replace(/\s+/g, '-');
        
        li.innerHTML = `
            <span class="data">${dia}</span>
            <span class="descricao">${feriado.descricao}</span>
            <span class="tipo ${tipoClass}">${feriado.tipo}</span>
        `;
        lista.appendChild(li);
    });

    feriadosContainer.appendChild(lista);

    // Configurar atualização automática na virada do mês
    const agora = new Date();
    const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
    const tempoAteProximoMes = proximoMes - agora;

    setTimeout(() => {
        mostrarFeriadosDoMes(feriados);
    }, tempoAteProximoMes);
};

const carregarFeriados = async () => {
    try {
        // Array de feriados fixo com datas corretas para 2025
        const feriadosArray = [
            {"id":36,"data":"2025-01-01","descricao":"Confraternização Universal","tipo":"NACIONAL"},
            {"id":37,"data":"2025-01-02","descricao":"Recesso de Janeiro","tipo":"RECESSO"},
            {"id":38,"data":"2025-01-03","descricao":"Recesso de Janeiro","tipo":"RECESSO"},
            {"id":39,"data":"2025-01-06","descricao":"Recesso de Janeiro","tipo":"RECESSO"},
            {"id":1,"data":"2025-03-03","descricao":"Carnaval","tipo":"FACULTATIVO"},
            {"id":2,"data":"2025-03-04","descricao":"Carnaval","tipo":"FACULTATIVO"},
            {"id":3,"data":"2025-03-05","descricao":"Quarta-feira de Cinzas","tipo":"FACULTATIVO"},
            {"id":4,"data":"2025-04-17","descricao":"Semana Santa","tipo":"FACULTATIVO"},
            {"id":5,"data":"2025-04-18","descricao":"Sexta-feira Santa","tipo":"NACIONAL"},
            {"id":6,"data":"2025-04-20","descricao":"Páscoa","tipo":"NACIONAL"},
            {"id":7,"data":"2025-04-21","descricao":"Tiradentes","tipo":"NACIONAL"},
            {"id":8,"data":"2025-05-01","descricao":"Dia do Trabalho","tipo":"NACIONAL"},
            {"id":9,"data":"2025-05-02","descricao":"Emenda de Feriado","tipo":"FACULTATIVO"},
            {"id":10,"data":"2025-06-19","descricao":"Corpus Christi","tipo":"FACULTATIVO"},
            {"id":11,"data":"2025-06-20","descricao":"Emenda de Feriado","tipo":"FACULTATIVO"},
            {"id":12,"data":"2025-07-09","descricao":"Revolução Constitucionalista","tipo":"ESTADUAL"},
            {"id":13,"data":"2025-09-07","descricao":"Independência do Brasil","tipo":"NACIONAL"},
            {"id":14,"data":"2025-10-12","descricao":"Nossa Senhora Aparecida","tipo":"NACIONAL"},
            {"id":15,"data":"2025-11-02","descricao":"Finados","tipo":"NACIONAL"},
            {"id":16,"data":"2025-11-15","descricao":"Proclamação da República","tipo":"NACIONAL"},
            {"id":17,"data":"2025-11-20","descricao":"Dia da Consciência Negra","tipo":"MUNICIPAL"},
            {"id":18,"data":"2025-12-24","descricao":"Véspera de Natal","tipo":"FACULTATIVO"},
            {"id":19,"data":"2025-12-25","descricao":"Natal","tipo":"NACIONAL"},
            {"id":20,"data":"2025-12-26","descricao":"Recesso de Final de Ano","tipo":"RECESSO"},
            {"id":21,"data":"2025-12-29","descricao":"Recesso de Final de Ano","tipo":"RECESSO"},
            {"id":22,"data":"2025-12-30","descricao":"Recesso de Final de Ano","tipo":"RECESSO"},
            {"id":23,"data":"2025-12-31","descricao":"Recesso de Final de Ano","tipo":"RECESSO"}
        ];

        // Primeiro, tente carregar do Firebase
        const feriadosRef = ref(database, 'feriados');
        const snapshot = await get(feriadosRef);
        
        // Se existir no Firebase, use esses dados, senão use o array fixo
        return snapshot.exists() ? Object.values(snapshot.val()) : feriadosArray;
    } catch (error) {
        console.error('Erro ao carregar feriados:', error);
        handleConnectionError(error);
        // Em caso de erro, retorna o array fixo como fallback
        return feriadosArray;
    }
};

const salvarPeriodoFerias = async (event) => {
    event.preventDefault();
    
    try {
        const dataInicio = document.getElementById('dataInicio').value;
        const dataFim = document.getElementById('dataFim').value;
        
        // Ajustar as datas para considerar o timezone local
        const dataInicioAjustada = new Date(dataInicio + 'T00:00:00');
        const dataFimAjustada = new Date(dataFim + 'T00:00:00');
        
        const periodo = {
            dataInicio: dataInicioAjustada.toISOString().split('T')[0],
            dataFim: dataFimAjustada.toISOString().split('T')[0],
            diasFerias: calcularDiasFerias(dataInicio, dataFim)
        };

        const userId = auth.currentUser.uid;
        const userRef = ref(database, 'users/' + userId);

        await update(userRef, periodo);
        
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const dadosSalvos = snapshot.val();
            console.log('Dados salvos no Firebase:', dadosSalvos);
            return dadosSalvos;
        } else {
            throw new Error('Não foi possível recuperar os dados salvos');
        }
    } catch (error) {
        console.error('Erro ao salvar período:', error);
        alert('Erro ao salvar período de férias');
        handleConnectionError(error);
        throw error;
    }
};

const atualizarSaldoFerias = () => {
    const saldoFeriasElement = document.getElementById('saldoFerias');
    
    // Elementos dos placares no dashboard
    const saldoFeriasValorElement = document.getElementById('saldoFeriasValor');
    const feriasUsufruidasValorElement = document.getElementById('feriasUsufruidasValor');
    const feriasRestantesValorElement = document.getElementById('feriasRestantesValor');
    
    if (saldoFeriasElement || saldoFeriasValorElement || feriasUsufruidasValorElement || feriasRestantesValorElement) {
        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY) || '{}');
        const hoje = new Date();
        let diasUsufruidos = 0;

        if (usuarioLogado.historicoFerias) {
            usuarioLogado.historicoFerias.forEach(periodo => {
                const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                if (dataFim < hoje) {
                    diasUsufruidos += parseInt(periodo.diasFerias);
                }
            });
        }

        const totalFerias = 30; // Todos funcionários começam com 30 dias
        const saldoFerias = totalFerias - diasUsufruidos;
        
        // Determinar classe CSS baseada no saldo
        let saldoClass = '';
        let saldoMensagem = '';
        
        if (saldoFerias <= 0) {
            saldoClass = 'saldo-esgotado';
            saldoMensagem = '<div class="saldo-alerta">Saldo esgotado!</div>';
        } else if (saldoFerias <= 5) {
            saldoClass = 'saldo-baixo';
            saldoMensagem = '<div class="saldo-alerta">Saldo baixo!</div>';
        }
        
        // Atualizar o elemento de saldo detalhado (se existir)
        if (saldoFeriasElement) {
            saldoFeriasElement.innerHTML = `
                <div class="ferias-info">
                    <div class="ferias-item">
                        <span class="ferias-label">Total:</span>
                        <span class="ferias-valor">${totalFerias} dias</span>
                    </div>
                    <div class="ferias-item">
                        <span class="ferias-label">Usufruído:</span>
                        <span class="ferias-valor">${diasUsufruidos} dias</span>
                    </div>
                    <div class="ferias-item saldo-atual ${saldoClass}">
                        <span class="ferias-label">Saldo:</span>
                        <span class="ferias-valor">${saldoFerias} dias</span>
                    </div>
                </div>
            `;
        }
        
        // Atualizar os placares no dashboard (se existirem)
        if (saldoFeriasValorElement) {
            saldoFeriasValorElement.textContent = `${totalFerias} dias`;
        }
        
        if (feriasUsufruidasValorElement) {
            feriasUsufruidasValorElement.textContent = `${diasUsufruidos} dias`;
        }
        
        if (feriasRestantesValorElement) {
            feriasRestantesValorElement.innerHTML = `${saldoFerias} dias ${saldoMensagem}`;
            
            // Adicionar classe para estilo
            if (saldoClass) {
                feriasRestantesValorElement.classList.add(saldoClass);
            } else {
                feriasRestantesValorElement.classList.remove('saldo-baixo', 'saldo-esgotado');
            }
        }
    }
};

const renderizarHistoricoFerias = (historico) => {
    const tbody = document.getElementById('historicoCorpo');
    tbody.innerHTML = '';
    
    if (!historico) return;
    
    Object.entries(historico).forEach(([key, periodo], index) => {
        const tr = document.createElement('tr');
        const hoje = new Date();
        const dataFim = new Date(periodo.dataFim + 'T00:00:00');
        const periodoPassado = dataFim < hoje;
        
        tr.innerHTML = `
            <td>Período ${index + 1}</td>
            <td>${formatarData(periodo.dataInicio)}</td>
            <td>${formatarData(periodo.dataFim)}</td>
            <td>${periodo.diasFerias} dias</td>
            <td>
                ${!periodoPassado ? `
                    <button onclick="editarPeriodoFerias(${index})" class="btn-editar" title="Editar período">
                        <i class="fas fa-edit"></i>
                    </button>
                ` : ''}
                ${!periodoPassado ? `
                    <button onclick="excluirPeriodoFerias(${index})" class="btn-excluir" title="Excluir período">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : '-'}
            </td>
        `;
        
        if (periodoPassado) {
            tr.classList.add('periodo-passado');
        }
        
        tbody.appendChild(tr);
    });
}

// Atualizar as funções de editar e excluir
window.editarPeriodoFerias = async (index) => {
    try {
        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY));
        const periodo = usuarioLogado.historicoFerias[index];

        if (!periodo) {
            console.error('Período não encontrado');
            return;
        }

        // Preencher o formulário com os dados do período selecionado
        const dataInicioInput = document.getElementById('dataInicio');
        const dataFimInput = document.getElementById('dataFim');
        const diasFeriasInput = document.getElementById('diasFerias');
        const form = document.getElementById('adicionarFeriasForm');

        dataInicioInput.value = periodo.dataInicio;
        dataFimInput.value = periodo.dataFim;
        diasFeriasInput.value = periodo.diasFerias;

        // Atualizar botão do formulário
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.innerHTML = '<i class="fas fa-save"></i> Atualizar Período';
        
        // Adicionar índice ao formulário para identificar qual período está sendo editado
        form.dataset.editIndex = index;

        // Rolar até o formulário
        form.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Erro ao editar período:', error);
        alert('Erro ao editar período de férias');
    }
};

window.excluirPeriodoFerias = async (index) => {
    try {
        if (!confirm('Tem certeza que deseja excluir este período de férias?')) {
            return;
        }

        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY));
        
        if (!usuarioLogado.historicoFerias || !usuarioLogado.historicoFerias[index]) {
            throw new Error('Período de férias não encontrado.');
        }

        // Remover o período
        usuarioLogado.historicoFerias.splice(index, 1);

        // Salvar no Firebase
        const userId = auth.currentUser.uid;
        const userRef = ref(database, 'users/' + userId);
        
        try {
            await update(userRef, {
                historicoFerias: usuarioLogado.historicoFerias
            });
            
            // Atualizar localStorage
            localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));
            
            // Atualizar interface
            atualizarSaldoFerias();
            renderizarHistoricoFerias(usuarioLogado.historicoFerias);
            
            // Mostrar mensagem de sucesso
            alert('Período de férias excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir período de férias:', error);
            alert('Erro ao excluir período de férias: ' + error.message);
        }
    } catch (error) {
        console.error('Erro ao excluir período de férias:', error);
        alert(error.message);
    }
};

// Modificar a função adicionarPeriodoFerias para melhor tratamento do saldo
const adicionarPeriodoFerias = async (event) => {
    event.preventDefault();
    console.group('Adicionar/Editar Período de Férias');
    
    try {
        const form = event.target;
        const editIndex = parseInt(form.dataset.editIndex);
        const isEditing = !isNaN(editIndex);

        const dataInicioInput = document.getElementById('dataInicio');
        const dataFimInput = document.getElementById('dataFim');
        const diasFeriasInput = document.getElementById('diasFerias');
        
        if (!dataInicioInput || !dataFimInput || !diasFeriasInput) {
            throw new Error('Campos obrigatórios não encontrados');
        }

        const dataInicio = dataInicioInput.value;
        const dataFim = dataFimInput.value;
        const diasFerias = parseInt(diasFeriasInput.value);

        if (!dataInicio || !dataFim || isNaN(diasFerias)) {
            throw new Error('Por favor, preencha todos os campos corretamente');
        }

        const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY));
        
        // Todos funcionários começam com 30 dias de férias
        const totalFerias = 30;
        
        // Calcular dias já usufruídos
        let diasUsufruidos = 0;
        const hoje = new Date();
        
        if (usuarioLogado.historicoFerias) {
            usuarioLogado.historicoFerias.forEach((periodo, index) => {
                // Se estamos editando, não considerar o período atual
                if (isEditing && index === editIndex) {
                    return;
                }
                
                const dataFimPeriodo = new Date(periodo.dataFim + 'T00:00:00');
                if (dataFimPeriodo < hoje) {
                    diasUsufruidos += parseInt(periodo.diasFerias);
                }
            });
        }
        
        // Verificar se o novo período ultrapassa o limite de 30 dias
        if (diasUsufruidos + diasFerias > totalFerias) {
            throw new Error(`Não é possível adicionar este período. Você já usufruiu ${diasUsufruidos} dias de férias. Saldo disponível: ${totalFerias - diasUsufruidos} dias.`);
        }

        // Atualizar ou adicionar o período
        const novoPeriodo = {
            dataInicio,
            dataFim,
            diasFerias,
            status: 'Pendente',
            dataSolicitacao: new Date().toISOString()
        };

        if (isEditing) {
            usuarioLogado.historicoFerias[editIndex] = novoPeriodo;
        } else {
            if (!usuarioLogado.historicoFerias) {
                usuarioLogado.historicoFerias = [];
            }
            usuarioLogado.historicoFerias.push(novoPeriodo);
        }

        // Salvar no Firebase
        const userId = auth.currentUser.uid;
        const userRef = ref(database, 'users/' + userId);
        
        try {
            await update(userRef, {
                historicoFerias: usuarioLogado.historicoFerias
            });
            
            // Atualizar localStorage
            localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));
            
            // Atualizar interface
            atualizarSaldoFerias();
            renderizarHistoricoFerias(usuarioLogado.historicoFerias);
            
            // Limpar formulário e sair do modo de edição
            limparFormularioFerias();
            isEditing = false;
            editIndex = -1;
            
            // Mostrar mensagem de sucesso
            alert(isEditing ? 'Período de férias atualizado com sucesso!' : 'Período de férias adicionado com sucesso!');
            
            // Fechar modal
            const modal = document.getElementById('modalFerias');
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao salvar período de férias:', error);
            alert('Erro ao salvar período de férias: ' + error.message);
        }
        
    } catch (error) {
        console.error('Erro ao adicionar/editar período de férias:', error);
        alert(error.message);
    }
    
    console.groupEnd();
};

const abrirModalFeriados = async () => {
    try {
        const feriados = await carregarFeriados();
        
        // Criar o conteúdo do modal
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-feriados';
        
        // Agrupar feriados por mês
        const feriadosPorMes = feriados.reduce((acc, feriado) => {
            const [ano, mes] = feriado.data.split('-').map(Number);
            if (ano === 2025) {
                if (!acc[mes]) acc[mes] = [];
                acc[mes].push(feriado);
            }
            return acc;
        }, {});

        // Nomes dos meses em português
        const nomesMeses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        // Criar HTML para cada mês
        const feriadosHTML = Object.entries(feriadosPorMes)
            .sort(([mesA], [mesB]) => Number(mesA) - Number(mesB))
            .map(([mes, feriadosDoMes]) => {
                const feriadosOrdenados = feriadosDoMes.sort((a, b) => 
                    new Date(a.data) - new Date(b.data)
                );
                
                return `
                    <div class="mes-feriados">
                        <div class="mes-header">
                            <span class="mes-numero">${mes.padStart(2, '0')}</span>
                            <h3>${nomesMeses[Number(mes) - 1]}</h3>
                        </div>
                        <ul>
                            ${feriadosOrdenados.map(feriado => {
                                const dia = feriado.data.split('-')[2];
                                return `
                                    <li>
                                        <div class="feriado-data">${dia}</div>
                                        <div class="feriado-info">
                                            <div class="feriado-descricao">${feriado.descricao}</div>
                                            <div class="feriado-dia-semana">${getDiaSemana(feriado.data)}</div>
                                        </div>
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                `;
            }).join('');

        modalContent.innerHTML = `
            <div class="modal-header">
                <div class="modal-title">
                    <i class="fas fa-calendar-alt"></i>
                    <h2>Calendário de Feriados 2025</h2>
                </div>
                <button class="fechar-modal" title="Fechar">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${feriadosHTML}
            </div>
        `;

        // Criar o modal
        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.appendChild(modalContent);

        // Adicionar ao body
        document.body.appendChild(modalContainer);

        // Adicionar animação de entrada
        setTimeout(() => modalContainer.classList.add('visible'), 50);

        // Fechar modal
        const fecharModal = () => {
            modalContainer.classList.remove('visible');
            setTimeout(() => modalContainer.remove(), 300);
            document.removeEventListener('keydown', handleKeyPress);
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Escape') fecharModal();
        };

        modalContainer.querySelector('.fechar-modal').addEventListener('click', fecharModal);
        modalContainer.addEventListener('click', (e) => {
            if (e.target === modalContainer) fecharModal();
        });
        
        document.addEventListener('keydown', handleKeyPress);

    } catch (error) {
        console.error('Erro ao abrir modal de feriados:', error);
        alert('Erro ao carregar feriados: ' + error.message);
    }
};

// Função auxiliar para obter o dia da semana corretamente
const getDiaSemana = (dataString) => {
    // Criar a data no fuso horário local
    const [ano, mes, dia] = dataString.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia); // mes - 1 porque em JS os meses começam do 0
    
    const diasSemana = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];

    // Verificar se é uma data válida antes de retornar
    if (isNaN(data.getTime())) {
        console.error('Data inválida:', dataString);
        return 'Data inválida';
    }

    return diasSemana[data.getDay()];
};

// Event Listeners e Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard: Evento DOMContentLoaded disparado');

    // Adicionar classe para evitar FOUC
    document.body.classList.add('loading');

    // Reduzir o timeout para 5 segundos
    const pageLoadTimeout = setTimeout(() => {
        console.warn('Timeout de carregamento atingido');
        removeLoadingClass();
    }, 5000); // Reduzido para 5 segundos

    try {
        // Elementos do formulário - declare como variáveis globais
        window.adicionarFeriasForm = document.getElementById('adicionarFeriasForm');
        window.dataInicioInput = document.getElementById('dataInicio');
        window.dataFimInput = document.getElementById('dataFim');
        window.diasFeriasInput = document.getElementById('diasFerias');
        window.historicoCorpo = document.getElementById('historicoCorpo');
        window.saldoFeriasElement = document.getElementById('saldoFerias');

        // Elementos do dashboard
        const nomeUsuarioElement = document.getElementById('employee-name');
        const usernameElement = document.getElementById('employee-username');
        const emailElement = document.getElementById('employee-email');

        // Event listeners para cálculo de dias
        if (dataInicioInput && dataFimInput && diasFeriasInput) {
            dataInicioInput.addEventListener('change', atualizarDiasFerias);
            dataFimInput.addEventListener('change', atualizarDiasFerias);
            diasFeriasInput.className = 'no-spinners';
            diasFeriasInput.setAttribute('readonly', 'true'); // Tornar o campo somente leitura
        }

        // Event listener para o formulário
        if (adicionarFeriasForm) {
            adicionarFeriasForm.removeEventListener('submit', adicionarPeriodoFerias);
            adicionarFeriasForm.addEventListener('submit', adicionarPeriodoFerias);
        }

        // Reorganizar os botões no header
        const headerButtons = document.querySelector('.header-buttons');
        if (headerButtons) {
            headerButtons.innerHTML = `
                <button id="btnFeriados" class="btn-header">
                    <i class="fas fa-calendar"></i> Feriados
                </button>
                <button id="btnConfig" class="btn-header">
                    <i class="fas fa-cog"></i> Configurações
                </button>
                <button id="btnLogout" class="btn-header">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </button>
            `;

            // Adicionar event listeners
            document.getElementById('btnFeriados').addEventListener('click', abrirModalFeriados);
            document.getElementById('btnConfig').onclick = () => window.location.href = 'configuracoes.html';
            document.getElementById('btnLogout').onclick = () => {
                auth.signOut().then(() => {
                    localStorage.removeItem(USUARIO_KEY);
                    window.location.href = 'index.html';
                });
            };
        }

        // Configurar tratamento de desconexão
        setupDisconnectHandling();

        // Inicializar interface
        atualizarSaldoFerias();
        renderizarHistoricoFerias(JSON.parse(localStorage.getItem(USUARIO_KEY) || '{}').historicoFerias || {});

        // Carregar e mostrar feriados do mês atual
        const feriados = await carregarFeriados();
        mostrarFeriadosDoMes(feriados);

        // Limpar o timeout quando tudo carregar com sucesso
        clearTimeout(pageLoadTimeout);
        removeLoadingClass();

    } catch (error) {
        console.error('Erro durante inicialização:', error);
        handleConnectionError(error);
        removeLoadingClass();
    }
});

// Observador de autenticação
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    try {
        // Carregar dados do usuário
        const usuarioFirebase = await buscarDadosUsuario() || {};
        const usuarioLocalStorage = JSON.parse(localStorage.getItem(USUARIO_KEY)) || {};

        // Mesclar dados
        const usuarioLogado = {
            ...usuarioLocalStorage,
            ...usuarioFirebase,
            uid: user.uid,
            email: user.email,
            nome: usuarioFirebase.nome || usuarioLocalStorage.nome || 'Usuário',
            username: usuarioFirebase.username || usuarioLocalStorage.username || user.email.split('@')[0]
        };

        // Atualizar localStorage
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioLogado));

        // Atualizar elementos do dashboard
        const nomeUsuarioElement = document.getElementById('employee-name');
        const usernameElement = document.getElementById('employee-username');
        const emailElement = document.getElementById('employee-email');

        if (nomeUsuarioElement) nomeUsuarioElement.textContent = usuarioLogado.nome;
        if (usernameElement) usernameElement.textContent = usuarioLogado.username;
        if (emailElement) emailElement.textContent = usuarioLogado.email;

        // Atualizar saldo de férias e histórico
        atualizarSaldoFerias();
        renderizarHistoricoFerias(usuarioLogado.historicoFerias || []);
        
        // Configurar listener para atualizações no histórico de férias
        const historicoRef = ref(database, `users/${user.uid}/historicoFerias`);
        onValue(historicoRef, (snapshot) => {
            console.log('Atualização detectada no histórico de férias');
            
            // Atualizar dados no localStorage
            const usuarioAtual = JSON.parse(localStorage.getItem(USUARIO_KEY)) || {};
            usuarioAtual.historicoFerias = snapshot.val() || [];
            localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioAtual));
            
            // Atualizar interface
            atualizarSaldoFerias();
            renderizarHistoricoFerias(usuarioAtual.historicoFerias);
        });

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        handleConnectionError(error);
    }
});

// Função para validar o domínio do email
const validarDominioEmail = (email) => {
    const dominioPermitido = 'trt15.jus.br';
    const dominio = email.split('@')[1];
    return dominio === dominioPermitido;
};

// Modificar a função de registro para incluir a validação
const registrarUsuario = async (event) => {
    event.preventDefault();
    console.group('Registrar Usuário');

    try {
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;
        const nome = document.getElementById('nome').value;
        const username = document.getElementById('username').value;

        // Validar domínio do email
        if (!validarDominioEmail(email)) {
            throw new Error('Apenas emails do domínio trt15.jus.br são permitidos');
        }

        // Validar campos obrigatórios
        if (!email || !senha || !nome || !username) {
            throw new Error('Todos os campos são obrigatórios');
        }

        // Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // Dados do usuário para salvar no Realtime Database
        const userData = {
            nome,
            username,
            email,
            totalFerias: 30,
            feriasUtilizadas: 0,
            historicoFerias: [],
            dataCriacao: new Date().toISOString()
        };

        // Salvar dados adicionais no Realtime Database
        await set(ref(database, 'users/' + user.uid), userData);

        // Salvar no localStorage
        localStorage.setItem(USUARIO_KEY, JSON.stringify({
            ...userData,
            uid: user.uid
        }));

        console.log('Usuário registrado com sucesso');
        window.location.href = 'dashboard.html';

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        let mensagemErro = 'Erro ao registrar usuário';

        switch (error.code) {
            case 'auth/email-already-in-use':
                mensagemErro = 'Este email já está em uso';
                break;
            case 'auth/invalid-email':
                mensagemErro = 'Email inválido';
                break;
            case 'auth/weak-password':
                mensagemErro = 'A senha deve ter pelo menos 6 caracteres';
                break;
            default:
                mensagemErro = error.message;
        }

        alert(mensagemErro);
    }

    console.groupEnd();
};

// Atualizar a estrutura do formulário onde ele é criado
const form = `
    <div class="adicionar-ferias-container">
        <h2>Adicionar Período de Férias</h2>
        <form id="adicionarFeriasForm">
            <div class="data-ferias-container">
                <div class="form-group">
                    <label for="dataInicio">Data de Início</label>
                    <input type="date" id="dataInicio" name="dataInicio" required>
                </div>
                <div class="form-group">
                    <label for="dataFim">Data de Fim</label>
                    <input type="date" id="dataFim" name="dataFim" required>
                </div>
                <div class="form-group">
                    <label for="diasFerias">Dias de Férias</label>
                    <input type="number" id="diasFerias" name="diasFerias" class="no-spinners" readonly>
                </div>
                <button type="submit">
                    <i class="fas fa-plus"></i>
                    Adicionar Período
                </button>
            </div>
        </form>
    </div>
`;

// Atualizar os event listeners dos campos de data
document.getElementById('dataInicio')?.addEventListener('change', atualizarDiasFerias);
document.getElementById('dataFim')?.addEventListener('change', atualizarDiasFerias);

function atualizarDiasFerias() {
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    const diasFerias = calcularDiasFerias(dataInicio, dataFim);
    
    document.getElementById('diasFerias').value = diasFerias || '';
}

function limparFormularioFerias() {
    const form = document.getElementById('adicionarFeriasForm');
    if (form) {
        form.reset();
        delete form.dataset.editIndex;
        form.querySelector('button[type="submit"]').textContent = 'Adicionar Período de Férias';
    }
}
