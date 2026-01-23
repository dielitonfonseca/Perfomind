import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Label, ComposedChart } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import SignatureDialog from '../components/SignatureDialog';
import '../App.css';

// --- CONFIGURAÇÕES DE MÉTRICAS DETALHADAS ---
const DETAILED_METRICS = [
  { value: 'productivity', label: 'Produtividade Técnica' },
  { value: 'adjustedProductivity', label: 'Produtividade Ajustada' },
  { value: 'totalApprovedBudget', label: 'Orçamento Aprovado' },
  { value: 'avgApprovedRevenue', label: 'Média Orçamento Aprovado' },
  { value: 'revenuePerOrder', label: 'Receita Média por Ordem' }
];

// --- CABEÇALHO DO GRÁFICO ---
const ChartHeaderSummary = ({ data, title, dataKeys, isDetailed, periodLabel, isLightMode }) => {
    if (!data || data.length === 0) return <h5 className="chart-title-center" style={{ color: isLightMode ? '#333' : '#fff' }}>{title}</h5>;

    let formattedValue = '0';
    let subInfo = '';
    let suffix = '';
    const mainKey = dataKeys[0].dataKey;
    const color = dataKeys[0].stroke || '#fff';
    const lastPoint = data[data.length - 1];

    if (isDetailed) {
        const totalOS = data.reduce((acc, item) => acc + (item.productivity || 0), 0);
        const totalBudget = data.reduce((acc, item) => acc + (item.totalApprovedBudget || 0), 0);
        const totalApprovedCount = data.reduce((acc, item) => acc + (item.approvedCount || 0), 0);

        if (mainKey === 'productivity') {
            formattedValue = totalOS;
            subInfo = 'Ordens de Serviço';
        } 
        else if (mainKey === 'totalApprovedBudget') {
            formattedValue = `R$ ${totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            subInfo = `${totalApprovedCount} Aprovados`;
        }
        else if (mainKey === 'adjustedProductivity') {
            const percent = totalOS > 0 ? (totalApprovedCount / totalOS) * 100 : 0;
            formattedValue = percent.toFixed(2);
            suffix = '%';
            subInfo = `${totalApprovedCount}/${totalOS} Aprovados`;
        }
        else if (mainKey === 'avgApprovedRevenue') {
             const avg = totalApprovedCount > 0 ? totalBudget / totalApprovedCount : 0;
             formattedValue = `R$ ${avg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
             subInfo = 'Média p/ Aprovado';
        }
        else if (mainKey === 'revenuePerOrder') {
             const avg = totalOS > 0 ? totalBudget / totalOS : 0;
             formattedValue = `R$ ${avg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
             subInfo = 'Média Geral p/ OS';
        }
        else {
             const lastVal = lastPoint[mainKey];
             formattedValue = typeof lastVal === 'number' ? lastVal.toFixed(2) : lastVal;
        }

    } else {
        const val = lastPoint[mainKey];
        if (mainKey.includes('%')) {
            const qtdKey = mainKey.replace('%', 'QTD').trim();
            if (lastPoint[qtdKey] !== undefined) subInfo = `QTD: ${lastPoint[qtdKey]}`;
            suffix = '%';
        }
        formattedValue = typeof val === 'number' ? val.toFixed(2) : val;
    }

    const refText = isDetailed ? periodLabel : lastPoint.name;
    const displayRef = `Ref: ${refText}`;

    return (
        <div className="chart-header-summary">
            <div className="chs-title" style={{ color: isLightMode ? '#333' : '#fff' }}>{title}</div>
            <div className="chs-values">
                <span className="chs-main-value" style={{ color: isLightMode && color === '#fff' ? '#00C49F' : color }}>
                    {formattedValue}{suffix}
                </span>
                {subInfo && <span className="chs-sub-value" style={{ color: isLightMode ? '#666' : '#888' }}> | {subInfo}</span>}
                <span className="chs-date-label" style={{ 
                    background: isLightMode ? '#d1d1d1' : '#333', 
                    color: isLightMode ? '#333' : '#ccc' 
                }}>{displayRef}</span>
            </div>
        </div>
    );
};

// --- COMPONENTE DE GRÁFICO GENÉRICO ---
const ReportChart = ({ data, title, type = 'line', dataKeys, meta, yAxisDomain = [0, 'auto'], isDetailed = false, periodLabel = '', isLightMode = false }) => {
  if (!data || data.length === 0) return <div className="no-data" style={{ color: isLightMode ? '#666' : '#888' }}>Sem dados para exibir</div>;

  const gridColor = isLightMode ? '#d1d1d1' : '#444';
  const axisColor = isLightMode ? '#666' : '#ccc';

  return (
    <div className="chart-card-internal" style={{ 
        background: isLightMode ? '#ffffff' : '#222', 
        borderWidth: isLightMode ? '0px' : '1px',
        borderColor: isLightMode ? 'transparent' : '#333',
        borderStyle: 'solid',
        boxShadow: 'none', 
        outline: 'none' 
    }}>
      <ChartHeaderSummary 
        data={data} 
        title={title} 
        dataKeys={dataKeys} 
        isDetailed={isDetailed} 
        periodLabel={periodLabel} 
        isLightMode={isLightMode}
      />
      
      <div className="chart-responsive-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
             <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke={axisColor} domain={yAxisDomain} tick={{ fontSize: 10 }} />
                {dataKeys.map((key) => (
                    <Bar key={key.dataKey} dataKey={key.dataKey} fill={key.stroke} barSize={30} isAnimationActive={false} />
                ))}
             </BarChart>
          ) : (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" stroke={axisColor} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis stroke={axisColor} domain={yAxisDomain} tick={{ fontSize: 10 }} />
                {dataKeys.map((key) => (
                    <Line 
                        key={key.dataKey} 
                        type="monotone" 
                        dataKey={key.dataKey} 
                        stroke={key.stroke} 
                        strokeWidth={3} 
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        isAnimationActive={false}
                    />
                ))}
                {meta && (Array.isArray(meta) ? meta : [meta]).map((m, idx) => (
                    <ReferenceLine key={idx} y={m.value} stroke={m.stroke} strokeDasharray="3 3">
                        <Label value={m.label} position="insideTopRight" fill={m.stroke} fontSize={10} />
                    </ReferenceLine>
                ))}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// --- COMPONENTE DE RANKING ---
const RankingPodium = ({ rankings, metricLabel, titleSuffix = '', isLightMode }) => {
    if (!rankings || rankings.length === 0) return null;

    const medals = [
        { color: '#FFD700', label: '1º Lugar' }, 
        { color: '#C0C0C0', label: '2º Lugar' }, 
        { color: '#CD7F32', label: '3º Lugar' }  
    ];

    return (
        <div className="ranking-container" style={{ 
            background: isLightMode ? '#f9f9f9' : '#1e1e1e', 
            borderColor: isLightMode ? '#e0e0e0' : '#333',
            boxShadow: 'none' 
        }}>
            <h4 className="ranking-title" style={{ color: isLightMode ? '#333' : '#fff' }}>🏆 Top 3 {titleSuffix} - {metricLabel}</h4>
            <div className="ranking-grid">
                {rankings.map((rank, index) => (
                    <div key={index} className="rank-card" style={{ 
                        borderColor: medals[index].color, 
                        background: isLightMode ? '#fff' : '#2a2a2a'
                    }}>
                        <div className="rank-badge" style={{ backgroundColor: medals[index].color, color: isLightMode ? '#000' : '#fff' }}>
                            {medals[index].label}
                        </div>
                        <div className="rank-name" style={{ color: isLightMode ? '#000' : '#fff' }}>{rank.tech}</div>
                        <div className="rank-value" style={{ color: isLightMode ? '#333' : '#ccc' }}>{rank.formattedValue}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- AUXILIARES ---
// Nova lógica: Conta quantas semanas consecutivas a métrica manteve o MESMO ESTADO atual (dentro ou fora)
const calculateConsecutiveWeeksInCurrentState = (kpis, key, ruleType, limit, currentState) => {
    let count = 0;
    for (let i = kpis.length - 1; i >= 0; i--) {
        const kpi = kpis[i];
        if (!kpi || typeof kpi[key] === 'undefined') continue;
        const val = parseFloat(kpi[key]);
        if (isNaN(val)) continue;
        const isIn = ruleType === 'less' ? val <= limit : val >= limit;
        
        // Se o estado desta semana do loop for igual ao estado atual (currentState), soma 1.
        if (isIn === currentState) count++;
        else break; // Se mudou de estado, a contagem de semanas consecutivas acaba.
    }
    return count;
};

const getDateRangeOfWeek = (w, yearInput) => {
    let targetWeek = parseInt(w);
    let year = yearInput || new Date().getFullYear();
    const today = new Date();
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

const ReportsConfigPage = () => {
  const [kpiData, setKpiData] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  
  // --- TEMA CLARO / ESCURO ---
  const [isLightMode, setIsLightMode] = useState(false);

  const [reportTitle, setReportTitle] = useState('');
  const [reportSubtitle, setReportSubtitle] = useState(''); 
  const [selectedWeek, setSelectedWeek] = useState(''); 
  
  const [highlightLayout, setHighlightLayout] = useState('side-by-side');
  const [generalLayout, setGeneralLayout] = useState('full-width'); 

  const [detailedDataCache, setDetailedDataCache] = useState({});
  const [isFetchingDetailed, setIsFetchingDetailed] = useState(false);

  const [highlight, setHighlight] = useState({ active: false, chartType: 'none', tech: 'Todos', metric: 'productivity', comment: '', week: '' });
  const [attention, setAttention] = useState({ active: false, chartType: 'none', tech: 'Todos', metric: 'productivity', comment: '', week: '' });
  
  const [ranking1, setRanking1] = useState({ active: false, metric: 'productivity' });
  const [ranking2, setRanking2] = useState({ active: false, metric: 'totalApprovedBudget' });

  // --- CONTROLES DO RODAPÉ (METAS E ALERTAS) ---
  const [showMetasBatidas, setShowMetasBatidas] = useState(true);
  const [showPontosAtencao, setShowPontosAtencao] = useState(true);
  const [showWeekHistory, setShowWeekHistory] = useState(true); // NOVO: Controle de exibição das semanas
  const [disabledMetaItems, setDisabledMetaItems] = useState([]);

  // --- NOVOS ESTADOS: ASSINATURAS ---
  const [showAssinaturas, setShowAssinaturas] = useState(false);
  const [assinaturaTipo, setAssinaturaTipo] = useState('manual'); 
  const [qtdAssinaturas, setQtdAssinaturas] = useState(1);
  const [assinaturas, setAssinaturas] = useState([{ id: 0, nome: 'Técnico 1', img: null }]);
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [currentSignerIndex, setCurrentSignerIndex] = useState(null);

  const toggleMetaItem = (metaName) => {
      setDisabledMetaItems(prev => 
          prev.includes(metaName) ? prev.filter(i => i !== metaName) : [...prev, metaName]
      );
  };

  const [pautas, setPautas] = useState([
      { id: 1, active: false, title: '', text: '' },
      { id: 2, active: false, title: '', text: '' },
      { id: 3, active: false, title: '', text: '' },
      { id: 4, active: false, title: '', text: '' },
      { id: 5, active: false, title: '', text: '' },
  ]);

  const updatePauta = (id, field, value) => {
      setPautas(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // --- LÓGICA DE ASSINATURAS ---
  useEffect(() => {
    setAssinaturas(prev => {
        const newArr = [...prev];
        if (qtdAssinaturas > prev.length) {
            for (let i = prev.length; i < qtdAssinaturas; i++) {
                newArr.push({ id: i, nome: `Técnico ${i + 1}`, img: null });
            }
        } else if (qtdAssinaturas < prev.length) {
            newArr.length = qtdAssinaturas;
        }
        return newArr;
    });
  }, [qtdAssinaturas]);

  const handleUpdateNomeAssinatura = (index, value) => {
      setAssinaturas(prev => prev.map((item, idx) => idx === index ? { ...item, nome: value } : item));
  };

  const handleOpenSignaturePad = (index) => {
      setCurrentSignerIndex(index);
      setIsSigDialogOpen(true);
  };

  const handleSaveSignature = (imgData) => {
      setAssinaturas(prev => prev.map((item, idx) => idx === currentSignerIndex ? { ...item, img: imgData } : item));
      setIsSigDialogOpen(false);
  };

  const handleClearSignature = (index) => {
    setAssinaturas(prev => prev.map((item, idx) => idx === index ? { ...item, img: null } : item));
  }

  // --- CONFIGURAÇÃO DE TODOS OS GRÁFICOS ---
  const [chartsConfig, setChartsConfig] = useState([
    { id: 'ltp_vd', name: 'LTP VD %', active: true, keys: [{ dataKey: 'LTP VD %', stroke: '#00C49F', name: 'LTP VD %' }], meta: [{ value: 12.8, stroke: '#ffc658', label: 'Meta 12.8%' }, { value: 5, stroke: '#FF0000', label: 'P4P 5%' }] },
    { id: 'ltp_da', name: 'LTP DA %', active: true, keys: [{ dataKey: 'LTP DA %', stroke: '#ff7300', name: 'LTP DA %' }], meta: [{ value: 17.4, stroke: '#00C49F', label: 'Meta 17.4%' }, { value: 7, stroke: '#FFD700', label: 'P4P 7%' }] },
    { id: 'ex_ltp_vd', name: 'EX LTP VD %', active: false, keys: [{ dataKey: 'EX LTP VD %', stroke: '#00C49F', name: 'EX LTP VD %' }], meta: { value: 1.44, stroke: '#FFCC00', label: 'Meta 1.44%' } },
    { id: 'ex_ltp_da', name: 'EX LTP DA %', active: false, keys: [{ dataKey: 'EX LPT DA %', stroke: '#CC0066', name: 'EX LTP DA %' }], meta: { value: 1.50, stroke: '#99FF00', label: 'Meta 1.50%' } },
    { id: 'rrr_vd', name: 'RRR VD %', active: true, keys: [{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }], meta: [{ value: 2.8, stroke: '#FFCC00', label: 'Meta 2.8%' }, { value: 1.5, stroke: '#008080', label: 'P4P 1.5%' }] },
    { id: 'rrr_da', name: 'RRR DA %', active: false, keys: [{ dataKey: 'RRR DA %', stroke: '#A52A2A', name: 'RRR DA %' }], meta: [{ value: 5, stroke: '#FF4500', label: 'Meta 5%' }, { value: 3, stroke: '#FFD700', label: 'P4P 3%' }] },
    { id: 'eco_repair', name: 'ECO REPAIR VD %', active: false, keys: [{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }], meta: { value: 90, stroke: '#FF5722', label: 'Meta 90%' } },
    { id: 'ftc_happy', name: 'FTC HAPPY CALL %', active: false, keys: [{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }], meta: { value: 88, stroke: '#FFEB3B', label: 'Meta 88%' } },
    { id: 'po_in_home', name: 'PO IN HOME D+1 %', active: false, keys: [{ dataKey: 'PO IN HOME D+1', stroke: '#00C49F', name: 'PO IN HOME D+1' }], meta: { value: 70, stroke: '#FFC107', label: 'Meta 70%' } },
    { id: 'first_visit', name: '1ST VISIT VD', active: false, keys: [{ dataKey: '1ST VISIT VD', stroke: '#FFBB28', name: '1ST VISIT VD' }], meta: { value: 20, stroke: '#FF0000', label: 'Meta 20%' } },
    { id: 'ih_d1', name: 'Perfect Agenda', active: false, keys: [{ dataKey: 'IN HOME D+1', stroke: '#00C49F', name: 'Perfect Agenda' }], meta: { value: 25, stroke: '#FF4081', label: 'Meta 25%' } },
    { id: 'r_tat', name: 'R-TAT (Geral)', active: false, keys: [{ dataKey: 'R-TAT', stroke: '#E91E63', name: 'R-TAT' }] },
    { id: 'r_tat_vd_ci', name: 'R-TAT VD CI', active: false, keys: [{ dataKey: 'R-TAT VD CI', stroke: '#9C27B0', name: 'R-TAT VD CI' }] },
    { id: 'r_tat_vd_ih', name: 'R-TAT VD IH', active: false, keys: [{ dataKey: 'R-TAT VD IH', stroke: '#00C49F', name: 'R-TAT VD IH' }] },
    { id: 'r_tat_da', name: 'R-TAT DA', active: false, keys: [{ dataKey: 'R-TAT DA', stroke: '#00C49F', name: 'R-TAT DA' }] },
    { id: 'rnps_vd', name: 'R-NPS VD', active: false, keys: [{ dataKey: 'R-NPS VD', stroke: '#00C49F', name: 'R-NPS VD' }], meta: { value: 80, stroke: '#9ACD32', label: 'Meta 80%' } },
    { id: 'rnps_da', name: 'R-NPS DA', active: false, keys: [{ dataKey: 'R-NPS DA', stroke: '#FF4500', name: 'R-NPS DA' }], meta: { value: 78, stroke: '#ADFF2F', label: 'Meta 78%' } },
  ]);

  const reportRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
        const qKpi = query(collection(db, 'kpis'), orderBy('week', 'asc'));
        const unsubKpi = onSnapshot(qKpi, (snap) => {
            const fetchedKpis = snap.docs.map(d => ({ name: `W${String(d.data().week).padStart(2,'0')}`, ...d.data() }));
            
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
            
            if (sortedKpis.length > 0) {
               const lastWeek = sortedKpis[sortedKpis.length - 1].week;
               if (!selectedWeek) setSelectedWeek(lastWeek);
               if (!highlight.week) setHighlight(prev => ({...prev, week: lastWeek}));
               if (!attention.week) setAttention(prev => ({...prev, week: lastWeek}));
            }
        });

        try {
            const snapTech = await getDocs(collection(db, 'technicianStats'));
            setTechnicians(snapTech.docs.map(d => d.id));
        } catch(e) { console.error(e); }
        return () => unsubKpi();
    };
    fetchData();
  }, []);

  const fetchDetailedDataForWeek = async (weekToFetch) => {
    if (!weekToFetch) return null;
    const range = getDateRangeOfWeek(weekToFetch);
    const dates = [];
    const start = new Date(range.start + "T00:00:00");
    const end = new Date(range.end + "T00:00:00");
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
        dates.push(dt.toISOString().split('T')[0]);
    }
    const newDataCache = {};
    const dailyAggregates = {};
    dates.forEach(d => dailyAggregates[d] = { date: d, os: 0, rev: 0, bud: 0 });
    for (const tech of technicians) {
       const techDailyData = [];
       for (const date of dates) {
           const samsungRef = collection(db, 'ordensDeServico', tech, 'osPorData', date, 'Samsung');
           const assurantRef = collection(db, 'ordensDeServico', tech, 'osPorData', date, 'Assurant');
           try {
               const [samsungSnap, assurantSnap] = await Promise.all([getDocs(samsungRef), getDocs(assurantRef)]);
               let dailyOS = 0; let dailyRev = 0; let dailyBud = 0;
               const processDocs = (snap) => {
                   snap.forEach(doc => {
                       const d = doc.data();
                       dailyOS++;
                       let val = parseFloat(d.valorOrcamento || 0);
                       if (isNaN(val)) val = 0;
                       if (val === 0 && d.observacoes) {
                           const match = d.observacoes.match(/R\$\s*([\d.,]+)/);
                           if (match) val = parseFloat(match[1].replace(',', '.')) || 0;
                       }
                       dailyRev += val;
                       if (val > 0) dailyBud++;
                   });
               };
               processDocs(samsungSnap);
               processDocs(assurantSnap);
               if (dailyAggregates[date]) {
                   dailyAggregates[date].os += dailyOS;
                   dailyAggregates[date].rev += dailyRev;
                   dailyAggregates[date].bud += dailyBud;
               }
               techDailyData.push({
                   name: date.split('-').slice(1).reverse().join('/'),
                   productivity: dailyOS,
                   adjustedProductivity: dailyOS > 0 ? (dailyBud / dailyOS) * 100 : 0,
                   totalApprovedBudget: dailyRev,
                   avgApprovedRevenue: dailyBud > 0 ? dailyRev / dailyBud : 0,
                   revenuePerOrder: dailyOS > 0 ? dailyRev / dailyOS : 0,
                   approvedCount: dailyBud 
               });
           } catch (e) { }
       }
       newDataCache[tech] = techDailyData;
    }
    newDataCache['Todos'] = dates.map(date => {
        const agg = dailyAggregates[date];
        return {
           name: date.split('-').slice(1).reverse().join('/'),
           productivity: agg.os,
           adjustedProductivity: agg.os > 0 ? (agg.bud / agg.os) * 100 : 0,
           totalApprovedBudget: agg.rev,
           avgApprovedRevenue: agg.bud > 0 ? agg.rev / agg.bud : 0,
           revenuePerOrder: agg.os > 0 ? agg.rev / agg.os : 0,
           approvedCount: agg.bud
        };
    });
    return { week: weekToFetch, data: newDataCache };
};

  useEffect(() => {
     const fetchAllNeeded = async () => {
         const weeksNeeded = new Set();
         if (selectedWeek) weeksNeeded.add(selectedWeek);
         if (highlight.active && highlight.chartType === 'detalhado' && highlight.week) weeksNeeded.add(highlight.week);
         if (attention.active && attention.chartType === 'detalhado' && attention.week) weeksNeeded.add(attention.week);
         if ((ranking1.active || ranking2.active) && selectedWeek) weeksNeeded.add(selectedWeek);

         const weeksToFetch = Array.from(weeksNeeded).filter(w => !detailedDataCache[w]);
         if (weeksToFetch.length > 0) {
             setIsFetchingDetailed(true);
             const results = await Promise.all(weeksToFetch.map(w => fetchDetailedDataForWeek(w)));
             setDetailedDataCache(prev => {
                 const newCache = { ...prev };
                 results.forEach(res => { if (res) newCache[res.week] = res.data; });
                 return newCache;
             });
             setIsFetchingDetailed(false);
         }
     };
     if (technicians.length > 0) fetchAllNeeded();
  }, [selectedWeek, highlight.week, attention.week, highlight.active, attention.active, ranking1.active, ranking2.active, technicians]);

  const getRankings = (metricToUse) => {
      if (!selectedWeek || !detailedDataCache[selectedWeek]) return [];
      const validTechs = technicians.filter(t => t !== 'Todos');
      const results = validTechs.map(tech => {
          const data = detailedDataCache[selectedWeek][tech] || [];
          let value = 0; let formattedValue = '';
          const totalOS = data.reduce((acc, item) => acc + (item.productivity || 0), 0);
          const totalBudget = data.reduce((acc, item) => acc + (item.totalApprovedBudget || 0), 0);
          const totalApprovedCount = data.reduce((acc, item) => acc + (item.approvedCount || 0), 0);

          if (metricToUse === 'productivity') {
              value = totalOS; formattedValue = `${value} OSs`;
          } else if (metricToUse === 'totalApprovedBudget') {
              value = totalBudget; formattedValue = `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          } else if (metricToUse === 'adjustedProductivity') {
              value = totalOS > 0 ? (totalApprovedCount / totalOS) * 100 : 0; formattedValue = `${value.toFixed(2)}%`;
          } else if (metricToUse === 'avgApprovedRevenue') {
              value = totalApprovedCount > 0 ? totalBudget / totalApprovedCount : 0; formattedValue = `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          } else if (metricToUse === 'revenuePerOrder') {
              value = totalOS > 0 ? totalBudget / totalOS : 0; formattedValue = `R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          }
          return { tech, value, formattedValue };
      });
      return results.sort((a, b) => b.value - a.value).slice(0, 3);
  };

  const getFilteredChartData = () => {
      if (!selectedWeek || kpiData.length === 0) return kpiData.slice(-12);
      const index = kpiData.findIndex(k => String(k.week) === String(selectedWeek));
      if (index === -1) return kpiData.slice(-12);
      const start = Math.max(0, index - 11);
      return kpiData.slice(start, index + 1);
  };
  const filteredKpiChartData = getFilteredChartData();

  const renderDetailedChart = (configState) => {
      const metricLabel = DETAILED_METRICS.find(m => m.value === configState.metric)?.label || configState.metric;
      const weekCache = detailedDataCache[configState.week];
      const data = weekCache ? weekCache[configState.tech] : [];
      const isBar = configState.metric === 'productivity';
      if (isFetchingDetailed && !weekCache) return <div className="loading-chart" style={{color: isLightMode ? '#666' : '#ccc'}}>Carregando dados...</div>;
      const weekStr = configState.week ? `W${String(configState.week).padStart(2, '0')}` : '';
      return <ReportChart data={data} title={`${metricLabel} - ${configState.tech}`} type={isBar ? 'bar' : 'line'} dataKeys={[{ dataKey: configState.metric, stroke: '#00C49F', name: metricLabel }]} isDetailed={true} periodLabel={weekStr} isLightMode={isLightMode} />;
  };

  const renderChartSelector = (chartId, configState) => {
      if (chartId === 'detalhado') return renderDetailedChart(configState);
      const config = chartsConfig.find(c => c.id === chartId);
      if (!config) return null;
      return <ReportChart data={filteredKpiChartData} title={config.name} dataKeys={config.keys} meta={config.meta} isLightMode={isLightMode} />;
  };

  const handleExportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    const domWidth = input.offsetWidth;
    const pdfPageHeightPx = (domWidth * 297) / 210;

    const gridContainer = input.querySelector('.pdf-charts-grid');
    const originalGridDisplay = gridContainer ? gridContainer.style.display : '';
    const originalGridGap = gridContainer ? gridContainer.style.gap : '';
    
    if (gridContainer) {
        gridContainer.style.display = 'flex';
        gridContainer.style.flexWrap = 'wrap';
        gridContainer.style.gap = '15px'; 
        gridContainer.style.alignContent = 'flex-start';
        
        const gridItems = input.querySelectorAll('.pdf-chart-item');
        gridItems.forEach(item => {
            item.style.width = '100%';
            item.style.flex = 'none';
            item.style.marginBottom = '20px'; 
        });
    }

    const elementsToCheck = Array.from(input.querySelectorAll('.pdf-header, .pdf-highlights-area, .pdf-ranking-section, .pdf-chart-item, .pdf-pauta-item, .pdf-footer-split, .pdf-signatures-section'));
    const originalMargins = [];

    let currentPageHeight = 0;
    const header = input.querySelector('.pdf-header');
    if (header) currentPageHeight += 56; 

    let elementsOnCurrentPage = [];

    elementsToCheck.forEach((el) => {
        const style = window.getComputedStyle(el);
        const elHeight = el.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        
        if (currentPageHeight + elHeight > pdfPageHeightPx) {
            const remainingSpace = pdfPageHeightPx - currentPageHeight;
            
            if (elementsOnCurrentPage.length > 0 && remainingSpace > 0) {
                const spacePerElement = remainingSpace / elementsOnCurrentPage.length;
                
                elementsOnCurrentPage.forEach(pageEl => {
                    const currentMb = parseFloat(pageEl.style.marginBottom || window.getComputedStyle(pageEl).marginBottom || 0);
                    const newMb = currentMb + spacePerElement;
                    if (!originalMargins.find(m => m.el === pageEl)) {
                        originalMargins.push({ el: pageEl, margin: pageEl.style.marginBottom });
                    }
                    pageEl.style.marginBottom = `${newMb}px`;
                });
            }
            currentPageHeight = 56 + elHeight; 
            elementsOnCurrentPage = [el];
            
        } else {
            currentPageHeight += elHeight;
            elementsOnCurrentPage.push(el);
        }
    });

    try {
        const canvas = await html2canvas(input, { 
            scale: 2, 
            backgroundColor: isLightMode ? '#ffffff' : '#1a1a1a', 
            useCORS: true,
            height: input.scrollHeight, windowHeight: input.scrollHeight, scrollY: 0
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const paintBackground = () => {
            if (isLightMode) {
                pdf.setFillColor(255, 255, 255);
            } else {
                pdf.setFillColor(26, 26, 26);
            }
            pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
        };

        paintBackground();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        let heightLeft = pdfHeight - pageHeight;
        while (heightLeft > 0) {
          const position = -(pageHeight * (pdf.internal.getNumberOfPages()));
          pdf.addPage();
          paintBackground();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        const fileName = `${reportTitle}${reportSubtitle ? ' - ' + reportSubtitle : ''}.pdf`;
        pdf.save(fileName);
    } catch (err) { console.error(err); }
    finally {
        originalMargins.forEach(({ el, margin }) => {
            el.style.marginBottom = margin;
        });
        
        if (gridContainer) {
            gridContainer.style.display = originalGridDisplay;
            gridContainer.style.flexWrap = '';
            gridContainer.style.gap = originalGridGap;
            gridContainer.style.alignContent = '';
        }
        const gridItems = input.querySelectorAll('.pdf-chart-item');
        gridItems.forEach(item => {
            item.style.width = '';
            item.style.flex = '';
            item.style.marginBottom = '';
        });
    }
  };

  const processMetaList = () => {
      if(filteredKpiChartData.length === 0) return { inMeta: [], outMeta: [] };
      
      const rules = [
          { key: 'LTP VD %', limit: 12.8, type: 'less', name: 'LTP VD' },
          { key: 'LTP DA %', limit: 17.4, type: 'less', name: 'LTP DA' },
          { key: 'EX LTP VD %', limit: 1.44, type: 'less', name: 'EX LTP VD' },
          { key: 'EX LPT DA %', limit: 1.50, type: 'less', name: 'EX LTP DA' },
          { key: 'RRR VD %', limit: 2.8, type: 'less', name: 'RRR VD' },
          { key: 'RRR DA %', limit: 5.0, type: 'less', name: 'RRR DA' },
          { key: 'ECO REPAIR VD', limit: 90, type: 'greater', name: 'ECO REPAIR VD' },
          { key: 'FTC HAPPY CALL', limit: 88, type: 'greater', name: 'FTC HAPPY CALL' },
          { key: 'PO IN HOME D+1', limit: 70, type: 'greater', name: 'PO IN HOME D+1' },
          { key: 'IN HOME D+1', limit: 25, type: 'greater', name: 'Perfect Agenda' },
          { key: '1ST VISIT VD', limit: 20, type: 'greater', name: '1st Visit' },
          { key: 'R-NPS VD', limit: 80, type: 'greater', name: 'R-NPS VD' },
          { key: 'R-NPS DA', limit: 78, type: 'greater', name: 'R-NPS DA' },
      ];

      const inMeta = []; const outMeta = [];
      const currentData = filteredKpiChartData[filteredKpiChartData.length - 1];

      rules.forEach(rule => {
          if(currentData[rule.key] === undefined || isNaN(parseFloat(currentData[rule.key]))) return;

          const lastValue = parseFloat(currentData[rule.key]);
          const isCurrentlyIn = rule.type === 'less' ? lastValue <= rule.limit : lastValue >= rule.limit;
          
          // NOVA LÓGICA: Calcula quantas semanas a métrica manteve o MESMO estado atual
          const weeks = calculateConsecutiveWeeksInCurrentState(filteredKpiChartData, rule.key, rule.type, rule.limit, isCurrentlyIn);
          
          // TEXTO CONDICIONAL COM BASE NO NOVO SLIDER
          let text = '';
          if (showWeekHistory) {
              const weekLabel = weeks === 1 ? 'semana' : 'semanas';
              text = weeks === 1 
                  ? `Nesta semana ${isCurrentlyIn ? 'dentro' : 'fora'} da meta`
                  : `Há ${weeks} ${weekLabel} ${isCurrentlyIn ? 'dentro' : 'fora'} da meta`;
          } else {
              text = isCurrentlyIn ? 'Dentro da meta' : 'Fora da meta';
          }

          const item = { name: rule.name, text, weeks, limit: rule.limit, value: lastValue };
          
          if(isCurrentlyIn) inMeta.push(item); else outMeta.push(item);
      });
      return { inMeta, outMeta };
  };
  
  const { inMeta, outMeta } = processMetaList();
  
  // FILTRO PARA O PDF: O PDF só vai mostrar o que não estiver na lista de "desativados"
  const inMetaFiltered = inMeta.filter(m => !disabledMetaItems.includes(m.name));
  const outMetaFiltered = outMeta.filter(m => !disabledMetaItems.includes(m.name));

  return (
    <div className="reports-page-container">
      {/* DIALOG DE ASSINATURA CONDICIONAL */}
      {showAssinaturas && assinaturaTipo === 'digital' && isSigDialogOpen && (
          <SignatureDialog 
            open={isSigDialogOpen} 
            onClose={() => setIsSigDialogOpen(false)} 
            onSave={handleSaveSignature} 
          />
      )}

      <div className="config-panel">
        <h2 className="config-title">Configuração</h2>

        {/* --- TEMA CLARO / ESCURO NO TOPO --- */}
        <div className="toggle-item small" style={{ marginBottom: '20px', background: isLightMode ? '#e0e0e0' : '#333' }}>
            <div className="toggle-header">
                <span style={{ color: isLightMode ? '#333' : '#fff', fontWeight: 'bold' }}>
                    {isLightMode ? 'Modo de Impressão (Claro)' : 'Modo Padrão (Escuro)'}
                </span>
                <label className="switch">
                    <input type="checkbox" checked={isLightMode} onChange={() => setIsLightMode(!isLightMode)} />
                    <span className="slider round"></span>
                </label>
            </div>
        </div>

        <div className="config-group">
            <label>Título e Subtítulo</label>
            <input type="text" placeholder="Título" value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={{marginBottom:'5px'}}/>
            <input type="text" placeholder="Subtítulo (Ex: W40)" value={reportSubtitle} onChange={e => setReportSubtitle(e.target.value)} />
        </div>
        <div className="config-group highlight-box-config">
            <label style={{color: '#00C49F'}}>Base de Dados (Semana)</label>
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                <option value="">Selecione...</option>
                {kpiData.map(k => <option key={k.week} value={k.week}>Semana {k.week}</option>)}
            </select>
        </div>
        
        <div className="config-divider">Layouts</div>
        <div className="toggle-item small">
             <div className="toggle-header">
                 <span>Layout Destaques</span>
                 <div className="layout-slider-container">
                    <span className={highlightLayout === 'side-by-side' ? 'active' : ''}>Lado a Lado</span>
                    <label className="switch">
                        <input type="checkbox" checked={highlightLayout === 'full-width'} onChange={() => setHighlightLayout(prev => prev === 'side-by-side' ? 'full-width' : 'side-by-side')} />
                        <span className="slider round"></span>
                    </label>
                    <span className={highlightLayout === 'full-width' ? 'active' : ''}>Total</span>
                 </div>
             </div>
        </div>

        <div className="config-divider">Destaques</div>
        <div className="toggle-item">
            <div className="toggle-header">
                <span>Destaque Semanal</span>
                <label className="switch">
                    <input type="checkbox" checked={highlight.active} onChange={() => setHighlight({...highlight, active: !highlight.active})} />
                    <span className="slider round"></span>
                </label>
            </div>
            {highlight.active && (
                <div className="toggle-content fade-in">
                    <select value={highlight.chartType} onChange={(e) => setHighlight({...highlight, chartType: e.target.value})}>
                        <option value="none">Selecione o Gráfico...</option>
                        {chartsConfig.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="detalhado">Relatório Detalhado</option>
                    </select>
                    {highlight.chartType === 'detalhado' && (
                        <div className="detailed-filters-col">
                             <select value={highlight.week} onChange={(e) => setHighlight({...highlight, week: e.target.value})} className="highlight-week-select">
                                <option value="">Semana do Relatório...</option>
                                {kpiData.map(k => <option key={k.week} value={k.week}>Semana {k.week}</option>)}
                             </select>
                             <div className="detailed-filters">
                                <select value={highlight.tech} onChange={e => setHighlight({...highlight, tech: e.target.value})}><option value="Todos">Todos</option>{technicians.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={highlight.metric} onChange={e => setHighlight({...highlight, metric: e.target.value})}>{DETAILED_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                             </div>
                        </div>
                    )}
                    <textarea rows="2" placeholder="Comentário..." value={highlight.comment} onChange={e => setHighlight({...highlight, comment: e.target.value})} />
                </div>
            )}
        </div>
        
        <div className="toggle-item">
            <div className="toggle-header">
                <span>Ponto de Atenção</span>
                <label className="switch">
                    <input type="checkbox" checked={attention.active} onChange={() => setAttention({...attention, active: !attention.active})} />
                    <span className="slider round"></span>
                </label>
            </div>
            {attention.active && (
                <div className="toggle-content fade-in">
                     <select value={attention.chartType} onChange={(e) => setAttention({...attention, chartType: e.target.value})}>
                        <option value="none">Selecione o Gráfico...</option>
                        {chartsConfig.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        <option value="detalhado">Relatório Detalhado</option>
                    </select>
                    {attention.chartType === 'detalhado' && (
                         <div className="detailed-filters-col">
                             <select value={attention.week} onChange={(e) => setAttention({...attention, week: e.target.value})} className="highlight-week-select">
                                <option value="">Semana do Relatório...</option>
                                {kpiData.map(k => <option key={k.week} value={k.week}>Semana {k.week}</option>)}
                             </select>
                             <div className="detailed-filters">
                                <select value={attention.tech} onChange={e => setAttention({...attention, tech: e.target.value})}><option value="Todos">Todos</option>{technicians.map(t => <option key={t} value={t}>{t}</option>)}</select>
                                <select value={attention.metric} onChange={e => setAttention({...attention, metric: e.target.value})}>{DETAILED_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
                             </div>
                        </div>
                    )}
                    <textarea rows="2" placeholder="Comentário..." value={attention.comment} onChange={e => setAttention({...attention, comment: e.target.value})} />
                </div>
            )}
        </div>

        <div className="toggle-item">
            <div className="toggle-header">
                <span>Ranking Top 3 - #1</span>
                <label className="switch">
                    <input type="checkbox" checked={ranking1.active} onChange={() => setRanking1({...ranking1, active: !ranking1.active})} />
                    <span className="slider round"></span>
                </label>
            </div>
            {ranking1.active && (
                <div className="toggle-content fade-in">
                    <label style={{fontSize: '12px', color: '#888'}}>Critério (Semana {selectedWeek}):</label>
                    <select value={ranking1.metric} onChange={(e) => setRanking1({...ranking1, metric: e.target.value})}>
                        {DETAILED_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            )}
        </div>

        <div className="toggle-item">
            <div className="toggle-header">
                <span>Ranking Top 3 - #2</span>
                <label className="switch">
                    <input type="checkbox" checked={ranking2.active} onChange={() => setRanking2({...ranking2, active: !ranking2.active})} />
                    <span className="slider round"></span>
                </label>
            </div>
            {ranking2.active && (
                <div className="toggle-content fade-in">
                    <label style={{fontSize: '12px', color: '#888'}}>Critério (Semana {selectedWeek}):</label>
                    <select value={ranking2.metric} onChange={(e) => setRanking2({...ranking2, metric: e.target.value})}>
                        {DETAILED_METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            )}
        </div>

        <div className="config-divider">KPIs Gerais</div>
        {chartsConfig.map(chart => (
            <div key={chart.id} className="toggle-item small">
                    <div className="toggle-header">
                    <span>{chart.name}</span>
                    <label className="switch">
                        <input type="checkbox" checked={chart.active} onChange={() => {
                            setChartsConfig(prev => prev.map(c => c.id === chart.id ? {...c, active: !c.active} : c));
                        }} />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>
        ))}

        <div className="config-divider">Pautas da Reunião</div>
        {pautas.map((pauta) => (
            <div key={pauta.id} className="toggle-item">
                <div className="toggle-header">
                    <span>Pauta {pauta.id}</span>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={pauta.active} 
                            onChange={(e) => updatePauta(pauta.id, 'active', e.target.checked)} 
                        />
                        <span className="slider round"></span>
                    </label>
                </div>
                {pauta.active && (
                    <div className="toggle-content fade-in">
                        <input 
                            type="text" 
                            placeholder="Título da Pauta" 
                            value={pauta.title}
                            onChange={(e) => updatePauta(pauta.id, 'title', e.target.value)}
                            style={{marginBottom: '10px'}}
                        />
                        <textarea 
                            rows="4" 
                            placeholder="Descrição da pauta, ata ou observações..." 
                            value={pauta.text}
                            onChange={(e) => updatePauta(pauta.id, 'text', e.target.value)}
                        />
                    </div>
                )}
            </div>
        ))}

        <div className="config-divider">Rodapé (Metas e Alertas)</div>

        {/* --- NOVO SLIDER: Histórico de Semanas --- */}
        <div className="toggle-item small">
            <div className="toggle-header">
                <span style={{color: '#fff'}}>Mostrar histórico de semanas</span>
                <label className="switch">
                    <input type="checkbox" checked={showWeekHistory} onChange={() => setShowWeekHistory(!showWeekHistory)} />
                    <span className="slider round"></span>
                </label>
            </div>
        </div>
        
        {/* --- METAS BATIDAS --- */}
        <div className="toggle-item">
            <div className="toggle-header">
                <span style={{color: '#00C49F'}}>Mostrar Metas Batidas no PDF</span>
                <label className="switch">
                    <input type="checkbox" checked={showMetasBatidas} onChange={() => setShowMetasBatidas(!showMetasBatidas)} />
                    <span className="slider round"></span>
                </label>
            </div>
            {showMetasBatidas && (
                <div className="toggle-content fade-in" style={{ padding: '10px 0' }}>
                    <p style={{fontSize:'12px', color:'#888', marginBottom:'10px'}}>Clique para ocultar do relatório:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {inMeta.map((m, idx) => {
                            const isChecked = !disabledMetaItems.includes(m.name);
                            return (
                                <div key={idx} onClick={() => toggleMetaItem(m.name)} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', padding: '10px', 
                                    borderRadius: '6px', cursor: 'pointer',
                                    border: isChecked ? '1px solid #00C49F' : '1px solid transparent',
                                    transition: 'all 0.2s', userSelect: 'none'
                                }}>
                                    <span style={{fontSize: '12px', color: '#fff'}}>{m.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        {/* --- PONTOS DE ATENÇÃO --- */}
        <div className="toggle-item">
            <div className="toggle-header">
                <span style={{color: '#FF4500'}}>Mostrar Pontos de Atenção no PDF</span>
                <label className="switch">
                    <input type="checkbox" checked={showPontosAtencao} onChange={() => setShowPontosAtencao(!showPontosAtencao)} />
                    <span className="slider round"></span>
                </label>
            </div>
            {showPontosAtencao && (
                <div className="toggle-content fade-in" style={{ padding: '10px 0' }}>
                    <p style={{fontSize:'12px', color:'#888', marginBottom:'10px'}}>Clique para ocultar do relatório:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {outMeta.map((m, idx) => {
                            const isChecked = !disabledMetaItems.includes(m.name);
                            return (
                                <div key={idx} onClick={() => toggleMetaItem(m.name)} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', padding: '10px', 
                                    borderRadius: '6px', cursor: 'pointer',
                                    border: isChecked ? '1px solid #FF4500' : '1px solid transparent',
                                    transition: 'all 0.2s', userSelect: 'none'
                                }}>
                                    <span style={{fontSize: '12px', color: '#fff'}}>{m.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>

        <div className="config-divider">Assinaturas</div>
        <div className="toggle-item">
            <div className="toggle-header">
                <span>Ativar Assinaturas</span>
                <label className="switch">
                    <input type="checkbox" checked={showAssinaturas} onChange={() => setShowAssinaturas(!showAssinaturas)} />
                    <span className="slider round"></span>
                </label>
            </div>
            {showAssinaturas && (
                <div className="toggle-content fade-in">
                    <div className="toggle-header" style={{ marginBottom: '15px' }}>
                        <span style={{ fontSize: '12px', color: '#888' }}>
                            {assinaturaTipo === 'manual' ? 'Assinatura Manual' : 'Assinatura Digital'}
                        </span>
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={assinaturaTipo === 'digital'} 
                                onChange={() => setAssinaturaTipo(prev => prev === 'manual' ? 'digital' : 'manual')} 
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>Quantidade de Assinaturas:</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="6" 
                            value={qtdAssinaturas} 
                            onChange={(e) => setQtdAssinaturas(Number(e.target.value))}
                            style={{ width: '100%', padding: '5px' }}
                        />
                    </div>

                    {assinaturas.map((sig, idx) => (
                        <div key={idx} style={{ marginBottom: '10px', background: '#333', padding: '10px', borderRadius: '4px' }}>
                            <input 
                                type="text" 
                                placeholder="Nome do Técnico/Gestor" 
                                value={sig.nome}
                                onChange={(e) => handleUpdateNomeAssinatura(idx, e.target.value)}
                                style={{ marginBottom: assinaturaTipo === 'digital' ? '10px' : '0' }}
                            />
                            {assinaturaTipo === 'digital' && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button 
                                        onClick={() => handleOpenSignaturePad(idx)} 
                                        style={{ background: sig.img ? '#2E8B57' : '#00C49F', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', flex: 1 }}
                                    >
                                        {sig.img ? 'Refazer Assinatura' : 'Assinar Digitalmente'}
                                    </button>
                                    {sig.img && (
                                        <button 
                                            onClick={() => handleClearSignature(idx)}
                                            style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                        >
                                            Limpar
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button className="btn-generate" onClick={handleExportPDF}>GERAR PDF</button>
      </div>

      <div className="preview-panel custom-scrollbar">
        {/* --- PDF SHEET: Estilos condicionais para Light Mode --- */}
        <div ref={reportRef} className="pdf-sheet" style={{ background: isLightMode ? '#ffffff' : '#1a1a1a', color: isLightMode ? '#333' : '#fff' }}>
            <div className="pdf-header">
                <div className="header-title-row">
                    <h1 style={{ color: isLightMode ? '#000' : '#fff' }}>{reportTitle || 'Relatório de Performance'}</h1>
                    {reportSubtitle && <span className="header-subtitle" style={{ color: isLightMode ? '#666' : '#bbb' }}>{reportSubtitle}</span>}
                </div>
            </div>

            {(highlight.active || attention.active) && (
                <div className={`pdf-highlights-area ${highlightLayout}`}>
                    {highlight.active && (
                        <div className="highlight-card success" style={{ 
                            background: isLightMode ? 'transparent' : undefined, 
                            border: isLightMode ? '1px solid #00C49F' : undefined,
                            boxShadow: isLightMode ? 'none' : undefined 
                        }}>
                            <div className="card-header-bar" style={{ background: isLightMode ? '#00C49F' : undefined, color: isLightMode ? '#fff' : undefined }}>★ Destaque Semanal</div>
                            <div className="card-body">
                                {renderChartSelector(highlight.chartType, highlight)}
                                {highlight.comment && <div className="card-comment" style={{ background: isLightMode ? '#e8f5e9' : undefined, color: isLightMode ? '#2e7d32' : undefined }}>{highlight.comment}</div>}
                            </div>
                        </div>
                    )}
                    {attention.active && (
                        <div className="highlight-card danger" style={{ 
                            background: isLightMode ? 'transparent' : undefined, 
                            border: isLightMode ? '1px solid #FF4500' : undefined,
                            boxShadow: isLightMode ? 'none' : undefined 
                        }}>
                            <div className="card-header-bar" style={{ background: isLightMode ? '#FF4500' : undefined, color: isLightMode ? '#fff' : undefined }}>⚠ Ponto de Atenção</div>
                            <div className="card-body">
                                {renderChartSelector(attention.chartType, attention)}
                                {attention.comment && <div className="card-comment" style={{ background: isLightMode ? '#ffebee' : undefined, color: isLightMode ? '#c62828' : undefined }}>{attention.comment}</div>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {ranking1.active && (
                <div className="pdf-ranking-section">
                     <RankingPodium 
                        rankings={getRankings(ranking1.metric)} 
                        metricLabel={DETAILED_METRICS.find(m => m.value === ranking1.metric)?.label} 
                        isLightMode={isLightMode}
                     />
                </div>
            )}
            {ranking2.active && (
                <div className="pdf-ranking-section">
                     <RankingPodium 
                        rankings={getRankings(ranking2.metric)} 
                        metricLabel={DETAILED_METRICS.find(m => m.value === ranking2.metric)?.label} 
                        isLightMode={isLightMode}
                     />
                </div>
            )}

            <div className={`pdf-charts-grid ${generalLayout}`}>
                {chartsConfig.filter(c => c.active).map(chart => (
                    // In-line styles here specifically wipe out any background/border from external CSS
                    <div key={chart.id} className="pdf-chart-item" style={isLightMode ? { background: 'transparent', border: '0px', boxShadow: 'none' } : {}}>
                        <ReportChart data={filteredKpiChartData} title={chart.name} dataKeys={chart.keys} meta={chart.meta} isLightMode={isLightMode} />
                    </div>
                ))}
            </div>

            <div className="pdf-pautas-container">
                {pautas.map(pauta => pauta.active && (
                    <div key={pauta.id} className="pdf-pauta-item">
                        <h4 style={{color: '#00C49F', borderBottom: isLightMode ? '1px solid #ddd' : '1px solid #444', paddingBottom: '5px', marginBottom: '10px'}}>
                            {pauta.title || `Pauta ${pauta.id}`}
                        </h4>
                        <p style={{whiteSpace: 'pre-wrap', color: isLightMode ? '#333' : '#ccc', fontSize: '14px', lineHeight: '1.5'}}>
                            {pauta.text}
                        </p>
                    </div>
                ))}
            </div>

            {/* --- RODAPÉ NO PDF --- */}
            {(showMetasBatidas || showPontosAtencao) && (
                <div className="pdf-footer-split">
                    {showMetasBatidas && (
                        <div className="footer-col footer-left-success" style={{width: showPontosAtencao ? '50%' : '100%', background: isLightMode ? 'transparent' : undefined}}>
                            <h4>🎯 METAS BATIDAS</h4>
                            {inMetaFiltered.length > 0 ? (
                                <div className="meta-list">
                                    {inMetaFiltered.map((m, i) => (
                                        <div key={i} className="meta-item success" style={{ 
                                            background: isLightMode ? '#e8f5e9' : '#1e3323', 
                                            color: isLightMode ? '#2e7d32' : '#4caf50',
                                            border: isLightMode ? '1px solid #a5d6a7' : 'none'
                                        }}>
                                            <strong style={{ color: isLightMode ? '#1b5e20' : '#fff' }}>{m.name}</strong>: {m.text} <small>(Valor: {m.value.toFixed(2)}{m.limit <= 100 ? '%' : ''})</small>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="meta-empty" style={{ color: isLightMode ? '#888' : undefined }}>Nenhuma meta batida (ou todas ocultas).</p>}
                        </div>
                    )}

                    {showPontosAtencao && (
                        <div className="footer-col footer-right-alert" style={{width: showMetasBatidas ? '50%' : '100%', background: isLightMode ? 'transparent' : undefined}}>
                            <h4>⚠ PONTOS DE ATENÇÃO</h4>
                            {outMetaFiltered.length > 0 ? (
                                <div className="meta-list">
                                    {outMetaFiltered.map((m, i) => (
                                        <div key={i} className="meta-item alert" style={{ 
                                            background: isLightMode ? '#ffebee' : '#331e1e', 
                                            color: isLightMode ? '#c62828' : '#ff4500',
                                            border: isLightMode ? '1px solid #ffcdd2' : 'none'
                                        }}>
                                            <strong style={{ color: isLightMode ? '#b71c1c' : '#fff' }}>{m.name}</strong>: {m.text} <small>(Valor: {m.value.toFixed(2)}{m.limit <= 100 ? '%' : ''} | Meta: {m.limit}{m.limit <= 100 ? '%' : ''})</small>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="meta-empty" style={{ color: isLightMode ? '#888' : undefined }}>Nenhum ponto de atenção (ou todos ocultos).</p>}
                        </div>
                    )}
                </div>
            )}

            {showAssinaturas && (
                <div className="pdf-signatures-section" style={{ marginTop: '40px', paddingTop: '20px', borderTop: isLightMode ? '1px solid #ddd' : '1px solid #444', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: isLightMode ? '#666' : '#ccc', marginBottom: '40px', fontStyle: 'italic' }}>
                        "Estou ciente e concordo com as informações e dados aqui apresentados."
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '30px' }}>
                        {assinaturas.map((sig, idx) => (
                            <div key={idx} style={{ minWidth: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                {/* Espaço da Assinatura */}
                                {assinaturaTipo === 'digital' && sig.img ? (
                                    <img src={sig.img} alt={`Assinatura ${sig.nome}`} style={{ height: '50px', objectFit: 'contain', marginBottom: '5px' }} />
                                ) : (
                                    <div style={{ height: '55px' }}></div> 
                                )}
                                
                                {/* Linha e Nome */}
                                <div style={{ width: '100%', borderTop: isLightMode ? '1px solid #888' : '1px solid #888', paddingTop: '5px', marginTop: 'auto' }}>
                                    <span style={{ color: isLightMode ? '#000' : '#fff', fontWeight: 'bold', fontSize: '14px' }}>{sig.nome}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ReportsConfigPage;