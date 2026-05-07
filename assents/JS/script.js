// Tenta carregar transações salvas no navegador; se não houver, inicia vazio.
let transacoes = JSON.parse(localStorage.getItem('transacoesFinanceiras')) || [];

const form = document.getElementById('form-transacao');
const listaTransacoes = document.getElementById('lista-transacoes');
const displayTotalGastos = document.getElementById('total-gastos');
const displayTotalReceitas = document.getElementById('total-receitas');
const displaySaldoAtual = document.getElementById('saldo-atual');

// 1. Meus Gastos Fixos (Você pode editar esta lista com suas contas reais)
const gastosFixos = [
    { descricao: 'Faculdade', valor: 360.00, categoria: 'Educação' },
    
];

// Função para remover uma transação específica
const removerTransacao = (id) => {
    // Filtra o array mantendo apenas os itens que têm ID diferente do selecionado
    transacoes = transacoes.filter(transacao => transacao.id !== id);
    
    // Atualiza tudo
    salvarDados();
    renderizarLista();
    atualizarResumo();
};

const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

const formatarData = (dataString) => {
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
};

// Salva no LocalStorage sempre que houver alteração
const salvarDados = () => {
    localStorage.setItem('transacoesFinanceiras', JSON.stringify(transacoes));
};

const atualizarResumo = () => {
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + t.valor, 0);
    const despesas = transacoes.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0);
    const saldo = receitas - despesas;

    displayTotalReceitas.innerText = formatarMoeda(receitas);
    displayTotalGastos.innerText = formatarMoeda(despesas);
    displaySaldoAtual.innerText = formatarMoeda(saldo);
};

const renderizarLista = () => {
    listaTransacoes.innerHTML = '';
    
    const transacoesOrdenadas = [...transacoes].sort((a, b) => new Date(b.dataBruta) - new Date(a.dataBruta));

    transacoesOrdenadas.forEach(transacao => {
        const li = document.createElement('li');
        li.className = `transacao-item tipo-${transacao.tipo}`;
        
        const sinal = transacao.tipo === 'receita' ? '+' : '-';
        const classeValor = transacao.tipo === 'receita' ? 'valor-receita' : 'valor-despesa';

        li.innerHTML = `
            <div class="transacao-info">
                <span><strong>${transacao.descricao}</strong></span>
                <span class="transacao-data-cat">${transacao.data} • ${transacao.categoria}</span>
            </div>
            <div class="transacao-valor-container">
                <span class="transacao-valor ${classeValor}">
                    ${sinal} ${formatarMoeda(transacao.valor)}
                </span>
                <button class="btn-remover" onclick="removerTransacao(${transacao.id})">X</button>
            </div>
        `;
        listaTransacoes.appendChild(li);
    });
};

// Evento Principal de Adicionar Transação
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const tipo = document.getElementById('tipo').value;
    const dataInput = document.getElementById('data').value;
    const descricao = document.getElementById('descricao').value;
    const valor = parseFloat(document.getElementById('valor').value);
    const categoria = document.getElementById('categoria').value;

    const novaTransacao = {
        id: Date.now(),
        tipo,
        dataBruta: dataInput,
        data: formatarData(dataInput),
        descricao,
        valor,
        categoria
    };

    transacoes.push(novaTransacao);
    
    salvarDados(); // Salva no navegador
    renderizarLista();
    atualizarResumo();

    document.getElementById('descricao').value = '';
    document.getElementById('valor').value = '';
    document.getElementById('descricao').focus();
});

// 2. Função: Lançar Gastos Fixos
document.getElementById('btn-fixos').addEventListener('click', () => {
    const hoje = new Date();
    // Pega a data de hoje no formato YYYY-MM-DD
    const dataAtual = hoje.toISOString().split('T')[0]; 

    // Adiciona cada gasto fixo na lista de transações
    gastosFixos.forEach(gasto => {
        transacoes.push({
            id: Date.now() + Math.random(), // ID único
            tipo: 'despesa',
            dataBruta: dataAtual,
            data: formatarData(dataAtual),
            descricao: gasto.descricao,
            valor: gasto.valor,
            categoria: gasto.categoria
        });
    });

    salvarDados();
    renderizarLista();
    atualizarResumo();
    alert('Gastos fixos do mês foram lançados com sucesso!');
});

// 3. Função: Exportar para Planilha (CSV)
document.getElementById('btn-exportar').addEventListener('click', () => {
    if (transacoes.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }

    // Cabeçalho da planilha
    let csv = 'Data,Tipo,Descrição,Categoria,Valor (R$)\n';

    // Preenche as linhas
    transacoes.forEach(t => {
        // Troca ponto por vírgula no valor para o Excel brasileiro entender como dinheiro
        const valorFormatado = t.valor.toFixed(2).replace('.', ',');
        csv += `${t.data},${t.tipo},${t.descricao},${t.categoria},"${valorFormatado}"\n`;
    });

    // Cria o arquivo. O '\uFEFF' garante que os acentos (UTF-8) funcionem no Excel
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    // Força o download
    const a = document.createElement('a');
    a.href = url;
    a.download = `Controle_Financeiro_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Inicializa a tela ao abrir a página
renderizarLista();
atualizarResumo();