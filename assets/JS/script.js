// --- ESTADOS GLOBAIS ---
let transacoes = JSON.parse(localStorage.getItem('transacoesFinanceiras')) || [];
let categorias = JSON.parse(localStorage.getItem('categoriasFinanceiras')) || [
    "Depósito/Renda", "Moradia", "Saúde", "Lazer", "Comida", "Transporte", "Educação", "Investimento"
];
let gastosFixos = JSON.parse(localStorage.getItem('gastosFixosFinanceiros')) || [];
let orcamentos = JSON.parse(localStorage.getItem('orcamentosFinanceiros')) || {};

let graficoInstancia = null;
let idTransacaoEmEdicao = null;

// --- SISTEMA DE DARK MODE ---
const btnThemeToggle = document.getElementById('btn-theme-toggle');
let isDarkMode = localStorage.getItem('temaFinanceiro') === 'dark';

Chart.defaults.color = isDarkMode ? '#e0e0e0' : '#333';

const aplicarTema = (escuro) => {
    if (escuro) {
        document.documentElement.setAttribute('data-theme', 'dark');
        btnThemeToggle.innerText = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        btnThemeToggle.innerText = '🌙';
    }
    if (graficoInstancia) {
        Chart.defaults.color = escuro ? '#e0e0e0' : '#333';
        graficoInstancia.update();
    }
};

aplicarTema(isDarkMode);
btnThemeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    localStorage.setItem('temaFinanceiro', isDarkMode ? 'dark' : 'light');
    aplicarTema(isDarkMode);
});

// --- TOAST NOTIFICATIONS ---
const mostrarToast = (mensagem, tipo = 'sucesso') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<span>${mensagem}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
};

// --- DEBOUNCE ---
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { func.apply(null, args); }, delay);
    };
};

// --- UTILITÁRIOS E PERSISTÊNCIA ---
const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
const formatarData = (dataString) => {
    if(!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
};

const salvarDados = () => {
    try {
        localStorage.setItem('transacoesFinanceiras', JSON.stringify(transacoes));
        localStorage.setItem('categoriasFinanceiras', JSON.stringify(categorias));
        localStorage.setItem('gastosFixosFinanceiros', JSON.stringify(gastosFixos));
        localStorage.setItem('orcamentosFinanceiros', JSON.stringify(orcamentos));
    } catch (e) {
        console.error("Erro ao salvar dados localmente:", e);
        mostrarToast("Erro de memória. Limpe os dados do navegador.", "erro");
    }
};

// --- NAVEGAÇÃO SPA ---
window.mudarAba = (abaId) => {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.btn-nav').forEach(btn => btn.classList.remove('active'));
    document.getElementById(abaId).classList.add('active');
    if (event && event.currentTarget.classList.contains('btn-nav')) {
        event.currentTarget.classList.add('active');
    }
    if(abaId === 'view-inicio') atualizarDashboard();
};

const sincronizarSelectsCategorias = () => {
    let optionsHTML = '<option value="" disabled selected>Selecione...</option>';
    let optionsFiltroHTML = '<option value="todas" selected>Todas as Categorias</option>';
    categorias.sort().forEach(cat => {
        optionsHTML += `<option value="${cat}">${cat}</option>`;
        optionsFiltroHTML += `<option value="${cat}">${cat}</option>`;
    });
    document.getElementById('categoria').innerHTML = optionsHTML;
    document.getElementById('novo-fixo-cat').innerHTML = optionsHTML;
    document.getElementById('novo-orcamento-cat').innerHTML = optionsHTML;
    document.getElementById('filtro-categoria').innerHTML = optionsFiltroHTML;
};

// --- RENDERIZAÇÃO DO ORÇAMENTO ---
const renderizarOrcamentosDashboard = () => {
    const container = document.getElementById('lista-orcamentos');
    if (!container) return;
    container.innerHTML = '';

    const categoriasComOrcamento = Object.keys(orcamentos);
    if (categoriasComOrcamento.length === 0) {
        container.innerHTML = '<div class="empty-state" style="padding: 20px;"><span>🎯</span><p>Defina limites mensais na aba Configurações.</p></div>';
        return;
    }

    const mesAtual = new Date().toISOString().slice(0, 7);
    const gastosMesAtual = {};
    
    transacoes.filter(t => t.tipo === 'despesa' && t.dataBruta.startsWith(mesAtual)).forEach(t => {
        gastosMesAtual[t.categoria] = (gastosMesAtual[t.categoria] || 0) + t.valor;
    });

    categoriasComOrcamento.forEach(cat => {
        const limite = orcamentos[cat];
        const gasto = gastosMesAtual[cat] || 0;
        let porcentagem = (gasto / limite) * 100;
        
        let corBarra = 'var(--cor-receita)'; 
        if (porcentagem > 50) corBarra = '#f39c12'; 
        if (porcentagem > 85) corBarra = 'var(--cor-despesa)'; 

        const larguraVisual = porcentagem > 100 ? 100 : porcentagem;

        const div = document.createElement('div');
        div.className = 'orcamento-item';
        div.innerHTML = `
            <div class="orcamento-header">
                <span>${cat}</span>
                <span>${formatarMoeda(gasto)} / ${formatarMoeda(limite)}</span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${larguraVisual}%; background-color: ${corBarra};"></div>
            </div>
            <div class="orcamento-detalhes">
                <span>${porcentagem.toFixed(1)}% consumido</span>
                <span>Restante: ${formatarMoeda(Math.max(0, limite - gasto))}</span>
            </div>
        `;
        container.appendChild(div);
    });
};

// --- DASHBOARD ---
const atualizarDashboard = () => {
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + t.valor, 0);
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0);
    
    document.getElementById('total-receitas').innerText = formatarMoeda(receitas);
    document.getElementById('total-gastos').innerText = formatarMoeda(despesas);
    document.getElementById('saldo-atual').innerText = formatarMoeda(receitas - despesas);

    renderizarOrcamentosDashboard();

    const categoriasTotais = {};
    transacoes.filter(t => t.tipo === 'despesa').forEach(t => {
        categoriasTotais[t.categoria] = (categoriasTotais[t.categoria] || 0) + t.valor;
    });

    const labels = Object.keys(categoriasTotais);
    const valores = Object.values(categoriasTotais);

    if (graficoInstancia) {
        graficoInstancia.data.labels = labels;
        graficoInstancia.data.datasets[0].data = valores;
        graficoInstancia.update();
    } else {
        const ctx = document.getElementById('graficoDespesas').getContext('2d');
        graficoInstancia = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: labels, datasets: [{ data: valores, backgroundColor: ['#e74c3c', '#9b59b6', '#3498db', '#f1c40f', '#e67e22', '#2ecc71', '#34495e'], borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
};

// --- FORMULÁRIO DE TRANSAÇÕES ---
document.getElementById('form-transacao').addEventListener('submit', (e) => {
    e.preventDefault();
    const dados = {
        tipo: document.getElementById('tipo').value,
        dataBruta: document.getElementById('data').value,
        data: formatarData(document.getElementById('data').value),
        descricao: document.getElementById('descricao').value,
        valor: parseFloat(document.getElementById('valor').value),
        categoria: document.getElementById('categoria').value
    };

    if (idTransacaoEmEdicao) {
        transacoes = transacoes.map(t => t.id === idTransacaoEmEdicao ? { ...t, ...dados } : t);
        mostrarToast("Transação atualizada!", "sucesso");
        fecharModoEdicao();
    } else {
        transacoes.push({ id: crypto.randomUUID(), ...dados });
        mostrarToast("Transação registrada!", "sucesso");
    }

    salvarDados();
    atualizarDashboard();
    renderizarHistorico();
    document.getElementById('form-transacao').reset();
});

window.prepararEdicao = (id) => {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;
    idTransacaoEmEdicao = id;
    mudarAba('view-inicio'); 
    
    document.getElementById('titulo-formulario').innerText = "✏️ Editando Transação";
    const btnSubmit = document.getElementById('btn-submit-transacao');
    btnSubmit.innerText = "Salvar Alterações";
    btnSubmit.style.background = "#e67e22";
    document.getElementById('btn-cancelar-edicao').style.display = "inline-block";

    document.getElementById('tipo').value = t.tipo;
    document.getElementById('data').value = t.dataBruta;
    document.getElementById('descricao').value = t.descricao;
    document.getElementById('valor').value = t.valor;
    document.getElementById('categoria').value = t.categoria;
};

const fecharModoEdicao = () => {
    idTransacaoEmEdicao = null;
    document.getElementById('titulo-formulario').innerText = "Nova Transação";
    const btnSubmit = document.getElementById('btn-submit-transacao');
    btnSubmit.innerText = "Registrar Transação";
    btnSubmit.style.background = "var(--cor-primaria)";
    document.getElementById('btn-cancelar-edicao').style.display = "none";
    document.getElementById('form-transacao').reset();
};
document.getElementById('btn-cancelar-edicao').addEventListener('click', fecharModoEdicao);

window.removerTransacao = (id) => {
    if(confirm("Tem certeza que deseja excluir esta transação?")) {
        if(id === idTransacaoEmEdicao) fecharModoEdicao();
        transacoes = transacoes.filter(t => t.id !== id);
        salvarDados();
        atualizarDashboard();
        renderizarHistorico();
        mostrarToast("Transação removida.", "aviso");
    }
};

// --- FILTROS E HISTÓRICO ---
const obterTransacoesFiltradas = () => {
    const texto = document.getElementById('filtro-texto').value.toLowerCase();
    const dataInicio = document.getElementById('filtro-data-inicio').value;
    const dataFim = document.getElementById('filtro-data-fim').value;
    const tipo = document.getElementById('filtro-tipo').value;
    const categoria = document.getElementById('filtro-categoria').value;

    return transacoes.filter(t => {
        const matchTexto = t.descricao.toLowerCase().includes(texto) || t.valor.toString().includes(texto);
        const matchTipo = tipo === 'todos' || t.tipo === tipo;
        const matchCat = categoria === 'todas' || t.categoria === categoria;
        let matchData = true;
        if (dataInicio && dataFim) { matchData = t.dataBruta >= dataInicio && t.dataBruta <= dataFim; } 
        else if (dataInicio) { matchData = t.dataBruta >= dataInicio; } 
        else if (dataFim) { matchData = t.dataBruta <= dataFim; }
        return matchTexto && matchTipo && matchCat && matchData;
    }).sort((a, b) => new Date(b.dataBruta) - new Date(a.dataBruta));
};

const renderizarHistorico = () => {
    const transacoesFiltradas = obterTransacoesFiltradas();
    const lista = document.getElementById('lista-transacoes');
    lista.innerHTML = '';

    if (transacoesFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <p>Nenhuma transação encontrada para este filtro ou período.</p>
            </div>`;
        return;
    }

    transacoesFiltradas.forEach(t => {
        const li = document.createElement('li');
        li.className = `transacao-item tipo-${t.tipo}`;
        const sinal = t.tipo === 'receita' ? '+' : '-';
        const classeValor = t.tipo === 'receita' ? 'valor-receita' : 'valor-despesa';

        li.innerHTML = `
            <div class="transacao-info">
                <span><strong>${t.descricao}</strong></span>
                <span class="transacao-data-cat">${t.data} • ${t.categoria}</span>
            </div>
            <div class="transacao-valor-container">
                <span class="transacao-valor ${classeValor}">${sinal} ${formatarMoeda(t.valor)}</span>
                <button class="btn-acao-item btn-editar-item" onclick="prepararEdicao('${t.id}')">✏️</button>
                <button class="btn-acao-item btn-remover-item" onclick="removerTransacao('${t.id}')">X</button>
            </div>
        `;
        lista.appendChild(li);
    });
};

window.limparFiltros = () => {
    document.getElementById('filtro-texto').value = '';
    document.getElementById('filtro-data-inicio').value = '';
    document.getElementById('filtro-data-fim').value = '';
    document.getElementById('filtro-tipo').value = 'todos';
    document.getElementById('filtro-categoria').value = 'todas';
    renderizarHistorico();
};

document.getElementById('filtro-texto').addEventListener('input', debounce(renderizarHistorico, 300));
['filtro-data-inicio', 'filtro-data-fim', 'filtro-tipo', 'filtro-categoria'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderizarHistorico);
});

// --- EXPORTAÇÃO CSV ---
document.getElementById('btn-exportar').addEventListener('click', () => {
    const transacoesParaExportar = obterTransacoesFiltradas();
    if (transacoesParaExportar.length === 0) return mostrarToast("Não há dados para exportar.", "erro");

    let csvContent = "\uFEFFID,Tipo,Data,Descricao,Categoria,Valor\n";
    transacoesParaExportar.forEach(t => {
        csvContent += `${t.id},${t.tipo},${t.dataBruta},"${t.descricao}",${t.categoria},${t.valor}\n`;
    });

    const dtInicio = document.getElementById('filtro-data-inicio').value;
    const dtFim = document.getElementById('filtro-data-fim').value;
    let nomeArquivo = dtInicio || dtFim ? `extrato_${dtInicio || 'inicio'}_ate_${dtFim || 'hoje'}.csv` : "historico_financeiro.csv";
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
    link.download = nomeArquivo;
    link.click();
    mostrarToast("Exportação iniciada!", "sucesso");
});

// --- CONFIGURAÇÕES ---
const renderizarConfiguracoes = () => {
    const listaCat = document.getElementById('lista-config-categorias');
    listaCat.innerHTML = '';
    categorias.forEach(cat => {
        listaCat.innerHTML += `<li><span>${cat}</span><button class="btn-acao-item btn-remover-item" onclick="removerCategoria('${cat}')">X</button></li>`;
    });

    const listaFixos = document.getElementById('lista-config-fixos');
    listaFixos.innerHTML = '';
    gastosFixos.forEach(gasto => {
        listaFixos.innerHTML += `<li><span><strong>${gasto.descricao}</strong> - ${formatarMoeda(gasto.valor)}</span><button class="btn-acao-item btn-remover-item" onclick="removerGastoFixo('${gasto.id}')">X</button></li>`;
    });

    const listaOrc = document.getElementById('lista-config-orcamentos');
    listaOrc.innerHTML = '';
    Object.keys(orcamentos).forEach(cat => {
        listaOrc.innerHTML += `
            <li>
                <span><strong>${cat}</strong>: Limite de ${formatarMoeda(orcamentos[cat])}</span>
                <button class="btn-acao-item btn-remover-item" onclick="removerOrcamento('${cat}')">X</button>
            </li>`;
    });
};

document.getElementById('form-config-categoria').addEventListener('submit', (e) => {
    e.preventDefault();
    const novaCat = document.getElementById('nova-categoria').value.trim();
    if (categorias.map(c => c.toLowerCase()).includes(novaCat.toLowerCase())) {
        return mostrarToast("Esta categoria já existe.", "erro");
    }
    categorias.push(novaCat);
    salvarDados(); sincronizarSelectsCategorias(); renderizarConfiguracoes();
    document.getElementById('nova-categoria').value = '';
    mostrarToast("Categoria adicionada!");
});

window.removerCategoria = (cat) => {
    if (categorias.length <= 1) return mostrarToast("Mantenha ao menos uma categoria.", "erro");
    if (confirm(`Remover a categoria "${cat}"?`)) {
        categorias = categorias.filter(c => c !== cat);
        salvarDados(); sincronizarSelectsCategorias(); renderizarConfiguracoes();
        mostrarToast("Categoria removida.", "aviso");
    }
};

document.getElementById('form-config-fixo').addEventListener('submit', (e) => {
    e.preventDefault();
    gastosFixos.push({
        id: crypto.randomUUID(),
        descricao: document.getElementById('novo-fixo-desc').value.trim(),
        valor: parseFloat(document.getElementById('novo-fixo-valor').value),
        categoria: document.getElementById('novo-fixo-cat').value
    });
    salvarDados(); renderizarConfiguracoes();
    document.getElementById('form-config-fixo').reset();
    mostrarToast("Gasto fixo salvo!");
});

window.removerGastoFixo = (id) => {
    gastosFixos = gastosFixos.filter(g => g.id !== id);
    salvarDados(); renderizarConfiguracoes();
    mostrarToast("Gasto fixo removido.", "aviso");
};

// Gerenciamento de Orçamentos
document.getElementById('form-config-orcamento').addEventListener('submit', (e) => {
    e.preventDefault();
    const cat = document.getElementById('novo-orcamento-cat').value;
    const limite = parseFloat(document.getElementById('novo-orcamento-valor').value);
    
    orcamentos[cat] = limite;
    salvarDados();
    renderizarConfiguracoes();
    atualizarDashboard();
    document.getElementById('form-config-orcamento').reset();
    mostrarToast("Orçamento definido com sucesso!");
});

window.removerOrcamento = (cat) => {
    delete orcamentos[cat];
    salvarDados();
    renderizarConfiguracoes();
    atualizarDashboard();
    mostrarToast("Orçamento removido.", "aviso");
};

document.getElementById('btn-fixos').addEventListener('click', () => {
    if(gastosFixos.length === 0) return mostrarToast("Nenhum gasto configurado.", "erro");
    
    const dataAtual = new Date().toISOString().split('T')[0]; 
    gastosFixos.forEach(gasto => {
        transacoes.push({
            id: crypto.randomUUID(), tipo: 'despesa', dataBruta: dataAtual,
            data: formatarData(dataAtual), descricao: gasto.descricao,
            valor: gasto.valor, categoria: gasto.categoria
        });
    });
    salvarDados(); atualizarDashboard(); renderizarHistorico();
    mostrarToast("Gastos fixos lançados!");
    mudarAba('view-inicio');
});

// --- INICIALIZAÇÃO ---
sincronizarSelectsCategorias();
renderizarConfiguracoes();
atualizarDashboard();
renderizarHistorico();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log('Falha no SW: ', err));
    });
}