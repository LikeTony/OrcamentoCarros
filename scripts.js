let carsData = [];
let filteredCars = [];
let currentPeriod = 'mensal';
let carsChart = null;
let mesesQuitar = 60;
let valorEntrada = 5000;

// Carregar dados dos carros
async function loadCarsData() {
  try {
    const response = await fetch('filtered_car_data.json'); // Alterado para filtered_car_data.json
    carsData = await response.json();
    filteredCars = [...carsData];
    populateCarFilter();
    updateSummary();
    renderCars();
    renderChart();
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    document.getElementById('carsGrid').innerHTML = '<p class="text-center col-span-full">Erro ao carregar dados dos carros.</p>';
  }
}

// Preencher filtro de carros
function populateCarFilter() {
  const select = document.getElementById('carFilter');
  select.innerHTML = '<option value="">Todos os carros</option>';
  carsData.forEach(car => {
    const option = document.createElement('option');
    option.value = car.name;
    option.textContent = car.name;
    select.appendChild(option);
  });
}

// Formatar valor monetário
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Calcula parcela de financiamento com entrada e meses customizados
function calcularParcelaFinanciamento(preco, entrada, meses, taxa = 0.015) {
  // Fórmula de Price: P = V * [i*(1+i)^n] / [(1+i)^n - 1]
  const valorFinanciado = Math.max(preco - entrada, 0);
  const i = taxa;
  const n = meses;
  if (valorFinanciado === 0 || n === 0) return 0;
  const parcela = valorFinanciado * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  return parcela;
}

// Obter valor do período atual (ajustado para considerar meses/entrada customizados)
// Retorna objeto detalhado com todos os custos e totais
function getPeriodTotals(car, periodo) {
  let entrada = Number(valorEntrada) || 0;
  let meses = Number(mesesQuitar) || 1;
  let taxa = 0.015; // 1,5% a.m.

  // Valor financiado e parcela
  const precoMedio = Number(car.preco_medio) || 0;
  const valorFinanciado = Math.max(precoMedio - entrada, 0);
  const parcela = calcularParcelaFinanciamento(precoMedio, entrada, meses, taxa);

  // Período em meses
  let fatorPeriodo = 1;
  switch (periodo) {
    case 'trimestral': fatorPeriodo = 3; break;
    case 'semestral': fatorPeriodo = 6; break;
    case 'anual': fatorPeriodo = 12; break;
    default: fatorPeriodo = 1;
  }

  // Custos fixos mensais (garanta que todos são números)
  const combustivel = car.combustivel_mensal_min || 0;
  const manutencao = car.manutencao_mensal_provided || 0;
  const seguro = car.seguro_mensal_calculated || 0;
  const ipva = car.ipva_mensal_calculated || 0;
  const lavagem = car.lavagem_mensal || 0;
  const manutencao_preventiva = car.manutencao_preventiva_mensal || 0;
  const imprevistos = car.imprevistos_mensal || 0;
  const melhorias = car.melhorias_mensal || 0;
  const multas = car.multas_mensal || 0;
  const estacionamento_pedagio = car.estacionamento_pedagio_mensal || 0;

  const totalMensal = combustivel + manutencao + seguro + ipva + lavagem + manutencao_preventiva + imprevistos + melhorias + multas + estacionamento_pedagio + parcela;

  return {
    combustivel: combustivel * fatorPeriodo,
    manutencao: manutencao * fatorPeriodo,
    seguro: seguro * fatorPeriodo,
    ipva: ipva * fatorPeriodo,
    financiamento: parcela * fatorPeriodo,
    lavagem: lavagem * fatorPeriodo,
    manutencao_preventiva: manutencao_preventiva * fatorPeriodo,
    imprevistos: imprevistos * fatorPeriodo,
    melhorias: melhorias * fatorPeriodo,
    multas: multas * fatorPeriodo,
    estacionamento_pedagio: estacionamento_pedagio * fatorPeriodo,
    total: totalMensal * fatorPeriodo
  };
}

// Atualizar resumo
function updateSummary() {
  if (filteredCars.length === 0) {
    document.getElementById('avgPrice').textContent = '-';
    document.getElementById('minPrice').textContent = '-';
    document.getElementById('maxPrice').textContent = '-';
    document.getElementById('avgMonthlyCost').textContent = '-';
    return;
  }

  const prices = filteredCars.map(car => car.preco_medio);
  const monthlyCosts = filteredCars.map(car => getPeriodTotals(car, 'mensal').total);

  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgMonthlyCost = monthlyCosts.reduce((sum, cost) => sum + cost, 0) / monthlyCosts.length;

  document.getElementById('avgPrice').textContent = formatCurrency(avgPrice);
  document.getElementById('minPrice').textContent = formatCurrency(minPrice);
  document.getElementById('maxPrice').textContent = formatCurrency(maxPrice);
  document.getElementById('avgMonthlyCost').textContent = formatCurrency(avgMonthlyCost);
}

// Renderizar carros
function renderCars() {
  const carsGrid = document.getElementById('carsGrid');
  carsGrid.innerHTML = '';

  const selectedCarName = document.getElementById('carFilter').value;
  const sortBy = document.getElementById('sortBy').value;

  let carsToRender = selectedCarName ? carsData.filter(car => car.name === selectedCarName) : [...carsData];

  // Ordenar carros
  carsToRender.sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'price') {
      return a.preco_medio - b.preco_medio;
    } else if (sortBy === 'monthly_cost') {
      return getPeriodTotals(a, 'mensal').total - getPeriodTotals(b, 'mensal').total;
    }
    return 0;
  });

  if (carsToRender.length === 0) {
    carsGrid.innerHTML = '<p class="text-center col-span-full">Nenhum carro encontrado com os filtros selecionados.</p>';
    return;
  }

  carsToRender.forEach((car, index) => {
    const totals = getPeriodTotals(car, currentPeriod);
    const ipvaExemptText = car.ipva_exempt ? '<span class="text-green-500 font-semibold">(ISENTO)</span>' : '';
    const imageUrl = `./imagens/${car.name.toLowerCase().replace(/ /g, '_').replace(/\./g, '')}.jpg`;

    const carCard = `
                  <div class="card p-6 fade-in fade-in-delay-${index % 3}">
                      <div class="car-image" style="background-image: url('${imageUrl}');"></div>
                      <h2 class="text-xl font-bold mb-2">${car.name}</h2>
                      <p class="text-secondary mb-4">Preço médio: ${formatCurrency(car.preco_medio)}</p>

                      <h3 class="text-lg font-semibold mb-2">Custos ${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}</h3>
                      <div class="space-y-2 mb-4">
                          <div class="cost-item">
                              <span>Combustível:</span>
                              <span>${formatCurrency(totals.combustivel)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Manutenção:</span>
                              <span>${formatCurrency(totals.manutencao)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Seguro:</span>
                              <span>${formatCurrency(totals.seguro)}</span>
                          </div>
                          <div class="cost-item">
                              <span>IPVA:</span>
                              <span>${formatCurrency(totals.ipva)} ${ipvaExemptText}</span>
                          </div>
                          <div class="cost-item">
                              <span>Financiamento:</span>
                              <span>${formatCurrency(totals.financiamento)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Lavagem:</span>
                              <span>${formatCurrency(totals.lavagem)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Manutenção Preventiva:</span>
                              <span>${formatCurrency(totals.manutencao_preventiva)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Imprevistos:</span>
                              <span>${formatCurrency(totals.imprevistos)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Melhorias:</span>
                              <span>${formatCurrency(totals.melhorias)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Multas:</span>
                              <span>${formatCurrency(totals.multas)}</span>
                          </div>
                          <div class="cost-item">
                              <span>Estacionamento/Pedágio:</span>
                              <span>${formatCurrency(totals.estacionamento_pedagio)}</span>
                          </div>
                          <div class="cost-item font-bold text-lg">
                              <span>Total ${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}:</span>
                              <span>${formatCurrency(totals.total)}</span>
                          </div>
                      </div>

                      <h3 class="text-lg font-semibold mb-2">Prós</h3>
                      <ul class="list-disc list-inside text-secondary mb-4">
                          ${(car.pros || []).map(pro => `<li>${pro}</li>`).join('')}
                      </ul>

                      <h3 class="text-lg font-semibold mb-2">Contras</h3>
                      <ul class="list-disc list-inside text-secondary">
                          ${(car.cons || []).map(con => `<li>${con}</li>`).join('')}
                      </ul>
                  </div>
              `;
    carsGrid.innerHTML += carCard;
  });
}

// Renderizar gráfico
function renderChart() {
  const ctx = document.getElementById('carsChart').getContext('2d');
  if (carsChart) {
    carsChart.destroy();
  }

  const sortBy = document.getElementById('sortBy').value;
  let sortedCarsForChart = [...filteredCars];

  // Ordenar carros para o gráfico de acordo com a seleção do usuário
  sortedCarsForChart.sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'price') {
      return a.preco_medio - b.preco_medio;
    } else if (sortBy === 'monthly_cost') {
      return getPeriodTotals(a, 'mensal').total - getPeriodTotals(b, 'mensal').total;
    }
    return 0;
  });

  const labels = sortedCarsForChart.map(car => car.name);
  const data = sortedCarsForChart.map(car => getPeriodTotals(car, currentPeriod).total);

  carsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: `Custo ${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)} Total`,
        data: data,
        backgroundColor: 'rgba(79, 70, 229, 0.6)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Custo Total (R$)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Modelo do Carro'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += formatCurrency(context.raw);
              return label;
            }
          }
        }
      }
    }
  });
}

// Event Listeners
document.getElementById('theme-toggle').addEventListener('click', () => {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', newTheme);
  document.getElementById('theme-icon').className = newTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
});

document.getElementById('carFilter').addEventListener('change', () => {
  const selectedCarName = document.getElementById('carFilter').value;
  filteredCars = selectedCarName ? carsData.filter(car => car.name === selectedCarName) : [...carsData];
  updateSummary();
  renderCars();
  renderChart();
});

document.getElementById('sortBy').addEventListener('change', () => {
  renderCars();
  renderChart();
});

document.querySelectorAll('.period-tab').forEach(button => {
  button.addEventListener('click', (event) => {
    document.querySelectorAll('.period-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    currentPeriod = event.target.dataset.period;
    document.querySelector('.card.p-6.mt-8 h2').textContent = `Comparativo de Custos (${currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)})`;
    renderCars();
    renderChart();
  });
});

document.getElementById('mesesQuitar').addEventListener('input', (event) => {
  mesesQuitar = Number(event.target.value);
  if (mesesQuitar < 1) mesesQuitar = 1;
  if (mesesQuitar > 120) mesesQuitar = 120;
  renderCars();
  renderChart();
  updateSummary();
});

document.getElementById('valorEntrada').addEventListener('input', (event) => {
  valorEntrada = Number(event.target.value);
  if (valorEntrada < 0) valorEntrada = 0;
  renderCars();
  renderChart();
  updateSummary();
});

// Carregar dados ao iniciar
loadCarsData();
