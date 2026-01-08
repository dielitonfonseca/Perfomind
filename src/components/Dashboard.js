import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
// ADICIONADO: setDoc e getDoc para gerenciar o cache
import { collection, onSnapshot, query, orderBy, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label, Cell, ComposedChart } from 'recharts';

// --- ESTILOS CSS GLOBAIS ---
const globalStyles = `
  /* Tooltip Style */
  .info-icon-container {
    display: inline-block;
    position: relative;
    margin-left: 8px;
    cursor: help;
  }
  .info-icon {
    font-size: 0.8em;
    color: #888;
    border: 1px solid #888;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tooltip-text {
    visibility: hidden;
    width: 220px;
    background-color: #000;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 8px;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -110px;
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.7em;
    text-transform: none;
    font-weight: normal;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
  }
  .tooltip-text::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: #000 transparent transparent transparent;
  }
  .info-icon-container:hover .tooltip-text {
    visibility: visible;
    opacity: 1;
  }

  /* Scrollbar Minimalista (Dark Mode) */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #2a2a2a;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #777;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #555 #2a2a2a;
  }
`;

// --- DEFINIÇÕES DE TEXTO E TOOLTIP POR MÉTRICA ---
const METRIC_DEFINITIONS = {
  productivity: {
    title: "MÉDIA DIÁRIA",
    tooltip: "Total de OSs / Intervalo",
    prefix: "",
    suffix: ""
  },
  adjustedProductivity: {
    title: "APROVAÇÃO PERCENTUAL",
    tooltip: "Percentual de orçamentos aprovados",
    prefix: "",
    suffix: "%"
  },
  avgApprovedRevenue: {
    title: "RECEITA MÉDIA POR OS",
    tooltip: "Somatória de aprovações / Quantidade de aprovações",
    prefix: "R$ ",
    suffix: ""
  },
  revenuePerOrder: {
    title: "APROVAÇÃO MÉDIA",
    tooltip: "Receita total / Total de OSs",
    prefix: "R$ ",
    suffix: ""
  }
};

const calculateConsecutiveWeeks = (kpis, key, threshold, condition) => {
  let consecutiveWeeks = 0;
  for (let i = kpis.length - 1; i >= 0; i--) {
    const kpi = kpis[i];
    if (!kpi || typeof kpi[key] === 'undefined') {
        continue;
    }
    const value = parseFloat(kpi[key]);

    let conditionMet = false;
    if (condition === 'less') {
      conditionMet = value <= threshold;
    } else if (condition === 'greater') {
      conditionMet = value >= threshold;
    }

    if (conditionMet) {
      consecutiveWeeks++;
    } else {
      break;
    }
  }
  return consecutiveWeeks;
};

const PerformancePopup = ({ isOpen, onClose, kpiData }) => {
  if (!isOpen) return null;

  const ltpVdWeeks = calculateConsecutiveWeeks(kpiData, 'LTP VD %', 12.8, 'less');
  const ltpDaWeeks = calculateConsecutiveWeeks(kpiData, 'LTP DA %', 17.4, 'less');
  const rrrVdWeeks = calculateConsecutiveWeeks(kpiData, 'RRR VD %', 2.8, 'less');
  const ihD1Weeks = calculateConsecutiveWeeks(kpiData, 'IN HOME D+1', 20, 'greater');
  const firstVisitVdWeeks = calculateConsecutiveWeeks(kpiData, '1ST VISIT VD', 20, 'greater');
  const p4pLtpVdWeeks = calculateConsecutiveWeeks(kpiData, 'LTP VD %', 5, 'less');
  const p4pLtpDaWeeks = calculateConsecutiveWeeks(kpiData, 'LTP DA %', 7, 'less');
  const p4pRrrVdWeeks = calculateConsecutiveWeeks(kpiData, 'RRR VD %', 1.5, 'less');

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-body">
          <h2>Metas Contínuas</h2>
          <p>Estamos há <strong>{ltpVdWeeks}</strong> semanas dentro do LTP VD (&lt;= 12.8%)</p>
          <p>Estamos há <strong>{ltpDaWeeks}</strong> semanas dentro do LTP DA (&lt;= 17.4%)</p>
          <p>Estamos há <strong>{rrrVdWeeks}</strong> semanas dentro do C-RRR VD (&lt;= 2.8%)</p>
          <p>Estamos há <strong>{ihD1Weeks}</strong> semanas dentro do Perfect Agenda (&gt;= 20%)</p>
          <p>Estamos há <strong>{firstVisitVdWeeks}</strong> semanas dentro do 1ST VISIT CI (&gt;= 20%)</p>
          <hr />
          <h3>Pay For Performance (P4P)</h3>
          <p>Estamos há <strong>{p4pLtpVdWeeks}</strong> semanas dentro do LTP VD (&lt;= 5%)</p>
          <p>Estamos há <strong>{p4pLtpDaWeeks}</strong> semanas dentro do LTP DA (&lt;= 7%)</p>
          <p>Estamos há <strong>{p4pRrrVdWeeks}</strong> semanas dentro do CRRR VD (&lt;= 1.5%)</p>
        </div>
        <div className="dialog-footer">
          <button onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

const KPIChart = ({ data, title, dataKeys, meta, tooltipContent, yAxisDomain = [0, 'auto'] }) => {
  if (!data || data.length === 0) {
    return <p className="no-data-message">Nenhum dado de "{title}" encontrado para as últimas 10 semanas.</p>;
  }

  return (
    <div className="kpi-chart-container">
      <h3>{title} </h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 80, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
            <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={yAxisDomain} />
            <Tooltip content={tooltipContent} />
            <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
            {dataKeys.map((key, index) => (
              <Line key={key.dataKey} type="monotone" dataKey={key.dataKey} stroke={key.stroke} activeDot={{ r: 8 }} name={key.name} />
            ))}
            {meta && Array.isArray(meta) ? (
              meta.map((m, idx) => (
                <ReferenceLine key={idx} y={m.value} stroke={m.stroke} strokeDasharray="3 3">
                  <Label value={m.label} position="right" fill={m.stroke} style={{ fontSize: '0.8em', textAnchor: 'start' }} />
                </ReferenceLine>
              ))
            ) : (
              meta && (
                <ReferenceLine y={meta.value} stroke={meta.stroke} strokeDasharray="3 3">
                  <Label value={meta.label} position="right" fill={meta.stroke} style={{ fontSize: '0.8em', textAnchor: 'start' }} />
                </ReferenceLine>
              )
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="custom-tooltip">
        <p className="label">{label}</p>
        {payload.map((entry, index) => {
          const { name, value } = entry;
          let displayValue = value;
          if (name.includes('%') || name.includes('FTC') || name.includes('NPS') || name.includes('VISIT') || name.includes('AGENDA') || name.includes('REPAIR')) {
            displayValue = `${value}%`;
          }
           if (name.includes('LTP VD %') && dataPoint['LTP VD QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['LTP VD QTD']})`;
          } else if (name.includes('LTP DA %') && dataPoint['LTP DA QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['LTP DA QTD']})`;
          } else if (name.includes('EX LTP VD %') && dataPoint['EX LTP VD QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['EX LTP VD QTD']})`;
          } else if (name.includes('EX LPT DA %') && dataPoint['EX LRP DA QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['EX LRP DA QTD']})`;
          } else if (name.includes('RRR VD %') && dataPoint['RRR VD QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['RRR VD QTD']})`;
          } else if (name.includes('RRR DA %') && dataPoint['RRR DA QTD'] !== undefined) {
            displayValue += ` (QTD: ${dataPoint['RRR DA QTD']})`;
          } else if (name === 'Receita Média por Ordem' || name === 'Receita Média por OS') {
            displayValue = `R$ ${value.toFixed(2)}`;
          } else if (name === 'Produtividade Ajustada') {
            displayValue = `${value.toFixed(1)}%`;
          } else if (name === 'Produtividade') {
            displayValue = value.toFixed(1);
          }
          return <p key={`item-${index}`}>{`${name}: ${displayValue}`}</p>;
        })}
      </div>
    );
  }
  return null;
};

const InfoPopup = ({ text }) => (
    <div className="info-icon-container">
        <span className="info-icon">i</span>
        <span className="tooltip-text">{text}</span>
    </div>
);

function Dashboard({ showPopup, setShowPopup }) {
  const [technicianRanking, setTechnicianRanking] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const [filterType, setFilterType] = useState('week'); 
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [selectedWeek, setSelectedWeek] = useState('');
  const [filterTech, setFilterTech] = useState('Todos');
  const [filterMetric, setFilterMetric] = useState('productivity'); 

  const [filteredResults, setFilteredResults] = useState(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 1. TENTAR CARREGAR O CACHE DO FIREBASE AO INICIAR ---
  useEffect(() => {
    const loadCachedState = async () => {
        try {
            const docRef = doc(db, 'dashboard_cache', 'last_state');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Restaurar Filtros
                setFilterType(data.filters.filterType || 'week');
                setFilterStartDate(data.filters.filterStartDate || '');
                setFilterEndDate(data.filters.filterEndDate || '');
                setSelectedWeek(data.filters.selectedWeek || '');
                setFilterTech(data.filters.filterTech || 'Todos');
                setFilterMetric(data.filters.filterMetric || 'productivity');
                
                // Restaurar Resultados Prontos (Gráfico e Tabela)
                if (data.results) {
                    setFilteredResults(data.results);
                }
            }
        } catch (e) {
            console.warn("Erro ao carregar cache do dashboard:", e);
        }
    };
    
    // Executa a busca do cache uma vez ao montar
    loadCachedState();
  }, []);

  // --- 2. LISTENERS DO FIREBASE (DADOS REAIS) ---
  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribes = [];
    
    // Técnicos
    const technicianStatsCollectionRef = collection(db, 'technicianStats');
    const q = query(technicianStatsCollectionRef, orderBy('totalOS', 'desc'));
    const unsubscribeTechnicianStats = onSnapshot(q, (snapshot) => {
      const allTechnicians = snapshot.docs.map(doc => ({ name: doc.id, ...doc.data() }));
      setTechnicianRanking(allTechnicians);
      setLoading(false);
    }, (err) => {
      setError("Erro ao carregar lista de técnicos.");
      setLoading(false);
    });
    unsubscribes.push(unsubscribeTechnicianStats);

    // KPIs
    const kpisCollectionRef = collection(db, 'kpis');
    const qKpis = query(kpisCollectionRef, orderBy('week', 'asc'));
    const unsubscribeKpis = onSnapshot(qKpis, (snapshot) => {
      const fetchedKpis = snapshot.docs.map(doc => ({
        name: `W ${String(doc.data().week).padStart(2, '0')}`,
        week: doc.data().week,
        ...doc.data(),
      }));
      
      const hasEndYear = fetchedKpis.some(k => k.week >= 40);
      const hasStartYear = fetchedKpis.some(k => k.week <= 12);
      
      let sortedKpis = [];
      if (hasEndYear && hasStartYear) {
          const nextYearWeeks = fetchedKpis.filter(k => k.week <= 12);
          const currentYearWeeks = fetchedKpis.filter(k => k.week > 12);
          sortedKpis = [...currentYearWeeks, ...nextYearWeeks];
      } else {
          sortedKpis = [...fetchedKpis].sort((a, b) => a.week - b.week);
      }
      setKpiData(sortedKpis);

      // Só define como 'current' se NÃO tivermos carregado um cache (selectedWeek ainda vazio)
      if (sortedKpis.length > 0 && !initialLoadDone && selectedWeek === '') {
          setSelectedWeek('current');
      }
    }, (err) => setError("Erro ao carregar dados de KPIs."));

    unsubscribes.push(unsubscribeKpis);
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, []); // Dependências vazias para rodar apenas na montagem

  // --- 3. TRIGGER AUTOMÁTICO DE FILTRO (REFRESH) ---
  useEffect(() => {
      if (technicianRanking.length > 0 && selectedWeek !== '' && kpiData.length > 0) {
          // O usuário vê o cache, mas isso roda em background para garantir dados frescos
          handleFilter();
          setInitialLoadDone(true);
      }
      // eslint-disable-next-line
  }, [technicianRanking, selectedWeek, kpiData, filterMetric]);

  const getCurrentWeekNumber = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getDateRangeOfWeek = (w) => {
    let targetWeek = w;
    const today = new Date();
    let year = today.getFullYear();
    if (w === 'current') targetWeek = getCurrentWeekNumber();
    if (today.getMonth() === 0 && targetWeek > 40) year = year - 1;
    
    const simple = new Date(year, 0, 1);
    const days = (targetWeek - 1) * 7;
    simple.setDate(simple.getDate() + days);
    
    const day = simple.getDay();
    const diff = simple.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(simple.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
  };

  const handleFilter = async () => {
    let startStr = filterStartDate;
    let endStr = filterEndDate;

    if (filterType === 'week') {
        if (!selectedWeek) return;
        const range = getDateRangeOfWeek(selectedWeek);
        startStr = range.start;
        endStr = range.end;
    } else {
        if (!filterStartDate || !filterEndDate) {
            // Se estiver faltando data, não faz nada (pode ser o cache carregando)
            return;
        }
    }

    setIsFiltering(true);
    // Não limpa setFilteredResults(null) para manter o cache visível enquanto atualiza

    const start = new Date(startStr);
    const end = new Date(endStr);
    const dates = [];
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        dates.push(dt.toISOString().split('T')[0]);
    }

    const techsToSearch = filterTech === 'Todos' 
        ? technicianRanking.map(t => t.name) 
        : [filterTech];

    let accumTotalOS = 0;
    let accumTotalRevenue = 0;
    let accumTotalApprovedCount = 0;
    const dailyData = {}; 
    const detailedList = [];

    dates.forEach(date => {
        dailyData[date] = { date, osCount: 0, revenue: 0, budgetCount: 0 };
    });

    try {
        for (const tech of techsToSearch) {
            try {
                for (const date of dates) {
                    const samsungRef = collection(db, 'ordensDeServico', tech, 'osPorData', date, 'Samsung');
                    const assurantRef = collection(db, 'ordensDeServico', tech, 'osPorData', date, 'Assurant');
    
                    const [samsungSnap, assurantSnap] = await Promise.all([getDocs(samsungRef), getDocs(assurantRef)]);
    
                    const processDoc = (docSnap) => {
                        const data = docSnap.data();

                        // FILTRO: Ignora se não tiver Data/Hora (dados antigos)
                        if (!data.dataHoraCriacao) {
                            return; 
                        }

                        let osValue = 0;
                        if (data.valorOrcamento !== undefined) {
                            osValue = parseFloat(data.valorOrcamento);
                        } else {
                            const match = (data.observacoes || '').match(/Orçamento aprovado:\s*R?\$\s*([\d.,]+)/i);
                            if (match && match[1]) {
                                let valStr = match[1].replace('R$', '').trim();
                                if (valStr.includes(',') && valStr.includes('.')) {
                                    valStr = valStr.replace(/\./g, '').replace(',', '.');
                                } else if (valStr.includes(',')) {
                                    valStr = valStr.replace(',', '.');
                                }
                                osValue = parseFloat(valStr) || 0;
                            }
                        }
                        if (isNaN(osValue)) osValue = 0;
                        const hasBudget = osValue > 0;

                        if (dailyData[date]) {
                            dailyData[date].osCount += 1;
                            dailyData[date].revenue += osValue;
                            if (hasBudget) dailyData[date].budgetCount += 1;
                        }
                        accumTotalOS += 1;
                        accumTotalRevenue += osValue;
                        if (hasBudget) accumTotalApprovedCount += 1;
                        
                        const typeCapitalized = data.tipoOS ? data.tipoOS.charAt(0).toUpperCase() + data.tipoOS.slice(1) : 'N/A';
                        detailedList.push({
                            id: docSnap.id,
                            date: date,
                            tech: tech,
                            client: data.cliente,
                            type: typeCapitalized, 
                            value: osValue,
                            timestampStr: data.dataHoraCriacao 
                        });
                    };
                    samsungSnap.forEach(processDoc);
                    assurantSnap.forEach(processDoc);
                }
            } catch (err) { console.warn(`Erro técnico ${tech}:`, err); }
        }

        const chartData = Object.values(dailyData).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        chartData.forEach(d => {
            d.revenuePerOrder = d.osCount > 0 ? d.revenue / d.osCount : 0;
            d.adjustedProductivity = d.osCount > 0 ? (d.budgetCount / d.osCount) * 100 : 0;
            d.avgApprovedRevenue = d.budgetCount > 0 ? d.revenue / d.budgetCount : 0;
        });

        let summaryValue = 0;
        const daysCount = dates.length;

        switch(filterMetric) {
            case 'revenuePerOrder':
                summaryValue = accumTotalOS > 0 ? accumTotalRevenue / accumTotalOS : 0;
                break;
            case 'productivity':
                summaryValue = daysCount > 0 ? accumTotalOS / daysCount : 0;
                break;
            case 'adjustedProductivity':
                summaryValue = accumTotalOS > 0 ? (accumTotalApprovedCount / accumTotalOS) * 100 : 0;
                break;
            case 'avgApprovedRevenue':
                summaryValue = accumTotalApprovedCount > 0 ? accumTotalRevenue / accumTotalApprovedCount : 0;
                break;
            default:
                summaryValue = accumTotalRevenue;
        }

        const resultsObj = {
            totalOS: accumTotalOS,
            summaryValue: summaryValue,
            chartData,
            detailedList
        };

        setFilteredResults(resultsObj);

        // --- SALVAR NO CACHE DO FIREBASE ---
        // Salvamos os filtros atuais e o resultado processado
        try {
            await setDoc(doc(db, 'dashboard_cache', 'last_state'), {
                updatedAt: new Date().toISOString(),
                filters: {
                    filterType,
                    filterStartDate,
                    filterEndDate,
                    selectedWeek,
                    filterTech,
                    filterMetric
                },
                results: resultsObj
            });
        } catch (cacheErr) {
            console.warn("Falha ao salvar cache:", cacheErr);
        }

    } catch (e) {
        console.error("Erro filtro:", e);
        // alert("Erro ao buscar dados."); // Comentado para não atrapalhar o refresh automatico silencioso
    } finally {
        setIsFiltering(false);
    }
  };

  const chartData = kpiData.slice(-10);
  const ltpvdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'LTP VD %': parseFloat(d['LTP VD %']), 'LTP VD QTD': parseFloat(d['LTP VD QTD']) })), [chartData]);
  const ltpdaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'LTP DA %': parseFloat(d['LTP DA %']), 'LTP DA QTD': parseFloat(d['LTP DA QTD']) })), [chartData]);
  const exltpvdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'EX LTP VD %': parseFloat(d['EX LTP VD %']), 'EX LTP VD QTD': parseFloat(d['EX LTP VD QTD']) })), [chartData]);
  const exltpdaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'EX LPT DA %': parseFloat(d['EX LPT DA %']), 'EX LRP DA QTD': parseFloat(d['EX LRP DA QTD']) })), [chartData]);
  const ecoRepairVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'ECO REPAIR VD': parseFloat(d['ECO REPAIR VD']) })), [chartData]);
  const ftcHappyCallChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'FTC HAPPY CALL': parseFloat(d['FTC HAPPY CALL']) })), [chartData]);
  const poInHomeD1ChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'PO IN HOME D+1': parseFloat(d['PO IN HOME D+1']) })), [chartData]);
  const firstVisitVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, '1ST VISIT VD': parseFloat(d['1ST VISIT VD']) })), [chartData]);
  const inHomeD1ChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'Perfect Agenda': parseFloat(d['IN HOME D+1']) })), [chartData]); 
  const rrrVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'RRR VD %': parseFloat(d['RRR VD %']), 'RRR VD QTD': parseFloat(d['RRR VD QTD']) })), [chartData]);
  const rrrDaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'RRR DA %': parseFloat(d['RRR DA %']), 'RRR DA QTD': parseFloat(d['RRR DA QTD']) })), [chartData]);
  const rnpsVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-NPS VD': parseFloat(d['R-NPS VD']) })), [chartData]);
  const rnpsDaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-NPS DA': parseFloat(d['R-NPS DA']) })), [chartData]);
  const rTatChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT': parseFloat(d['R-TAT']) })), [chartData]);
  const rTatVdCiChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT VD CI': parseFloat(d['R-TAT VD CI']) })), [chartData]);
  const rTatVdIhChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT VD IH': parseFloat(d['R-TAT VD IH']) })), [chartData]);
  const rTatDaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT DA': parseFloat(d['R-TAT DA']) })), [chartData]);

  if (loading) return <div className="no-data-message">Carregando dados do Firebase...</div>;
  if (error) return <div className="error-message">{error}</div>;

  // Lógica de Filtro da Tabela Detalhada
  const detailedListDisplay = filteredResults ? (
    (filterMetric === 'avgApprovedRevenue' || filterMetric === 'adjustedProductivity') 
        ? filteredResults.detailedList.filter(item => item.value > 0)
        : filteredResults.detailedList
  ) : [];

  const currentMetricInfo = METRIC_DEFINITIONS[filterMetric];

  return (
    <div className="output">
        <style>{globalStyles}</style>
        <PerformancePopup isOpen={showPopup} onClose={() => setShowPopup(false)} kpiData={kpiData} />
      
      <div className="dashboard-section" style={{ marginTop: '20px', padding: '20px', background: '#222', borderRadius: '8px' }}>
        <h3>Relatórios Detalhados 📊</h3>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', justifyContent: 'center', background: '#333', padding: '15px', borderRadius: '10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ color: '#ccc', marginBottom: '5px', fontSize: '0.9em' }}>Intervalo:</label>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff', minWidth: '150px' }}>
                    <option value="week">Semanal</option>
                    <option value="date">Por data</option>
                </select>
            </div>

            {filterType === 'date' ? (
                <>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ color: '#ccc', marginBottom: '5px', fontSize: '0.9em' }}>Data Início:</label>
                        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ color: '#ccc', marginBottom: '5px', fontSize: '0.9em' }}>Data Fim:</label>
                        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff' }} />
                    </div>
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ color: '#ccc', marginBottom: '5px', fontSize: '0.9em' }}>Semana:</label>
                    <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff', minWidth: '150px' }}>
                        {kpiData.map(kpi => (
                            <option key={kpi.week} value={kpi.week}>Semana {String(kpi.week).padStart(2, '0')}</option>
                        ))}
                        <option value="current">Semana Atual</option>
                    </select>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ color: '#ccc', marginBottom: '5px', fontSize: '0.9em' }}>Técnico:</label>
                <select value={filterTech} onChange={(e) => setFilterTech(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff', minWidth: '150px' }}>
                    <option value="Todos">Todos</option>
                    {technicianRanking.map(tech => <option key={tech.name} value={tech.name}>{tech.name}</option>)}
                </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ color: '#ccc', marginBottom: '5px', fontSize: '0.9em' }}>Filtro:</label>
                <select value={filterMetric} onChange={(e) => setFilterMetric(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff', minWidth: '150px' }}>
                    <option value="productivity">Produtividade</option>
                    <option value="adjustedProductivity">Produtividade Ajustada</option>
                    <option value="avgApprovedRevenue">Média Orçamento Aprovado</option>
                    <option value="revenuePerOrder">Receita Média por Ordem</option>
                </select>
            </div>

            <button 
                onClick={handleFilter} 
                disabled={isFiltering}
                style={{ 
                    padding: '8px 25px', background: '#00C49F', color: 'white', border: 'none', borderRadius: '4px', 
                    cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9em', height: '35px', alignSelf: 'flex-end' 
                }}
            >
                {isFiltering ? '...' : 'BUSCAR'}
            </button>
        </div>

        {filteredResults && (
            <div className="filter-results">
                <div style={{ display: 'flex', justifyContent: 'space-around', margin: '30px 0' }}>
                    <div style={{ textAlign: 'center', padding: '15px', background: '#333', borderRadius: '8px', minWidth: '150px' }}>
                        <h4 style={{ margin: 0, color: '#ccc', fontSize: '0.9em' }}>TOTAL OS</h4>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0' }}>{filteredResults.totalOS}</p>
                    </div>
                    
                    <div style={{ textAlign: 'center', padding: '15px', background: '#333', borderRadius: '8px', minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <h4 style={{ margin: 0, color: '#ccc', fontSize: '0.9em', textTransform: 'uppercase' }}>
                                {currentMetricInfo.title}
                            </h4>
                            <InfoPopup text={currentMetricInfo.tooltip} />
                        </div>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: '#00C49F' }}>
                            {currentMetricInfo.prefix}
                            {(filteredResults.summaryValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {currentMetricInfo.suffix}
                        </p>
                    </div>
                </div>

                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={filteredResults.chartData}>
                            <CartesianGrid stroke="#444" strokeDasharray="3 3" />
                            <XAxis dataKey="date" stroke="#ccc" tickFormatter={(str) => {
                                const d = new Date(str);
                                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}`;
                            }} />
                            <YAxis yAxisId="left" stroke="#8884d8" />
                            <Tooltip contentStyle={{ backgroundColor: '#333', borderColor: '#555' }} labelStyle={{ color: '#fff' }} formatter={(value, name) => {
                                if(name === 'Receita Média por Ordem' || name === 'Receita Média por OS') return `R$ ${parseFloat(value).toFixed(2)}`;
                                if(name === 'Produtividade Ajustada') return `${parseFloat(value).toFixed(1)}%`;
                                return parseFloat(value).toFixed(2);
                            }} />
                            <Legend />
                            {filterMetric === 'revenuePerOrder' && <Line yAxisId="left" type="monotone" dataKey="revenuePerOrder" name="Receita Média por Ordem" stroke="#FFBB28" strokeWidth={3} />}
                            {filterMetric === 'productivity' && <Bar yAxisId="left" dataKey="osCount" name="Produtividade" barSize={20} fill="#82ca9d" />}
                            {filterMetric === 'adjustedProductivity' && <Line yAxisId="left" type="monotone" dataKey="adjustedProductivity" name="Produtividade Ajustada" stroke="#FF8042" strokeWidth={3} />}
                            {filterMetric === 'avgApprovedRevenue' && <Line yAxisId="left" type="monotone" dataKey="avgApprovedRevenue" name="Receita Média por OS" stroke="#00C49F" strokeWidth={3} />}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                
                {detailedListDisplay.length > 0 && (
                  <div className="custom-scrollbar" style={{ marginTop: '30px', maxHeight: '300px', overflowY: 'auto' }}>
                    <h4 style={{ textAlign: 'center', color: '#ccc' }}>Detalhamento ({detailedListDisplay.length} registros)</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                      <thead>
                        <tr style={{ background: '#444', color: '#fff' }}>
                          <th style={{ padding: '8px', textAlign: 'center' }}>#</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Hora/Data</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Técnico</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Cliente</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Tipo</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Orçamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedListDisplay.map((item, idx) => (
                          <tr key={idx} style={{ background: idx % 2 === 0 ? '#2a2a2a' : '#333', borderBottom: '1px solid #444' }}>
                            <td style={{ padding: '8px', textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.timestampStr}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.tech}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.client}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.type}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{item.value > 0 ? `R$ ${item.value.toFixed(2)}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
        )}
    </div>

      <div className="dashboard-section" style={{ marginTop: '20px', padding: '20px', background: '#222', borderRadius: '8px' }}>
          <h3>KPIs de Desempenho 🚀</h3>
          <div className={`kpi-grid ${isMobile ? 'mobile' : ''}`}>
             {/* Charts de KPIs (código omitido para brevidade, mas está aqui) */}
            <KPIChart data={ltpvdChartData} title=" LTP VD % " dataKeys={[{ dataKey: 'LTP VD %', stroke: '#8884d8', name: 'LTP VD %' }]} meta={[{ value: 12.8, stroke: '#ffc658', label: 'Meta: 12.8%' }, { value: 5, stroke: '#FF0000', label: 'P4P: 5%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 40]} />
            <KPIChart data={ltpdaChartData} title=" LTP DA % ⬇️" dataKeys={[{ dataKey: 'LTP DA %', stroke: '#ff7300', name: 'LTP DA %' }]} meta={[{ value: 17.4, stroke: '#00C49F', label: 'Meta: 17.4%' }, { value: 7, stroke: '#FFD700', label: 'P4P: 7%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 40]} />
            <KPIChart data={exltpvdChartData} title=" EX LTP VD % ⬇️" dataKeys={[{ dataKey: 'EX LTP VD %', stroke: '#3366FF', name: 'EX LTP VD %' }]} meta={{ value: 1.44, stroke: '#FFCC00', label: 'Meta: 1.44%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 10]} />
            <KPIChart data={exltpdaChartData} title=" EX LTP DA % ⬇️" dataKeys={[{ dataKey: 'EX LPT DA %', stroke: '#CC0066', name: 'EX LTP DA %' }]} meta={{ value: 1.50, stroke: '#99FF00', label: 'Meta: 1.50%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 10]} />
            <KPIChart data={rrrVdChartData} title=" RRR VD % ⬇️" dataKeys={[{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }]} meta={[{ value: 2.8, stroke: '#FFCC00', label: 'Meta: 2.8%' }, { value: 1.5, stroke: '#008080', label: 'P4P: 1.5%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 15]} />
            <KPIChart data={rrrDaChartData} title=" RRR DA % ⬇️" dataKeys={[{ dataKey: 'RRR DA %', stroke: '#A52A2A', name: 'RRR DA %' }]} meta={[{ value: 5, stroke: '#FF4500', label: 'Meta: 5%' }, { value: 3, stroke: '#FFD700', label: 'P4P: 3%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 15]} />
            <KPIChart data={ecoRepairVdChartData} title=" ECO REPAIR VD % ⬆️" dataKeys={[{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }]} meta={{ value: 60, stroke: '#FF5722', label: 'Meta: 90%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
            <KPIChart data={ftcHappyCallChartData} title=" FTC HAPPY CALL % ⬆️" dataKeys={[{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }]} meta={{ value: 88, stroke: '#FFEB3B', label: 'Meta: 88%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
            <KPIChart data={poInHomeD1ChartData} title=" PO IN HOME D+1 % ⬆️" dataKeys={[{ dataKey: 'PO IN HOME D+1', stroke: '#3F51B5', name: 'PO IN HOME D+1' }]} meta={{ value: 70, stroke: '#FFC107', label: 'Meta: 70%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
            <KPIChart data={firstVisitVdChartData} title=" 1ST VISIT VD % ⬆️" dataKeys={[{ dataKey: '1ST VISIT VD', stroke: '#FFBB28', name: '1ST VISIT VD' }]} meta={{ value: 20, stroke: '#FF0000', label: 'Meta: 20%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
            <KPIChart data={inHomeD1ChartData} title=" Perfect Agenda % ⬆️"  dataKeys={[{ dataKey: 'Perfect Agenda', stroke: '#00C49F', name: 'Perfect Agenda' }]} meta={{ value: 25, stroke: '#FF4081', label: 'Meta: 25%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 50]} />
            <KPIChart data={rTatChartData} title=" R-TAT (Geral)" dataKeys={[{ dataKey: 'R-TAT', stroke: '#E91E63', name: 'R-TAT' }]} tooltipContent={<CustomTooltip />} />
            <KPIChart data={rTatVdCiChartData} title=" R-TAT VD CI" dataKeys={[{ dataKey: 'R-TAT VD CI', stroke: '#9C27B0', name: 'R-TAT VD CI' }]} tooltipContent={<CustomTooltip />} />
            <KPIChart data={rTatVdIhChartData} title=" R-TAT VD IH" dataKeys={[{ dataKey: 'R-TAT VD IH', stroke: '#673AB7', name: 'R-TAT VD IH' }]} tooltipContent={<CustomTooltip />} />
            <KPIChart data={rTatDaChartData} title=" R-TAT DA" dataKeys={[{ dataKey: 'R-TAT DA', stroke: '#3F51B5', name: 'R-TAT DA' }]} tooltipContent={<CustomTooltip />} />
            <KPIChart data={rnpsVdChartData} title=" R-NPS VD % ⬆️" dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#4682B4', name: 'R-NPS VD' }]} meta={{ value: 80, stroke: '#9ACD32', label: 'Meta: 80%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
            <KPIChart data={rnpsDaChartData} title=" R-NPS DA % ⬆️" dataKeys={[{ dataKey: 'R-NPS DA', stroke: '#FF4500', name: 'R-NPS DA' }]} meta={{ value: 78, stroke: '#ADFF2F', label: 'Meta: 78%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
          </div>
      </div>
    </div>
  );
}

export default Dashboard;