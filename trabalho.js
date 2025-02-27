// Configuração do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import { getDatabase, ref, push, onValue, remove, get } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

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

let currentUser = null;

// Adicionar variável para controlar a semana selecionada
let semanaAtualOffset = 0;

// Verificar autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        inicializarApp();
    } else {
        window.location.href = 'index.html';
    }
});

// Função para inicializar o app
function inicializarApp() {
    carregarRegistros();
    atualizarDataHora();
    inicializarFormulario();
}

// Função para inicializar o formulário
function inicializarFormulario() {
    const form = document.getElementById('registroTrabalhoForm');
    if (form) {
        atualizarTextoSemana();
        atualizarDiasDisponiveis();
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const diasSelecionados = Array.from(document.querySelectorAll('input[name="diasSemana"]:checked'))
                    .map(input => parseInt(input.value));
                
                if (diasSelecionados.length === 0) {
                    alert('Selecione pelo menos um dia da semana');
                    return;
                }

                const modalidade = document.querySelector('input[name="modalidade"]:checked').value;

                // Verificar registros existentes
                const { registrosExistentes, registrosParaRemover } = await verificarRegistrosExistentes(diasSelecionados);
                if (registrosExistentes.length > 0) {
                    const confirmar = confirm(
                        `Já existem registros para os seguintes dias:\n${registrosExistentes.join('\n')}\n\nDeseja substituir?`
                    );
                    if (!confirmar) return;
                    
                    // Remover registros existentes antes de adicionar os novos
                    for (const registroId of registrosParaRemover) {
                        await remove(ref(db, `trabalho/${currentUser.uid}/${registroId}`));
                    }
                }

                // Criar um registro para cada dia selecionado
                const { inicio: inicioSemana } = obterSemanaAtual(semanaAtualOffset);
                for (const diaSemana of diasSelecionados) {
                    const dataRegistro = new Date(inicioSemana);
                    dataRegistro.setDate(inicioSemana.getDate() + (diaSemana - 1));

                    const registro = {
                        dataTrabalho: dataRegistro.toISOString().split('T')[0],
                        modalidade: modalidade,
                        userId: currentUser.uid,
                        timestamp: Date.now()
                    };

                    const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
                    await push(registrosRef, registro);
                }
                
                alert('Trabalho registrado com sucesso!');
                form.reset();
                
            } catch (error) {
                console.error('Erro ao registrar trabalho:', error);
                alert('Erro ao registrar trabalho: ' + error.message);
            }
        });
    }
}

// Função para atualizar dias disponíveis
function atualizarDiasDisponiveis() {
    const hoje = new Date();
    const { inicio: inicioSemana } = obterSemanaAtual(semanaAtualOffset);
    
    document.querySelectorAll('input[name="diasSemana"]').forEach((checkbox, index) => {
        const diaCheckbox = index + 1;
        const dataVerificar = new Date(inicioSemana);
        dataVerificar.setDate(inicioSemana.getDate() + (diaCheckbox - 1));
        
        // Desabilitar dias que já passaram
        if (dataVerificar < hoje) {
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
            checkbox.parentElement.title = 'Dia já passou';
        } else {
            checkbox.disabled = false;
            checkbox.parentElement.style.opacity = '1';
            checkbox.parentElement.title = '';
        }
    });
}

// Função para atualizar data e hora
function atualizarDataHora() {
    const atualizarHora = () => {
        const agora = new Date();
        document.getElementById('current-time').textContent = 
            agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('current-date').textContent = 
            agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    atualizarHora();
    setInterval(atualizarHora, 1000);
}

// Função para formatar data com dia da semana
function formatarDataCompleta(data) {
    // Ajustar para o fuso horário local
    const dataLocal = new Date(data.getTime() + data.getTimezoneOffset() * 60000);
    
    return dataLocal.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Função para formatar data
function formatarData(data) {
    if (typeof data === 'string') {
        const [ano, mes, dia] = data.split('-').map(Number);
        return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR');
    }
    return data.toLocaleDateString('pt-BR');
}

// Função para carregar registros
function carregarRegistros() {
    const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
    
    onValue(registrosRef, (snapshot) => {
        const historicoTrabalho = document.getElementById('historicoTrabalho');
        historicoTrabalho.innerHTML = '';
        let diasPresencial = 0;
        let diasRemoto = 0;
        
        if (snapshot.exists()) {
            const registrosPendentes = [];
            const registrosRealizados = [];
            
            snapshot.forEach((childSnapshot) => {
                const registro = childSnapshot.val();
                registro.id = childSnapshot.key;
                
                // Ajustar a data para o fuso horário local
                const dataOriginal = new Date(registro.dataTrabalho || registro.data);
                const dataAjustada = new Date(dataOriginal.getTime() + dataOriginal.getTimezoneOffset() * 60000);
                registro.dataAjustada = dataAjustada;
                
                // Verificar status baseado na data e hora
                const hoje = new Date();
                const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                const dataReg = new Date(dataAjustada.getFullYear(), dataAjustada.getMonth(), dataAjustada.getDate());
                
                if (dataReg < dataHoje) {
                    registro.status = 'Realizado';
                } else if (dataReg.getTime() === dataHoje.getTime() && hoje.getHours() >= 18) {
                    registro.status = 'Realizado';
                } else if (dataReg.getTime() === dataHoje.getTime()) {
                    registro.status = 'Em andamento';
                } else {
                    registro.status = 'Pendente';
                }
                
                // Calcular a diferença de dias entre a data do registro e hoje
                const diffTime = Math.abs(dataHoje - dataReg);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Separar registros em pendentes e realizados
                if (registro.status === 'Pendente' || registro.status === 'Em andamento') {
                    registrosPendentes.push(registro);
                } else if (diffDays <= 30) {
                    // Registros realizados (últimos 30 dias)
                    registrosRealizados.push(registro);
                }
                
                // Contabilizar para as estatísticas
                if ((registro.status !== 'Realizado' || diffDays <= 30) && registro.modalidade) {
                    if (registro.modalidade === 'presencial') {
                        diasPresencial++;
                    } else {
                        diasRemoto++;
                    }
                }
            });
            
            // Ordenar registros pendentes em ordem cronológica (do mais próximo para o mais distante)
            registrosPendentes.sort((a, b) => a.dataAjustada - b.dataAjustada);
            
            // Ordenar registros realizados do mais recente para o mais antigo
            registrosRealizados.sort((a, b) => b.dataAjustada - a.dataAjustada);
            
            // Adicionar cabeçalho para registros pendentes se existirem
            if (registrosPendentes.length > 0) {
                const headerRow = document.createElement('tr');
                headerRow.classList.add('section-header');
                headerRow.innerHTML = `
                    <td colspan="4">
                        <h3><i class="fas fa-calendar-day"></i> Registros Pendentes</h3>
                    </td>
                `;
                historicoTrabalho.appendChild(headerRow);
                
                // Adicionar registros pendentes
                registrosPendentes.forEach(registro => {
                    adicionarLinhaRegistro(registro, historicoTrabalho);
                });
            }
            
            // Adicionar cabeçalho para registros realizados se existirem
            if (registrosRealizados.length > 0) {
                const headerRow = document.createElement('tr');
                headerRow.classList.add('section-header');
                headerRow.innerHTML = `
                    <td colspan="4">
                        <h3><i class="fas fa-check-circle"></i> Registros Realizados (Últimos 30 dias)</h3>
                    </td>
                `;
                historicoTrabalho.appendChild(headerRow);
                
                // Adicionar registros realizados
                registrosRealizados.forEach(registro => {
                    adicionarLinhaRegistro(registro, historicoTrabalho);
                });
            }
            
            // Adicionar botão "Ver todos os registros" se houver mais registros
            const totalRegistros = snapshot.val() && snapshot.val().registros ? 
                Object.keys(snapshot.val().registros).length : 0;
            
            if (totalRegistros > (registrosPendentes.length + registrosRealizados.length)) {
                const verTodosRow = document.createElement('tr');
                verTodosRow.classList.add('ver-todos-row');
                verTodosRow.innerHTML = `
                    <td colspan="4" class="text-center">
                        <button id="btnVerTodos" class="btn-outline">
                            <i class="fas fa-list"></i>
                            Ver todos os registros (${totalRegistros})
                        </button>
                    </td>
                `;
                historicoTrabalho.appendChild(verTodosRow);
                
                // Adicionar evento para o botão "Ver todos"
                document.getElementById('btnVerTodos').addEventListener('click', () => {
                    window.location.href = 'lista-semanal.html';
                });
            }
            
            // Atualizar contadores
            document.getElementById('diasPresencial').textContent = diasPresencial;
            document.getElementById('diasRemoto').textContent = diasRemoto;
        }
    });
}

// Função auxiliar para adicionar uma linha de registro à tabela
function adicionarLinhaRegistro(registro, tabela) {
    const dataFormatada = formatarDataCompleta(registro.dataAjustada);
    const row = document.createElement('tr');
    
    // Adicionar classe para registros realizados
    if (registro.status === 'Realizado') {
        row.classList.add('registro-realizado');
    } else if (registro.status === 'Em andamento') {
        row.classList.add('registro-em-andamento');
    }
    
    row.innerHTML = `
        <td>${dataFormatada}</td>
        <td>
            <span class="badge badge-${registro.modalidade}">
                <i class="fas fa-${registro.modalidade === 'presencial' ? 'building' : 'laptop-house'}"></i>
                ${registro.modalidade.charAt(0).toUpperCase() + registro.modalidade.slice(1)}
            </span>
        </td>
        <td>
            <span class="badge badge-${registro.status.toLowerCase().replace(' ', '-')}">
                ${registro.status}
            </span>
        </td>
        <td>
            ${registro.status === 'Pendente' ? `
                <div class="table-actions">
                    <button onclick="excluirRegistro('${registro.id}')" class="btn-icon delete" title="Excluir registro">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            ` : ''}
        </td>
    `;
    
    tabela.appendChild(row);
}

// Função para excluir registro
async function excluirRegistro(registroId) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        try {
            const registroRef = ref(db, `trabalho/${currentUser.uid}/${registroId}`);
            await remove(registroRef);
            alert('Registro excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir registro:', error);
            alert('Erro ao excluir registro. Tente novamente.');
        }
    }
}

// Adicionar função excluirRegistro ao objeto window
window.excluirRegistro = excluirRegistro;

// Função para exportar PDF
window.exportarPDF = async function() {
    try {
        const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
        
        onValue(registrosRef, (snapshot) => {
            if (snapshot.exists()) {
                const registros = [];
                snapshot.forEach((childSnapshot) => {
                    const registro = childSnapshot.val();
                    registros.push(registro);
                });

                // Ordenar por data
                registros.sort((a, b) => {
                    const dataA = new Date(a.dataTrabalho || a.data);
                    const dataB = new Date(b.dataTrabalho || b.data);
                    return dataB - dataA;
                });

                // Criar conteúdo do PDF
                const content = `
                    <div style="padding: 20px; font-family: Arial, sans-serif;">
                        <h2 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">
                            Histórico de Trabalho
                        </h2>
                        <div style="margin-bottom: 20px;">
                            Data de geração: ${formatarData(new Date())}
                        </div>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Data</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Modalidade</th>
                                    <th style="padding: 12px; border: 1px solid #dee2e6; text-align: left;">Observação</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${registros.map(registro => `
                                    <tr>
                                        <td style="padding: 12px; border: 1px solid #dee2e6;">
                                            ${formatarData(registro.dataTrabalho || registro.data)}
                                        </td>
                                        <td style="padding: 12px; border: 1px solid #dee2e6;">
                                            <span style="
                                                padding: 6px 12px;
                                                border-radius: 20px;
                                                background-color: ${registro.modalidade === 'presencial' ? '#e8f5e9' : '#e3f2fd'};
                                                color: ${registro.modalidade === 'presencial' ? '#4caf50' : '#2196f3'};
                                            ">
                                                ${registro.modalidade.charAt(0).toUpperCase() + registro.modalidade.slice(1)}
                                            </span>
                                        </td>
                                        <td style="padding: 12px; border: 1px solid #dee2e6;">
                                            ${registro.observacao || '-'}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;

                // Configurações do PDF
                const opt = {
                    margin: 1,
                    filename: `historico-trabalho-${formatarData(new Date())}.pdf`,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2 },
                    jsPDF: { 
                        unit: 'cm', 
                        format: 'a4', 
                        orientation: 'portrait'
                    }
                };

                // Gerar PDF
                const element = document.createElement('div');
                element.innerHTML = content;
                html2pdf().set(opt).from(element).save();
            }
        }, { once: true });
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao exportar PDF: ' + error.message);
    }
};

// Função para atualizar o texto da semana
function atualizarTextoSemana() {
    const { inicio, fim } = obterSemanaAtual(semanaAtualOffset);
    const formatoOpcoes = { day: '2-digit', month: '2-digit', year: 'numeric' };
    
    const textoSemana = `${inicio.toLocaleDateString('pt-BR', formatoOpcoes)} - ${fim.toLocaleDateString('pt-BR', formatoOpcoes)}`;
    document.getElementById('semanaAtual').textContent = textoSemana;
}

// Função para mudar de semana
function semanaAnterior() {
    semanaAtualOffset--;
    atualizarTextoSemana();
    atualizarDiasDisponiveis();
}

function semanaProxima() {
    semanaAtualOffset++;
    atualizarTextoSemana();
    atualizarDiasDisponiveis();
}

// Atualizar a função obterSemanaAtual para aceitar o offset
function obterSemanaAtual(offset = 0) {
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay() + 1 + (offset * 7)); // Adicionar offset de semanas
    
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 4);
    
    return {
        inicio: inicioSemana,
        fim: fimSemana
    };
}

// Atualizar a função de verificação de registros existentes
async function verificarRegistrosExistentes(diasSelecionados) {
    const { inicio: inicioSemana } = obterSemanaAtual(semanaAtualOffset);
    const registrosExistentes = [];
    const registrosParaRemover = []; // Array para armazenar IDs dos registros a serem substituídos
    
    const diasSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    
    const registrosRef = ref(db, `trabalho/${currentUser.uid}`);
    const snapshot = await get(registrosRef);
    
    if (snapshot.exists()) {
        diasSelecionados.forEach(dia => {
            const dataVerificar = new Date(inicioSemana);
            dataVerificar.setDate(inicioSemana.getDate() + (dia - 1));
            const dataStr = dataVerificar.toISOString().split('T')[0];
            
            snapshot.forEach(childSnapshot => {
                const registro = childSnapshot.val();
                if (registro.dataTrabalho === dataStr) {
                    registrosExistentes.push(`${diasSemana[dia-1]}-feira (${formatarData(dataStr)})`);
                    registrosParaRemover.push(childSnapshot.key);
                }
            });
        });
    }
    
    return { registrosExistentes, registrosParaRemover };
}

// Adicionar funções ao objeto window
window.semanaAnterior = semanaAnterior;
window.semanaProxima = semanaProxima;
