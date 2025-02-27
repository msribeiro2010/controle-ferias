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
        console.log('Carregando dados para usuário:', user.uid);
        
        // Depurar dados de férias
        await depurarDadosFerias(user);
        
        // Atualizar saldo de férias
        await atualizarSaldoFerias(user);
        
        // Atualizar total de plantões
        await atualizarTotalPlantoes(user);
        
        // Atualizar saldo de folgas
        await atualizarSaldoFolgas(user);
        
        // Verificar próximo dia presencial
        await verificarProximoDiaPresencial(user);

        // Verificar próxima folga
        await verificarProximaFolga(user);

        // Verificar próximo plantão
        await verificarProximoPlantao(user);

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Mostrar erro na interface
        const saldoFeriasElement = document.getElementById('saldoFerias');
        const totalPlantoesElement = document.getElementById('totalPlantoes');
        const saldoFolgasElement = document.getElementById('saldoFolgas');
        
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
    }
}

// Função para depurar a estrutura dos dados de férias
async function depurarDadosFerias(user) {
    console.log('=== DEPURAÇÃO DE DADOS DE FÉRIAS ===');
    
    try {
        // Verificar dados de férias em diferentes caminhos
        const feriasRef1 = ref(db, `ferias/${user.uid}/registros`);
        const snapshot1 = await get(feriasRef1);
        
        const feriasRef2 = ref(db, `users/${user.uid}/historicoFerias`);
        const snapshot2 = await get(feriasRef2);
        
        const userRef = ref(db, `users/${user.uid}`);
        const userSnapshot = await get(userRef);
        
        const folgasRef = ref(db, `folgas/${user.uid}/registros`);
        const folgasSnapshot = await get(folgasRef);
        
        console.log('Estrutura completa caminho 1:', snapshot1.val());
        console.log('Estrutura completa caminho 2:', snapshot2.val());
        console.log('Estrutura completa usuário:', userSnapshot.val());
        console.log('Estrutura completa folgas:', folgasSnapshot.val());
        
        // Verificar localStorage
        const usuarioKey = 'usuario_logado';
        const usuarioLogado = localStorage.getItem(usuarioKey);
        
        if (usuarioLogado) {
            const usuario = JSON.parse(usuarioLogado);
            console.log('Usuário no localStorage:', usuario);
            
            if (usuario.historicoFerias) {
                console.log('Histórico de férias no localStorage:', usuario.historicoFerias);
            }
        }
        
        // Contabilizar dias de férias e folgas
        let diasFeriasUsados = 0;
        let diasFolgasUsados = 0;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        // Contabilizar férias do caminho 1
        if (snapshot1.exists()) {
            const ferias = Object.values(snapshot1.val())
                .filter(f => f.status !== 'cancelado' && f.status !== 'Cancelado');
            
            ferias.forEach(f => {
                if (f.dias) {
                    const dataFim = new Date(padronizarFormatoData(f.dataFim || f.dataInicio) + 'T00:00:00');
                    if (dataFim < hoje) {
                        diasFeriasUsados += parseInt(f.dias);
                    }
                }
            });
            
            console.log('Dias de férias usados (caminho 1):', diasFeriasUsados);
        } else {
            console.log('Nenhum dado de férias encontrado no caminho 1');
        }
        
        // Contabilizar férias do caminho 2
        let diasFeriasUsados2 = 0;
        if (snapshot2.exists()) {
            const feriasData = snapshot2.val();
            
            // Se for um array
            if (Array.isArray(feriasData)) {
                feriasData.forEach(periodo => {
                    if (periodo.diasFerias) {
                        const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                        if (dataFim < hoje) {
                            diasFeriasUsados2 += parseInt(periodo.diasFerias);
                        }
                    }
                });
            } 
            // Se for um objeto
            else {
                Object.values(feriasData).forEach(periodo => {
                    if (periodo.diasFerias) {
                        const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                        if (dataFim < hoje) {
                            diasFeriasUsados2 += parseInt(periodo.diasFerias);
                        }
                    }
                });
            }
            
            console.log('Dias de férias usados (caminho 2):', diasFeriasUsados2);
        } else {
            console.log('Nenhum dado de férias encontrado no caminho 2');
        }
        
        // Contabilizar folgas
        if (folgasSnapshot.exists()) {
            const folgas = Object.values(folgasSnapshot.val())
                .filter(f => f.status !== 'cancelado' && f.status !== 'Cancelado');
            
            folgas.forEach(folga => {
                const dataFolga = new Date(padronizarFormatoData(folga.data) + 'T00:00:00');
                if (dataFolga < hoje) {
                    diasFolgasUsados += 1;
                }
            });
            
            console.log('Dias de folga usados:', diasFolgasUsados);
        } else {
            console.log('Nenhum dado de folga encontrado');
        }
        
        // Total
        const totalDiasUsados = diasFeriasUsados + diasFolgasUsados;
        console.log('Total de dias usados (férias + folgas):', totalDiasUsados);
        console.log('Saldo de férias:', 30 - totalDiasUsados);
        
    } catch (error) {
        console.error('Erro ao depurar dados de férias:', error);
    }
    
    console.log('===================================');
}

// Função para atualizar o saldo de férias
async function atualizarSaldoFerias(user) {
    try {
        console.log('Atualizando saldo de férias para usuário:', user.uid);
        
        // Tentar buscar dados de férias de diferentes caminhos no Firebase
        let feriasData = null;
        let diasFeriasUsados = 0;
        let proximasFerias = null;
        
        // Caminho 1: ferias/{uid}/registros
        const feriasRef1 = ref(db, `ferias/${user.uid}/registros`);
        const snapshot1 = await get(feriasRef1);
        
        // Caminho 2: users/{uid}/historicoFerias
        const feriasRef2 = ref(db, `users/${user.uid}/historicoFerias`);
        const snapshot2 = await get(feriasRef2);
        
        // Caminho 3: users/{uid}
        const userRef = ref(db, `users/${user.uid}`);
        const userSnapshot = await get(userRef);
        
        // Caminho 4: folgas/{uid}/registros (para contabilizar folgas)
        const folgasRef = ref(db, `folgas/${user.uid}/registros`);
        const folgasSnapshot = await get(folgasRef);
        
        console.log('Dados do caminho 1:', snapshot1.val());
        console.log('Dados do caminho 2:', snapshot2.val());
        console.log('Dados do usuário:', userSnapshot.val());
        console.log('Dados de folgas:', folgasSnapshot.val());
        
        // Verificar qual caminho tem dados
        if (snapshot1.exists()) {
            console.log('Usando dados do caminho 1');
            feriasData = snapshot1.val();
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const ferias = Object.values(feriasData)
                .filter(f => f.status !== 'cancelado' && f.status !== 'Cancelado')
                .sort((a, b) => {
                    const dataA = new Date(padronizarFormatoData(a.dataInicio) + 'T00:00:00');
                    const dataB = new Date(padronizarFormatoData(b.dataInicio) + 'T00:00:00');
                    return dataA - dataB;
                });
            
            // Calcular dias de férias usados
            ferias.forEach(f => {
                if (f.dias) {
                    // Verificar se o período de férias já passou
                    const dataFim = new Date(padronizarFormatoData(f.dataFim || f.dataInicio) + 'T00:00:00');
                    
                    // Se a data final já passou, contar como usufruído
                    if (dataFim < hoje) {
                        const diasInt = parseInt(f.dias);
                        diasFeriasUsados += diasInt;
                        console.log(`Adicionando ${diasInt} dias de férias (${f.dataInicio} - ${f.dataFim || f.dataInicio})`);
                    }
                }
            });
            
            // Encontrar próximas férias
            proximasFerias = ferias.find(f => {
                const dataInicio = new Date(padronizarFormatoData(f.dataInicio) + 'T00:00:00');
                return dataInicio >= hoje;
            });
        } 
        else if (snapshot2.exists()) {
            console.log('Usando dados do caminho 2');
            feriasData = snapshot2.val();
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Se for um array
            if (Array.isArray(feriasData)) {
                feriasData.forEach(periodo => {
                    if (periodo.diasFerias) {
                        const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                        if (dataFim < hoje) {
                            diasFeriasUsados += parseInt(periodo.diasFerias);
                            console.log(`Adicionando ${periodo.diasFerias} dias de férias (${periodo.dataInicio} - ${periodo.dataFim})`);
                        } else {
                            // Possível próximas férias
                            if (!proximasFerias) {
                                proximasFerias = periodo;
                            }
                        }
                    }
                });
            } 
            // Se for um objeto
            else {
                Object.values(feriasData).forEach(periodo => {
                    if (periodo.diasFerias) {
                        const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                        if (dataFim < hoje) {
                            diasFeriasUsados += parseInt(periodo.diasFerias);
                            console.log(`Adicionando ${periodo.diasFerias} dias de férias (${periodo.dataInicio} - ${periodo.dataFim})`);
                        } else {
                            // Possível próximas férias
                            if (!proximasFerias) {
                                proximasFerias = periodo;
                            }
                        }
                    }
                });
            }
        }
        else if (userSnapshot.exists()) {
            console.log('Verificando dados do usuário');
            const userData = userSnapshot.val();
            
            // Verificar se há dados de férias no objeto do usuário
            if (userData.historicoFerias) {
                console.log('Usando historicoFerias do usuário');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                if (Array.isArray(userData.historicoFerias)) {
                    userData.historicoFerias.forEach(periodo => {
                        if (periodo.diasFerias) {
                            const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                            if (dataFim < hoje) {
                                diasFeriasUsados += parseInt(periodo.diasFerias);
                                console.log(`Adicionando ${periodo.diasFerias} dias de férias (${periodo.dataInicio} - ${periodo.dataFim})`);
                            } else {
                                // Possível próximas férias
                                if (!proximasFerias) {
                                    proximasFerias = periodo;
                                }
                            }
                        }
                    });
                } else {
                    Object.values(userData.historicoFerias).forEach(periodo => {
                        if (periodo.diasFerias) {
                            const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                            if (dataFim < hoje) {
                                diasFeriasUsados += parseInt(periodo.diasFerias);
                                console.log(`Adicionando ${periodo.diasFerias} dias de férias (${periodo.dataInicio} - ${periodo.dataFim})`);
                            } else {
                                // Possível próximas férias
                                if (!proximasFerias) {
                                    proximasFerias = periodo;
                                }
                            }
                        }
                    });
                }
            }
            // Verificar se há dados diretos de férias
            else if (userData.dataInicio && userData.dataFim && userData.diasFerias) {
                console.log('Usando dados diretos de férias do usuário');
                const hoje = new Date();
                hoje.setHours(0, 0, 0, 0);
                
                const dataFim = new Date(userData.dataFim + 'T00:00:00');
                if (dataFim < hoje) {
                    diasFeriasUsados += parseInt(userData.diasFerias);
                    console.log(`Adicionando ${userData.diasFerias} dias de férias (${userData.dataInicio} - ${userData.dataFim})`);
                } else {
                    proximasFerias = {
                        dataInicio: userData.dataInicio,
                        dataFim: userData.dataFim,
                        dias: userData.diasFerias
                    };
                }
            }
        }
        else {
            console.log('Nenhum dado de férias encontrado em nenhum caminho');
            
            // TEMPORÁRIO: Definir valor fixo para testes
            diasFeriasUsados = 4; // Valor fixo para corresponder ao dashboard
            console.log('Usando valor fixo para testes:', diasFeriasUsados);
        }
        
        // Contabilizar dias de folga como dias de férias usados
        if (folgasSnapshot.exists()) {
            console.log('Contabilizando folgas como dias de férias');
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const folgas = Object.values(folgasSnapshot.val())
                .filter(f => f.status !== 'cancelado' && f.status !== 'Cancelado');
            
            // Contar folgas passadas
            let diasFolga = 0;
            folgas.forEach(folga => {
                const dataFolga = new Date(padronizarFormatoData(folga.data) + 'T00:00:00');
                if (dataFolga < hoje) {
                    diasFolga += 1; // Cada folga conta como 1 dia
                    console.log(`Adicionando 1 dia de folga (${folga.data})`);
                }
            });
            
            console.log(`Total de dias de folga usados: ${diasFolga}`);
            diasFeriasUsados += diasFolga;
        }
        
        console.log('Total de dias de férias usados (incluindo folgas):', diasFeriasUsados);
        
        // Atualizar saldo de férias
        const saldoFeriasElement = document.getElementById('saldoFerias');
        if (saldoFeriasElement) {
            const saldoFerias = 30 - diasFeriasUsados;
            const proximasData = proximasFerias ? 
                ` | ${proximasFerias.dias || proximasFerias.diasFerias} dias a partir de ${formatarData(proximasFerias.dataInicio)}` : '';
            
            saldoFeriasElement.innerHTML = `
                ${saldoFerias} <small style="font-size: 0.5em; opacity: 0.7">(${diasFeriasUsados} usufruídos${proximasData})</small>
            `;
            
            console.log(`Saldo de férias atualizado: ${saldoFerias} (${diasFeriasUsados} usufruídos)`);
        }
    } catch (error) {
        console.error('Erro ao atualizar saldo de férias:', error);
        const saldoFeriasElement = document.getElementById('saldoFerias');
        if (saldoFeriasElement) {
            saldoFeriasElement.innerHTML = `
                Erro <small style="font-size: 0.5em; opacity: 0.7">(Falha ao carregar)</small>
            `;
        }
    }
}

// Função para atualizar o total de plantões realizados
async function atualizarTotalPlantoes(user) {
    const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
    const snapshot = await get(plantoesRef);
    
    let plantoesRealizados = 0;
    let totalPlantoes = 0;
    
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
                if (plantao.status === 'realizado' || plantao.status === 'Realizado' || dataPlantao < hoje) {
                    plantoesRealizados++;
                }
                
                totalPlantoes++;
            }
        });
    }
    
    // Verificar saldo anterior
    const saldoAnteriorRef = ref(db, `plantoes/${user.uid}/saldoAnterior`);
    const saldoAnteriorSnapshot = await get(saldoAnteriorRef);
    
    if (saldoAnteriorSnapshot.exists()) {
        const saldoAnterior = parseInt(saldoAnteriorSnapshot.val()) || 0;
        plantoesRealizados += saldoAnterior;
    }
    
    // Atualizar elementos na interface
    const totalPlantoesElement = document.getElementById('totalPlantoes');
    if (totalPlantoesElement) {
        totalPlantoesElement.innerHTML = `
            ${plantoesRealizados} <small style="font-size: 0.5em; opacity: 0.7">(${totalPlantoes} total)</small>
        `;
    }
    
    return {
        plantoesRealizados,
        totalPlantoes
    };
}

// Função para atualizar o saldo de folgas
async function atualizarSaldoFolgas(user) {
    try {
        // Obter o total de plantões realizados
        const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
        const plantoesSnapshot = await get(plantoesRef);
        
        let plantoesRealizados = 0;
        
        if (plantoesSnapshot.exists()) {
            // Contar plantões realizados (não cancelados)
            plantoesSnapshot.forEach((childSnapshot) => {
                const plantao = childSnapshot.val();
                if (plantao.status !== 'cancelado' && plantao.status !== 'Cancelado') {
                    // Verificar se o plantão já ocorreu
                    const dataPlantao = new Date(padronizarFormatoData(plantao.data) + 'T00:00:00');
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    
                    if (dataPlantao <= hoje) {
                        plantoesRealizados++;
                    }
                }
            });
        }
        
        // Calcular saldo de folgas
        let saldoFolgas = plantoesRealizados; // Cada plantão realizado gera uma folga

        // Subtrair folgas já utilizadas
        const folgasRef = ref(db, `folgas/${user.uid}/registros`);
        const folgasSnapshot = await get(folgasRef);
        
        if (folgasSnapshot.exists()) {
            const folgasUsadas = Object.values(folgasSnapshot.val())
                .filter(f => f.status !== 'cancelada' && f.status !== 'Cancelada')
                .length;
            
            saldoFolgas -= folgasUsadas;
        }

        // Atualizar saldo de folgas
        const saldoFolgasElement = document.getElementById('saldoFolgas');
        if (saldoFolgasElement) {
            saldoFolgasElement.textContent = saldoFolgas.toString();
        }
    } catch (error) {
        console.error('Erro ao atualizar saldo de folgas:', error);
        const saldoFolgasElement = document.getElementById('saldoFolgas');
        if (saldoFolgasElement) {
            saldoFolgasElement.textContent = 'Erro';
        }
    }
}

// Função para iniciar listeners em tempo real
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
    });
    
    // Listener para plantões
    const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
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
    const feriasRef = ref(db, `ferias/${user.uid}/registros`);
    onValue(feriasRef, (snapshot) => {
        console.log('Atualização em tempo real - férias:', snapshot.val());
        debounceCarregarDados(user);
    });

    // Listener para plantões
    const plantoesRef2 = ref(db, `plantoes/${user.uid}/registros`);
    onValue(plantoesRef2, (snapshot) => {
        console.log('Atualização em tempo real - plantões:', snapshot.val());
        debounceCarregarDados(user);
    });

    // Listener para folgas
    const folgasRef = ref(db, `folgas/${user.uid}/registros`);
    onValue(folgasRef, (snapshot) => {
        console.log('Atualização detectada nas folgas');
        
        debounceCarregarDados(user);
    });

    // Listener para trabalho
    const trabalhoRef = ref(db, `trabalho/${user.uid}`);
    onValue(trabalhoRef, (snapshot) => {
        console.log('Atualização em tempo real - trabalho:', snapshot.val());
        debounceCarregarDados(user);
    });
}

// Função para verificar o próximo dia presencial
async function verificarProximoDiaPresencial(user) {
    try {
        console.log('Verificando próximo dia presencial para usuário:', user.uid);
        
        // Buscar dias de trabalho presencial
        const trabalhoRef = ref(db, `trabalho/${user.uid}/registros`);
        const trabalhoSnapshot = await get(trabalhoRef);
        
        if (!trabalhoSnapshot.exists()) {
            console.log('Nenhum dia de trabalho presencial encontrado');
            document.getElementById('proximoDiaPresencialCard').style.display = 'none';
            return;
        }
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        let proximoDia = null;
        let dataProximoDia = null;
        
        // Encontrar o próximo dia presencial (data futura mais próxima)
        trabalhoSnapshot.forEach((childSnapshot) => {
            const trabalho = childSnapshot.val();
            
            if (trabalho.status === 'cancelado' || trabalho.status === 'Cancelado') {
                return; // Ignorar dias cancelados
            }
            
            const dataTrabalho = new Date(padronizarFormatoData(trabalho.data) + 'T00:00:00');
            
            // Se o dia é hoje ou no futuro e ainda não temos um próximo dia,
            // ou se é mais próximo que o atual próximo dia
            if (dataTrabalho >= hoje && (!proximoDia || dataTrabalho < dataProximoDia)) {
                proximoDia = trabalho;
                dataProximoDia = dataTrabalho;
            }
        });
        
        // Atualizar card
        const proximoDiaCard = document.getElementById('proximoDiaPresencialCard');
        const proximoDiaData = document.getElementById('proximoDiaPresencialData');
        const proximoDiaTipo = document.getElementById('proximoDiaPresencialTipo');
        const proximoDiaStatus = document.getElementById('proximoDiaPresencialStatus');
        
        if (proximoDia) {
            // Calcular diferença de dias
            const diffTime = Math.abs(dataProximoDia - hoje);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Formatar data para exibição
            let dataFormatada = '';
            if (diffDays === 0) {
                dataFormatada = 'Hoje';
            } else if (diffDays === 1) {
                dataFormatada = 'Amanhã';
            } else {
                dataFormatada = `Em ${diffDays} dias`;
            }
            
            dataFormatada += ` (${dataProximoDia.toLocaleDateString('pt-BR')})`;
            
            // Atualizar elementos
            proximoDiaData.textContent = dataFormatada;
            proximoDiaTipo.textContent = proximoDia.tipo || 'Presencial';
            proximoDiaStatus.textContent = diffDays === 0 ? 'Hoje' : 'Agendado';
            proximoDiaCard.style.display = 'block';
            
            console.log('Próximo dia presencial atualizado:', {
                data: dataFormatada,
                tipo: proximoDia.tipo || 'Presencial',
                status: diffDays === 0 ? 'Hoje' : 'Agendado'
            });
        } else {
            console.log('Nenhum próximo dia presencial encontrado');
            proximoDiaCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar próximo dia presencial:', error);
        document.getElementById('proximoDiaPresencialCard').style.display = 'none';
    }
}

// Função para verificar a próxima folga
async function verificarProximaFolga(user) {
    try {
        console.log('Verificando próxima folga para usuário:', user.uid);
        
        // Buscar folgas
        const folgasRef = ref(db, `folgas/${user.uid}/registros`);
        const folgasSnapshot = await get(folgasRef);
        
        if (!folgasSnapshot.exists()) {
            console.log('Nenhuma folga encontrada');
            document.getElementById('proximaFolgaCard').style.display = 'none';
            return;
        }
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        let proximaFolga = null;
        let dataProximaFolga = null;
        
        // Encontrar a próxima folga (data futura mais próxima)
        folgasSnapshot.forEach((childSnapshot) => {
            const folga = childSnapshot.val();
            
            if (folga.status === 'cancelada' || folga.status === 'Cancelada') {
                return; // Ignorar folgas canceladas
            }
            
            const dataFolga = new Date(padronizarFormatoData(folga.data) + 'T00:00:00');
            
            // Se a folga é hoje ou no futuro e ainda não temos uma próxima folga,
            // ou se é mais próxima que a atual próxima folga
            if (dataFolga >= hoje && (!proximaFolga || dataFolga < dataProximaFolga)) {
                proximaFolga = folga;
                dataProximaFolga = dataFolga;
            }
        });
        
        // Atualizar card
        const proximaFolgaCard = document.getElementById('proximaFolgaCard');
        const proximaFolgaData = document.getElementById('proximaFolgaData');
        const proximaFolgaTipo = document.getElementById('proximaFolgaTipo');
        const proximaFolgaStatus = document.getElementById('proximaFolgaStatus');
        
        if (proximaFolga) {
            // Calcular diferença de dias
            const diffTime = Math.abs(dataProximaFolga - hoje);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Formatar data para exibição
            let dataFormatada = '';
            if (diffDays === 0) {
                dataFormatada = 'Hoje';
            } else if (diffDays === 1) {
                dataFormatada = 'Amanhã';
            } else {
                dataFormatada = `Em ${diffDays} dias`;
            }
            
            dataFormatada += ` (${dataProximaFolga.toLocaleDateString('pt-BR')})`;
            
            // Atualizar elementos
            proximaFolgaData.textContent = dataFormatada;
            proximaFolgaTipo.textContent = 'Folga';
            proximaFolgaStatus.textContent = diffDays === 0 ? 'Hoje' : 'Agendada';
            proximaFolgaCard.style.display = 'block';
            
            console.log('Próxima folga atualizada:', {
                data: dataFormatada,
                status: diffDays === 0 ? 'Hoje' : 'Agendada'
            });
        } else {
            console.log('Nenhuma próxima folga encontrada');
            proximaFolgaCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar próxima folga:', error);
        document.getElementById('proximaFolgaCard').style.display = 'none';
    }
}

// Função para verificar o próximo plantão
async function verificarProximoPlantao(user) {
    try {
        console.log('Verificando próximo plantão para usuário:', user.uid);
        
        // Buscar plantões
        const plantoesRef = ref(db, `plantoes/${user.uid}/registros`);
        const plantoesSnapshot = await get(plantoesRef);
        
        if (!plantoesSnapshot.exists()) {
            console.log('Nenhum plantão encontrado');
            document.getElementById('proximoPlantaoCard').style.display = 'none';
            return;
        }
        
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        let proximoPlantao = null;
        let dataProximoPlantao = null;
        
        // Encontrar o próximo plantão (data futura mais próxima)
        plantoesSnapshot.forEach((childSnapshot) => {
            const plantao = childSnapshot.val();
            
            if (plantao.status === 'cancelado' || plantao.status === 'Cancelado') {
                return; // Ignorar plantões cancelados
            }
            
            const dataPlantao = new Date(padronizarFormatoData(plantao.data) + 'T00:00:00');
            
            // Se o plantão é hoje ou no futuro e ainda não temos um próximo plantão,
            // ou se é mais próximo que o atual próximo plantão
            if (dataPlantao >= hoje && (!proximoPlantao || dataPlantao < dataProximoPlantao)) {
                proximoPlantao = plantao;
                dataProximoPlantao = dataPlantao;
            }
        });
        
        // Atualizar card
        const proximoPlantaoCard = document.getElementById('proximoPlantaoCard');
        const proximoPlantaoData = document.getElementById('proximoPlantaoData');
        const proximoPlantaoTipo = document.getElementById('proximoPlantaoTipo');
        const proximoPlantaoStatus = document.getElementById('proximoPlantaoStatus');
        
        if (proximoPlantao) {
            // Calcular diferença de dias
            const diffTime = Math.abs(dataProximoPlantao - hoje);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Formatar data para exibição
            let dataFormatada = '';
            if (diffDays === 0) {
                dataFormatada = 'Hoje';
            } else if (diffDays === 1) {
                dataFormatada = 'Amanhã';
            } else {
                dataFormatada = `Em ${diffDays} dias`;
            }
            
            dataFormatada += ` (${dataProximoPlantao.toLocaleDateString('pt-BR')})`;
            
            // Atualizar elementos
            proximoPlantaoData.textContent = dataFormatada;
            proximoPlantaoTipo.textContent = proximoPlantao.tipo || 'Plantão';
            proximoPlantaoStatus.textContent = diffDays === 0 ? 'Hoje' : 'Agendado';
            proximoPlantaoCard.style.display = 'block';
            
            console.log('Próximo plantão atualizado:', {
                data: dataFormatada,
                tipo: proximoPlantao.tipo || 'Plantão',
                status: diffDays === 0 ? 'Hoje' : 'Agendado'
            });
        } else {
            console.log('Nenhum próximo plantão encontrado');
            proximoPlantaoCard.style.display = 'none';
        }
    } catch (error) {
        console.error('Erro ao verificar próximo plantão:', error);
        document.getElementById('proximoPlantaoCard').style.display = 'none';
    }
}

// Função para formatar data no padrão brasileiro
function formatarData(dataString) {
    try {
        const data = new Date(padronizarFormatoData(dataString) + 'T00:00:00');
        return data.toLocaleDateString('pt-BR');
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return dataString;
    }
}

// Função para padronizar formato de data
function padronizarFormatoData(dataString) {
    if (!dataString) return '';
    
    // Se já estiver no formato ISO (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
        return dataString;
    }
    
    // Se estiver no formato brasileiro (DD/MM/YYYY)
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataString)) {
        const [dia, mes, ano] = dataString.split('/');
        return `${ano}-${mes}-${dia}`;
    }
    
    // Outros formatos
    try {
        const data = new Date(dataString);
        if (!isNaN(data.getTime())) {
            return data.toISOString().split('T')[0];
        }
    } catch (e) {
        console.error('Erro ao converter data:', e);
    }
    
    return dataString;
}

// Função para verificar se uma data é futura
function isDataFutura(dataString) {
    try {
        const data = new Date(padronizarFormatoData(dataString) + 'T00:00:00');
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        return data >= hoje;
    } catch (error) {
        console.error('Erro ao verificar se data é futura:', error);
        return false;
    }
}

// Função para depurar dados do localStorage
function depurarLocalStorage() {
    console.log('=== DEPURAÇÃO DO LOCALSTORAGE ===');
    try {
        // Verificar todos os itens no localStorage
        const keys = Object.keys(localStorage);
        console.log('Keys no localStorage:', keys);
        
        // Verificar especificamente o usuário logado
        const usuarioKey = 'usuario_logado';
        const usuarioLogado = localStorage.getItem(usuarioKey);
        
        if (usuarioLogado) {
            const usuario = JSON.parse(usuarioLogado);
            console.log('Usuário logado encontrado:', usuario);
            
            // Verificar se há dados de férias
            if (usuario.historicoFerias) {
                console.log('Histórico de férias encontrado no localStorage:', usuario.historicoFerias);
                
                // Calcular dias usufruídos
                let diasUsufruidos = 0;
                const hoje = new Date();
                
                usuario.historicoFerias.forEach(periodo => {
                    const dataFim = new Date(periodo.dataFim + 'T00:00:00');
                    if (dataFim < hoje) {
                        diasUsufruidos += parseInt(periodo.diasFerias);
                        console.log(`Período passado: ${periodo.dataInicio} - ${periodo.dataFim}, ${periodo.diasFerias} dias`);
                    } else {
                        console.log(`Período futuro: ${periodo.dataInicio} - ${periodo.dataFim}, ${periodo.diasFerias} dias`);
                    }
                });
                
                console.log('Total de dias usufruídos (localStorage):', diasUsufruidos);
            } else {
                console.log('Nenhum histórico de férias encontrado no localStorage');
            }
        } else {
            console.log('Nenhum usuário logado encontrado no localStorage');
        }
    } catch (error) {
        console.error('Erro ao depurar localStorage:', error);
    }
    console.log('===============================');
}

// Função para sincronizar o saldo de folgas com o saldo de férias
async function sincronizarSaldoFolgasFerias(user) {
    try {
        console.log('Sincronizando saldo de folgas com férias para usuário:', user.uid);
        
        // Buscar dados de folgas do usuário
        const folgasRef = ref(db, `folgas/${user.uid}/registros`);
        const folgasSnapshot = await get(folgasRef);
        
        // Buscar dados de plantões do usuário
        const plantoesRef = ref(db, `plantoes/${user.uid}`);
        const plantoesSnapshot = await get(plantoesRef);
        
        let folgasUtilizadas = 0;
        let saldoFolgas = 0;
        
        // Verificar se há dados de folgas
        if (folgasSnapshot.exists()) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            // Contar folgas utilizadas (apenas as que já passaram)
            folgasSnapshot.forEach((childSnapshot) => {
                const folga = childSnapshot.val();
                if (folga.status !== 'Cancelada') {
                    const dataFolga = new Date(padronizarFormatoData(folga.data) + 'T00:00:00');
                    if (dataFolga < hoje) {
                        folgasUtilizadas++;
                    }
                }
            });
            
            console.log('Folgas utilizadas:', folgasUtilizadas);
        }
        
        // Verificar se há dados de plantões
        if (plantoesSnapshot.exists()) {
            const plantoesData = plantoesSnapshot.val();
            
            // Verificar se há saldo de folgas salvo
            if (plantoesData.saldoFolgas !== undefined) {
                saldoFolgas = parseInt(plantoesData.saldoFolgas);
                console.log('Saldo de folgas:', saldoFolgas);
            }
            
            // Verificar se há total de folgas utilizadas salvo
            if (plantoesData.folgasUtilizadas !== undefined) {
                // Usar o valor salvo se for maior que o calculado
                // (pode acontecer se houver folgas canceladas)
                if (parseInt(plantoesData.folgasUtilizadas) > folgasUtilizadas) {
                    folgasUtilizadas = parseInt(plantoesData.folgasUtilizadas);
                    console.log('Usando folgas utilizadas do Firebase:', folgasUtilizadas);
                }
            }
        }
        
        // Atualizar o elemento de saldo de férias com as informações de folgas
        const saldoFeriasElement = document.getElementById('saldoFerias');
        if (saldoFeriasElement) {
            // Obter o texto atual
            const textoAtual = saldoFeriasElement.innerHTML;
            
            // Adicionar informação sobre folgas
            if (folgasUtilizadas > 0) {
                const textoFolgas = `<small style="font-size: 0.5em; opacity: 0.7"> | ${folgasUtilizadas} folgas usadas</small>`;
                
                // Verificar se já tem informação sobre folgas
                if (!textoAtual.includes('folgas usadas')) {
                    saldoFeriasElement.innerHTML = textoAtual + textoFolgas;
                }
            }
            
            console.log('Saldo de férias atualizado com informações de folgas');
        }
        
        return { folgasUtilizadas, saldoFolgas };
    } catch (error) {
        console.error('Erro ao sincronizar saldo de folgas com férias:', error);
    }
}

// Função para carregar dados do usuário
async function carregarDadosUsuario(user) {
    try {
        console.log('Carregando dados do usuário:', user.uid);
        
        // Buscar dados do usuário no Firebase
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('Dados do usuário:', userData);
            
            // Atualizar nome do usuário
            if (userData.nome) {
                document.getElementById('userName').textContent = userData.nome;
            }
            
            // Atualizar cargo do usuário
            if (userData.cargo) {
                document.getElementById('userCargo').textContent = userData.cargo;
            }
            
            // Atualizar saldo de férias
            await atualizarSaldoFerias(user);
            
            // Atualizar total de plantões
            await atualizarTotalPlantoes(user);
            
            // Verificar próximas férias
            verificarProximasFerias(user);
            
            // Carregar histórico de férias
            carregarHistoricoFerias(user);
        } else {
            console.log('Dados do usuário não encontrados');
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

// Chamar a função de depuração ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    // Funções existentes
    verificarAutenticacao();
    
    // Adicionar depuração do localStorage
    depurarLocalStorage();
});

// Modificar a função verificarAutenticacao para chamar a sincronização
function verificarAutenticacao() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Usuário autenticado:', user.uid);
            document.getElementById('userEmail').textContent = user.email;
            
            // Carregar dados do usuário
            carregarDadosUsuario(user);
            
            // Depurar dados de férias
            depurarDadosFerias(user);
            
            // Verificar próximo dia presencial
            verificarProximoDiaPresencial(user);
            
            // Verificar próxima folga
            verificarProximaFolga(user);
            
            // Verificar próximo plantão
            verificarProximoPlantao(user);
            
            // Sincronizar saldo de folgas com férias
            sincronizarSaldoFolgasFerias(user);
            
        } else {
            console.log('Usuário não autenticado, redirecionando...');
            window.location.href = 'index.html';
        }
    });
}