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

console.log('Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Verificar autenticação
console.log('Verificando autenticação...');
auth.onAuthStateChanged((user) => {
    console.log('Estado de autenticação alterado:', user ? `Usuário autenticado: ${user.uid}` : 'Usuário não autenticado');
    if (user) {
        carregarDados(user);
        iniciarListenersRealtime(user);
    } else {
        console.log('Redirecionando para página de login...');
        window.location.href = 'index.html';
    }
});

async function carregarDados(user) {
    try {
        console.log('Iniciando carregamento de dados para usuário:', user.uid);

        // Atualizar saldo de férias
        atualizarSaldoFerias();

        // Atualizar total de plantões e obter os dados calculados
        const dadosPlantoes = await atualizarTotalPlantoes(user);
        const plantoesRealizados = dadosPlantoes.plantoesRealizados;
        const totalPlantoes = dadosPlantoes.totalPlantoes;

        // Carregar plantões
        const plantoesRef = ref(db, `plantoes/${user.uid}`);
        const plantoesSnapshot = await get(plantoesRef);
        console.log('Dados de plantões:', plantoesSnapshot.val());

        if (plantoesSnapshot.exists()) {
            const plantoes = Object.values(plantoesSnapshot.val());

            // Encontrar próximo plantão
            const proximoPlantao = plantoes
                .filter(p => {
                    // Verificar se a data é válida e futura
                    if (!p.data) {
                        return false;
                    }
                    return isDataFutura(p.data);
                })
                .sort((a, b) => {
                    try {
                        const dataA = padronizarFormatoData(a.data);
                        const dataB = padronizarFormatoData(b.data);
                        return new Date(dataA + 'T00:00:00') - new Date(dataB + 'T00:00:00');
                    } catch (error) {
                        console.log('Erro ao ordenar datas:', a.data, b.data, error);
                        return 0;
                    }
                })[0];

            if (proximoPlantao && proximoPlantao.data) {
                try {
                    const dataParts = padronizarFormatoData(proximoPlantao.data).split('-');
                    if (dataParts.length !== 3) {
                        throw new Error('Formato de data inválido: ' + proximoPlantao.data);
                    }
                    
                    const [ano, mes, dia] = dataParts;
                    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                    
                    // Formatar dia e mês com dois dígitos
                    const diaFormatado = dia ? dia.padStart(2, '0') : '01';
                    const mesFormatado = mes ? mes.padStart(2, '0') : '01';
                    const anoFormatado = ano || new Date().getFullYear().toString();
                    
                    const proximoPlantaoDayElement = document.getElementById('proximoPlantaoDay');
                    const proximoPlantaoMonthElement = document.getElementById('proximoPlantaoMonth');
                    const proximoPlantaoTimeElement = document.getElementById('proximoPlantaoTime');
                    
                    if (proximoPlantaoDayElement) proximoPlantaoDayElement.textContent = diaFormatado;
                    if (proximoPlantaoMonthElement) proximoPlantaoMonthElement.textContent = `${mesFormatado}/${anoFormatado}`;
                    if (proximoPlantaoTimeElement) proximoPlantaoTimeElement.textContent = `Horário: ${proximoPlantao.horario || '08:00'}`;
                } catch (error) {
                    console.log('Erro ao processar data do próximo plantão:', error);
                }
            }
        }

        // Atualizar card de plantões
        const totalPlantoesElement = document.getElementById('totalPlantoes');
        if (totalPlantoesElement) {
            totalPlantoesElement.innerHTML = `
                ${plantoesRealizados} <small style="font-size: 0.5em; opacity: 0.7">
                    (${totalPlantoes} total)
                </small>
            `;
            console.log(`Plantões realizados: ${plantoesRealizados}, Total de plantões: ${totalPlantoes}`);
        }

        // Calcular saldo de folgas
        let saldoFolgas = plantoesRealizados; // Cada plantão realizado gera uma folga

        // Subtrair folgas já utilizadas
        const folgasRef = ref(db, `folgas/${user.uid}`);
        const folgasSnapshot = await get(folgasRef);
        
        if (folgasSnapshot.exists()) {
            const folgas = Object.values(folgasSnapshot.val());
            const folgasUsadas = folgas.filter(f => f.status !== 'cancelada').length;
            saldoFolgas -= folgasUsadas;

            // Encontrar próxima folga
            const proximaFolga = folgas
                .filter(f => {
                    // Verificar se a data é válida e futura
                    if (!f.data || f.status === 'cancelada') {
                        return false;
                    }
                    return isDataFutura(f.data);
                })
                .sort((a, b) => {
                    try {
                        const dataA = padronizarFormatoData(a.data);
                        const dataB = padronizarFormatoData(b.data);
                        return new Date(dataA + 'T00:00:00') - new Date(dataB + 'T00:00:00');
                    } catch (error) {
                        console.log('Erro ao ordenar datas de folgas:', a.data, b.data, error);
                        return 0;
                    }
                })[0];

            if (proximaFolga && proximaFolga.data) {
                try {
                    const dataParts = padronizarFormatoData(proximaFolga.data).split('-');
                    if (dataParts.length !== 3) {
                        throw new Error('Formato de data inválido para folga: ' + proximaFolga.data);
                    }
                    
                    const [ano, mes, dia] = dataParts;
                    const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
                    
                    // Formatar dia e mês com dois dígitos
                    const diaFormatado = dia ? dia.padStart(2, '0') : '01';
                    const mesFormatado = mes ? mes.padStart(2, '0') : '01';
                    const anoFormatado = ano || new Date().getFullYear().toString();
                    
                    const proximaFolgaDayElement = document.getElementById('proximaFolgaDay');
                    const proximaFolgaMonthElement = document.getElementById('proximaFolgaMonth');
                    
                    if (proximaFolgaDayElement) proximaFolgaDayElement.textContent = diaFormatado;
                    if (proximaFolgaMonthElement) proximaFolgaMonthElement.textContent = `${mesFormatado}/${anoFormatado}`;
                } catch (error) {
                    console.log('Erro ao processar data da próxima folga:', error);
                }
            }
        }

        // Atualizar saldo de folgas
        const saldoFolgasElement = document.getElementById('saldoFolgas');
        if (saldoFolgasElement) {
            saldoFolgasElement.textContent = saldoFolgas.toString();
        }

        // Carregar próximo dia presencial
        const trabalhoRef = ref(db, `trabalho/${user.uid}`);
        const trabalhoSnapshot = await get(trabalhoRef);
        console.log('Dados de trabalho:', trabalhoSnapshot.val());

        let proximoPresencial = 'Não encontrado';
        let descricaoPresencial = '';

        if (trabalhoSnapshot.exists()) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            console.log('Data de hoje para comparação:', hoje.toISOString());
            
            let registrosPresenciais = [];
            const registrosData = trabalhoSnapshot.val();
            console.log('Total de registros de trabalho:', Object.keys(registrosData).length);
            
            // Processar todos os registros de trabalho
            Object.entries(registrosData).forEach(([key, registro]) => {
                console.log(`Analisando registro ${key}:`, registro);
                console.log('Modalidade do registro:', registro.modalidade);
                
                // Verificar se é um registro de trabalho presencial
                if (registro.modalidade === 'presencial') {
                    console.log('Encontrado registro presencial:', registro);
                    try {
                        // Converter a data para um objeto Date
                        const dataString = registro.dataTrabalho || registro.data;
                        console.log('Data original do registro:', dataString);
                        
                        // Verificar formato da data e converter para padrão
                        let dataFormatada;
                        if (dataString.includes('-')) {
                            // Formato ISO (YYYY-MM-DD)
                            dataFormatada = dataString;
                        } else if (dataString.includes('/')) {
                            // Formato BR (DD/MM/YYYY)
                            const [dia, mes, ano] = dataString.split('/');
                            dataFormatada = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
                        } else {
                            throw new Error(`Formato de data desconhecido: ${dataString}`);
                        }
                        
                        console.log('Data formatada para ISO:', dataFormatada);
                        const dataObj = new Date(dataFormatada);
                        console.log('Objeto Date criado:', dataObj.toISOString());
                        
                        // Verificar se a data é futura
                        if (dataObj >= hoje) {
                            console.log('Data é futura, adicionando aos registros presenciais');
                            registrosPresenciais.push({
                                ...registro,
                                dataObj: dataObj,
                                id: key
                            });
                        } else {
                            console.log('Data não é futura, ignorando');
                        }
                    } catch (error) {
                        console.error('Erro ao processar data do registro:', error);
                    }
                } else {
                    console.log('Registro não é presencial, ignorando');
                }
            });
            
            console.log('Registros presenciais futuros encontrados:', registrosPresenciais.length);
            
            // Ordenar registros pela data (mais próxima primeiro)
            registrosPresenciais.sort((a, b) => a.dataObj - b.dataObj);
            
            // Se encontramos registros presenciais futuros
            if (registrosPresenciais.length > 0) {
                const proximoRegistro = registrosPresenciais[0];
                console.log('Próximo registro presencial:', proximoRegistro);
                
                // Formatar a data para exibição
                const dataFormatada = proximoRegistro.dataObj.toLocaleDateString('pt-BR');
                proximoPresencial = dataFormatada;
                
                // Calcular descrição (Hoje, Amanhã, ou em X dias)
                const diffTime = proximoRegistro.dataObj - hoje;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    descricaoPresencial = 'Hoje';
                } else if (diffDays === 1) {
                    descricaoPresencial = 'Amanhã';
                } else {
                    descricaoPresencial = `Em ${diffDays} dias`;
                }
                
                console.log(`Próximo dia presencial: ${dataFormatada} (${descricaoPresencial})`);
            } else {
                console.log('Nenhum dia presencial futuro encontrado');
            }
        } else {
            console.log('Nenhum registro de trabalho encontrado');
        }

        const proximoPresencialElement = document.getElementById('proximoPresencial');
        if (proximoPresencialElement) {
            proximoPresencialElement.innerHTML = `${proximoPresencial} <small style="font-size: 0.5em; opacity: 0.7">(${descricaoPresencial})</small>`;
        }

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Mostrar erro na interface
        const saldoFeriasElement = document.getElementById('saldoFerias');
        const totalPlantoesElement = document.getElementById('totalPlantoes');
        const saldoFolgasElement = document.getElementById('saldoFolgas');
        const proximoPresencialElement = document.getElementById('proximoPresencial');
        
        if (saldoFeriasElement) {
            saldoFeriasElement.innerHTML = `
                Erro <small style="font-size: 0.5em; opacity: 0.7">(Falha ao carregar)</small>
            `;
        }
        if (totalPlantoesElement) {
            totalPlantoesElement.innerHTML = `
                Erro <small style="font-size: 0.5em; opacity: 0.7">(Falha ao carregar)</small>
            `;
        }
        if (saldoFolgasElement) saldoFolgasElement.textContent = 'Erro';
        if (proximoPresencialElement) proximoPresencialElement.textContent = 'Erro ao carregar';
    }
}

// Função para atualizar o saldo de folgas
function atualizarSaldoFolgasDisponivel(plantoesRealizados, folgasUsadas) {
    const saldoFolgasElement = document.getElementById('saldoFolgas');
    if (saldoFolgasElement) {
        // Cada plantão gera uma folga
        const folgasDisponiveis = plantoesRealizados - (folgasUsadas || 0);
        
        // Atualizar o elemento na interface
        saldoFolgasElement.textContent = folgasDisponiveis;
        
        // Log para depuração
        console.log(`Saldo de folgas: ${folgasDisponiveis} (Plantões realizados: ${plantoesRealizados}, Folgas usadas: ${folgasUsadas || 0})`);
    }
}

// Função para atualizar o total de plantões realizados
async function atualizarTotalPlantoes(user) {
    const plantoesRef = ref(db, `plantoes/${user.uid}`);
    const snapshot = await get(plantoesRef);
    
    let totalPlantoes = 0;
    let plantoesRealizados = 0;
    
    if (snapshot.exists()) {
        // Somar plantões normais
        const plantoes = snapshot.val();
        Object.values(plantoes).forEach(plantao => {
            if (plantao.status !== 'cancelado') {
                // Verificar se o plantão já foi realizado
                const dataPlantao = new Date(padronizarFormatoData(plantao.data) + 'T00:00:00');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                // Considerar como realizado se:
                // 1. O status for explicitamente 'realizado' OU
                // 2. A data do plantão já passou (é anterior à data atual)
                if (plantao.status === 'realizado' || dataPlantao < hoje) {
                    plantoesRealizados++;
                }
                
                totalPlantoes++;
            }
        });
        
        // Adicionar saldo anterior
        if (plantoes.saldoAnterior) {
            const saldoAnterior = parseInt(plantoes.saldoAnterior);
            totalPlantoes += saldoAnterior;
            plantoesRealizados += saldoAnterior; // Saldo anterior sempre conta como realizado
        }
    }
    
    // Atualizar o contador de plantões
    const totalPlantoesElement = document.getElementById('totalPlantoes');
    if (totalPlantoesElement) {
        totalPlantoesElement.innerHTML = `
            ${plantoesRealizados} <small style="font-size: 0.5em; opacity: 0.7">
                (${totalPlantoes} total)
            </small>
        `;
        console.log(`Plantões realizados: ${plantoesRealizados}, Total de plantões: ${totalPlantoes}`);
    }
    
    // Buscar folgas usadas e atualizar saldo de folgas
    const folgasRef = ref(db, `folgas/${user.uid}`);
    const folgasSnapshot = await get(folgasRef);
    
    let folgasUsadas = 0;
    if (folgasSnapshot.exists()) {
        // Contar folgas já utilizadas
        Object.values(folgasSnapshot.val()).forEach(folga => {
            if (folga.status !== 'cancelada') {
                const dataFolga = new Date(padronizarFormatoData(folga.data) + 'T00:00:00');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                if (dataFolga < hoje) {
                    folgasUsadas++;
                }
            }
        });
    }
    
    // Atualizar o saldo de folgas
    atualizarSaldoFolgasDisponivel(plantoesRealizados, folgasUsadas);
    
    return { plantoesRealizados, totalPlantoes, folgasUsadas };
}

function iniciarListenersRealtime(user) {
    console.log('Iniciando listeners em tempo real para usuário:', user.uid);
    
    // Listener para histórico de férias
    const USUARIO_KEY = 'usuario_logado';
    const historicoRef = ref(db, `users/${user.uid}/historicoFerias`);
    onValue(historicoRef, (snapshot) => {
        console.log('Atualização detectada no histórico de férias');
        
        // Atualizar dados no localStorage
        const usuarioAtual = JSON.parse(localStorage.getItem(USUARIO_KEY) || '{}');
        usuarioAtual.historicoFerias = snapshot.val() || [];
        localStorage.setItem(USUARIO_KEY, JSON.stringify(usuarioAtual));
        
        // Atualizar interface
        atualizarSaldoFerias();
    });
    
    // Listener para plantões
    const plantoesRef = ref(db, `plantoes/${user.uid}`);
    onValue(plantoesRef, (snapshot) => {
        console.log('Atualização detectada nos plantões');
        
        // Atualizar interface
        atualizarTotalPlantoes(user);
    });
    
    // Debounce para evitar múltiplas chamadas à carregarDados
    let debounceTimer;
    const debounceCarregarDados = (user) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            carregarDados(user);
        }, 300); // Aguarda 300ms antes de executar
    };

    // Listener para férias
    const feriasRef = ref(db, `ferias/${user.uid}`);
    onValue(feriasRef, (snapshot) => {
        console.log('Atualização em tempo real - férias:', snapshot.val());
        debounceCarregarDados(user);
    });

    // Listener para plantões
    const plantoesRef2 = ref(db, `plantoes/${user.uid}`);
    onValue(plantoesRef2, (snapshot) => {
        console.log('Atualização em tempo real - plantões:', snapshot.val());
        debounceCarregarDados(user);
    });

    // Listener para folgas
    const folgasRef = ref(db, `folgas/${user.uid}`);
    onValue(folgasRef, (snapshot) => {
        console.log('Atualização detectada nas folgas');
        
        // Atualizar interface
        atualizarTotalPlantoes(user);
    });

    // Listener para trabalho
    const trabalhoRef = ref(db, `trabalho/${user.uid}`);
    onValue(trabalhoRef, (snapshot) => {
        console.log('Atualização em tempo real - trabalho:', snapshot.val());
        debounceCarregarDados(user);
    });
}

// Função para padronizar o formato de data
function padronizarFormatoData(dataString) {
    if (!dataString) return null;
    
    try {
        // Verificar se a data já está no formato YYYY-MM-DD
        if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dataString; // Já está no formato esperado
        }
        
        // Verificar se a data está no formato DD/MM/YYYY
        if (dataString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            // Converter de DD/MM/YYYY para YYYY-MM-DD
            return dataString.split('/').reverse().join('-');
        }
        
        console.log('Formato de data não reconhecido:', dataString);
        return null;
    } catch (error) {
        console.log('Erro ao padronizar formato de data:', error);
        return null;
    }
}

// Função para verificar se uma data é válida e futura
function isDataFutura(dataString) {
    if (!dataString) return false;
    
    try {
        const dataPadronizada = padronizarFormatoData(dataString);
        if (!dataPadronizada) return false;
        
        const data = new Date(dataPadronizada + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        return data >= hoje;
    } catch (error) {
        console.log('Erro ao verificar data futura:', error);
        return false;
    }
}

// Função para verificar se uma data é válida e passada
function isDataPassada(dataString) {
    if (!dataString) return false;
    
    try {
        const dataPadronizada = padronizarFormatoData(dataString);
        if (!dataPadronizada) return false;
        
        const data = new Date(dataPadronizada + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        return data < hoje;
    } catch (error) {
        console.log('Erro ao verificar data passada:', error);
        return false;
    }
}

// Função para atualizar o saldo de férias
function atualizarSaldoFerias() {
    const USUARIO_KEY = 'usuario_logado';
    const usuarioLogado = JSON.parse(localStorage.getItem(USUARIO_KEY) || '{}');
    
    let diasUsufruidos = 0;
    const totalFerias = 30; // Todos funcionários começam com 30 dias
    const hoje = new Date();
    
    if (usuarioLogado.historicoFerias) {
        usuarioLogado.historicoFerias.forEach(periodo => {
            const dataFim = new Date(padronizarFormatoData(periodo.dataFim) + 'T00:00:00');
            if (dataFim < hoje) {
                diasUsufruidos += parseInt(periodo.diasFerias);
            }
        });
    }
    
    const saldoFerias = totalFerias - diasUsufruidos;
    
    // Determinar classe CSS baseada no saldo
    let saldoClass = '';
    let saldoMensagem = '';
    
    if (saldoFerias <= 0) {
        saldoClass = 'saldo-esgotado';
        saldoMensagem = '<span class="saldo-alerta">Saldo esgotado!</span>';
    } else if (saldoFerias <= 5) {
        saldoClass = 'saldo-baixo';
        saldoMensagem = '<span class="saldo-alerta">Saldo baixo!</span>';
    }
    
    // Atualizar card de férias
    const saldoFeriasElement = document.getElementById('saldoFerias');
    if (saldoFeriasElement) {
        saldoFeriasElement.innerHTML = `
            ${saldoFerias} <small style="font-size: 0.5em; opacity: 0.7">
                (${diasUsufruidos} usufruídos | ${totalFerias} total)
            </small>
            ${saldoMensagem}
        `;
        
        // Adicionar classe para estilo
        if (saldoClass) {
            saldoFeriasElement.classList.add(saldoClass);
        } else {
            saldoFeriasElement.classList.remove('saldo-baixo', 'saldo-esgotado');
        }
    }
}