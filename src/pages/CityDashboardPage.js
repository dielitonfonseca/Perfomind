// src/pages/CityDashboardPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label } from 'recharts';
import { ArrowLeft } from 'lucide-react';
import '../App.css';

// --- ESTILOS CSS GLOBAIS (Copiados do Dashboard Principal) ---
const globalStyles = `
  :root {
    --theme-color: #00C49F;
    --theme-bg: #222;
    --theme-input-bg: #333;
  }

  .dashboard-container {
    width: 100%;
    max-width: 100vw; 
    overflow-x: hidden; 
    box-sizing: border-box;
    padding-bottom: 50px; 
  }

  .dashboard-section {
    width: 100%;
    box-sizing: border-box; 
  }

  /* Tooltip Style Padronizado */
  .custom-tooltip {
    background-color: #333;
    border: 1px solid #555;
    padding: 10px;
    border-radius: 5px;
    color: #fff;
    font-size: 0.8em;
  }
  .custom-tooltip .label {
    font-weight: bold;
    margin-bottom: 5px;
    color: #ccc;
  }
  .custom-tooltip p {
    margin: 0;
  }

  @media (max-width: 768px) {
    .dashboard-section {
        margin-top: 10px !important;
        padding: 10px !important;
        width: 100%;
        overflow: hidden; 
    }
  }
`;

// --- TOOLTIP IDÊNTICO AO PRINCIPAL ---
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
          // Busca pelas Quantidades Ocultas
          const qtdKeys = {
            'LTP VD %': 'LTP VD QTD',
            'LTP DA %': 'LTP DA QTD',
            'EX LTP VD %': 'EX LTP VD QTD',
            'EX LPT DA %': 'EX LRP DA QTD',
            'RRR VD %': 'RRR VD QTD',
            'RRR DA %': 'RRR DA QTD'
          };
          
          if (qtdKeys[name] && dataPoint[qtdKeys[name]] !== undefined) {
             displayValue += ` (QTD: ${dataPoint[qtdKeys[name]]})`;
          }

          return <p key={`item-${index}`}>{`${name}: ${displayValue}`}</p>;
        })}
      </div>
    );
  }
  return null;
};

// --- COMPONENTE DE GRÁFICO IDÊNTICO AO PRINCIPAL ---
const KPIChart = ({ data, title, dataKeys, meta, tooltipContent, yAxisDomain = [0, 'auto'] }) => {
  if (!data || data.length === 0) {
    return <p className="no-data-message" style={{ textAlign: 'center', color: '#888' }}>Nenhum dado de "{title}" encontrado.</p>;
  }

  return (
    <div className="kpi-chart-container" style={{ width: '100%', overflow: 'hidden' }}>
      <h3>{title} </h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 25, right: 80, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
            <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={yAxisDomain} />
            <Tooltip content={tooltipContent} />
            <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
            {dataKeys.map((key) => (
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


function CityDashboardPage() {
    const { city } = useParams();
    const navigate = useNavigate();
    const [kpiData, setKpiData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    // Ajuste de redimensionamento de tela
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getCurrentWeekNumber = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    useEffect(() => {
        if (!city) return;
        setLoading(true);
        const kpisRef = collection(db, 'kpis_cities', city, 'records');
        const qKpis = query(kpisRef, orderBy('week', 'asc'));

        const unsubscribe = onSnapshot(qKpis, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({
                id: doc.id,
                name: `W ${String(doc.data().week).padStart(2, '0')}`,
                week: parseInt(doc.data().week, 10),
                timestamp: doc.data().timestamp,
                ...doc.data(),
            }));

            const uniqueMap = new Map();
            fetched.forEach(kpi => {
                if (!uniqueMap.has(kpi.week)) {
                    uniqueMap.set(kpi.week, kpi);
                } else {
                    const existing = uniqueMap.get(kpi.week);
                    if (kpi.timestamp && existing.timestamp && typeof kpi.timestamp.toMillis === 'function') {
                        if (kpi.timestamp.toMillis() > existing.timestamp.toMillis()) uniqueMap.set(kpi.week, kpi);
                    } else {
                        uniqueMap.set(kpi.week, kpi);
                    }
                }
            });
            let sortedKpis = Array.from(uniqueMap.values());

            const currentWeek = getCurrentWeekNumber();
            const threshold = currentWeek + 4;
            sortedKpis.sort((a, b) => {
                const scoreA = a.week > threshold ? a.week : a.week + 52;
                const scoreB = b.week > threshold ? b.week : b.week + 52;
                return scoreA - scoreB;
            });

            setKpiData(sortedKpis);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [city]);

    const chartData = kpiData.slice(-10);

    const ltpvdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'LTP VD %': parseFloat(d['LTP VD %']), 'LTP VD QTD': parseFloat(d['LTP VD QTD']) })), [chartData]);
    const ltpdaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'LTP DA %': parseFloat(d['LTP DA %']), 'LTP DA QTD': parseFloat(d['LTP DA QTD']) })), [chartData]);
    const exltpvdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'EX LTP VD %': parseFloat(d['EX LTP VD %']), 'EX LTP VD QTD': parseFloat(d['EX LTP VD QTD']) })), [chartData]);
    const exltpdaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'EX LPT DA %': parseFloat(d['EX LPT DA %']), 'EX LRP DA QTD': parseFloat(d['EX LRP DA QTD']) })), [chartData]);
    const rrrVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'RRR VD %': parseFloat(d['RRR VD %']), 'RRR VD QTD': parseFloat(d['RRR VD QTD']) })), [chartData]);
    const rrrDaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'RRR DA %': parseFloat(d['RRR DA %']), 'RRR DA QTD': parseFloat(d['RRR DA QTD']) })), [chartData]);
    const ecoRepairVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'ECO REPAIR VD': parseFloat(d['ECO REPAIR VD']) })), [chartData]);
    const ftcHappyCallChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'FTC HAPPY CALL': parseFloat(d['FTC HAPPY CALL']) })), [chartData]);
    const poInHomeD1ChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'PO IN HOME D+1': parseFloat(d['PO IN HOME D+1']) })), [chartData]);
    const firstVisitVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, '1ST VISIT VD': parseFloat(d['1ST VISIT VD']) })), [chartData]);
    const inHomeD1ChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'Perfect Agenda': parseFloat(d['IN HOME D+1']) })), [chartData]); 
    const rTatChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT': parseFloat(d['R-TAT']) })), [chartData]);
    const rTatVdCiChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT VD CI': parseFloat(d['R-TAT VD CI']) })), [chartData]);
    const rTatVdIhChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT VD IH': parseFloat(d['R-TAT VD IH']) })), [chartData]);
    const rTatDaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-TAT DA': parseFloat(d['R-TAT DA']) })), [chartData]);
    const rnpsVdChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-NPS VD': parseFloat(d['R-NPS VD']) })), [chartData]);
    const rnpsDaChartData = useMemo(() => chartData.map(d => ({ name: d.name, 'R-NPS DA': parseFloat(d['R-NPS DA']) })), [chartData]);

    if (loading) return <div className="no-data-message" style={{ marginTop: '50px' }}>A carregar Dashboard de {city}...</div>;

    return (
        <div className="output dashboard-container">
            <style>{globalStyles}</style>

            <div className="dashboard-section" style={{ marginTop: '20px', padding: '20px', background: '#222', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <button className="btn-pill" style={{ background: '#333', padding: '10px' }} onClick={() => navigate('/acesso-kpis')}>
                        <ArrowLeft size={20} />
                    </button>
                    <h3 style={{ color: '#00C49F', margin: 0 }}>📍 KPIs de Desempenho Regional: {city}</h3>
                </div>

                <div className={`kpi-grid ${isMobile ? 'mobile' : ''}`}>
                    <KPIChart data={ltpvdChartData} title=" LTP VD % ⬇️" dataKeys={[{ dataKey: 'LTP VD %', stroke: '#00C49F', name: 'LTP VD %' }]} meta={[{ value: 12.8, stroke: '#ffc658', label: 'Meta: 12.8%' }, { value: 5, stroke: '#FF0000', label: 'P4P: 5%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 40]} />
                    <KPIChart data={ltpdaChartData} title=" LTP DA % ⬇️" dataKeys={[{ dataKey: 'LTP DA %', stroke: '#ff7300', name: 'LTP DA %' }]} meta={[{ value: 17.4, stroke: '#00C49F', label: 'Meta: 17.4%' }, { value: 7, stroke: '#FFD700', label: 'P4P: 7%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 40]} />
                    <KPIChart data={exltpvdChartData} title=" EX LTP VD % ⬇️" dataKeys={[{ dataKey: 'EX LTP VD %', stroke: '#00C49F', name: 'EX LTP VD %' }]} meta={{ value: 1.44, stroke: '#FFCC00', label: 'Meta: 1.44%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 10]} />
                    <KPIChart data={exltpdaChartData} title=" EX LTP DA % ⬇️" dataKeys={[{ dataKey: 'EX LPT DA %', stroke: '#CC0066', name: 'EX LTP DA %' }]} meta={{ value: 1.50, stroke: '#99FF00', label: 'Meta: 1.50%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 10]} />
                    <KPIChart data={rrrVdChartData} title=" RRR VD % ⬇️" dataKeys={[{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }]} meta={[{ value: 2.8, stroke: '#FFCC00', label: 'Meta: 2.8%' }, { value: 1.5, stroke: '#008080', label: 'P4P: 1.5%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 15]} />
                    <KPIChart data={rrrDaChartData} title=" RRR DA % ⬇️" dataKeys={[{ dataKey: 'RRR DA %', stroke: '#A52A2A', name: 'RRR DA %' }]} meta={[{ value: 5, stroke: '#FF4500', label: 'Meta: 5%' }, { value: 3, stroke: '#FFD700', label: 'P4P: 3%' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 15]} />
                    <KPIChart data={ecoRepairVdChartData} title=" ECO REPAIR VD % ⬆️" dataKeys={[{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }]} meta={{ value: 90, stroke: '#FF5722', label: 'Meta: 90%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
                    <KPIChart data={ftcHappyCallChartData} title=" FTC HAPPY CALL % ⬆️" dataKeys={[{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }]} meta={{ value: 88, stroke: '#FFEB3B', label: 'Meta: 88%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
                    <KPIChart data={poInHomeD1ChartData} title=" PO IN HOME D+1 % ⬆️" dataKeys={[{ dataKey: 'PO IN HOME D+1', stroke: '#00C49F', name: 'PO IN HOME D+1' }]} meta={{ value: 70, stroke: '#FFC107', label: 'Meta: 70%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
                    <KPIChart data={firstVisitVdChartData} title=" 1ST VISIT VD % ⬆️" dataKeys={[{ dataKey: '1ST VISIT VD', stroke: '#FFBB28', name: '1ST VISIT VD' }]} meta={{ value: 20, stroke: '#FF0000', label: 'Meta: 20%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
                    <KPIChart data={inHomeD1ChartData} title=" Perfect Agenda % ⬆️" dataKeys={[{ dataKey: 'Perfect Agenda', stroke: '#00C49F', name: 'Perfect Agenda' }]} meta={{ value: 25, stroke: '#FF4081', label: 'Meta: 25%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 50]} />
                    <KPIChart data={rTatChartData} title=" R-TAT (Geral) ⬇️" dataKeys={[{ dataKey: 'R-TAT', stroke: '#E91E63', name: 'R-TAT' }]} tooltipContent={<CustomTooltip />} />
                    <KPIChart data={rTatVdCiChartData} title=" R-TAT VD CI ⬇️" dataKeys={[{ dataKey: 'R-TAT VD CI', stroke: '#9C27B0', name: 'R-TAT VD CI' }]} tooltipContent={<CustomTooltip />} />
                    <KPIChart data={rTatVdIhChartData} title=" R-TAT VD IH ⬇️" dataKeys={[{ dataKey: 'R-TAT VD IH', stroke: '#00C49F', name: 'R-TAT VD IH' }]} tooltipContent={<CustomTooltip />} />
                    <KPIChart data={rTatDaChartData} title=" R-TAT DA ⬇️" dataKeys={[{ dataKey: 'R-TAT DA', stroke: '#00C49F', name: 'R-TAT DA' }]} tooltipContent={<CustomTooltip />} />
                    <KPIChart data={rnpsVdChartData} title=" R-NPS VD % ⬆️" dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#00C49F', name: 'R-NPS VD' }]} meta={{ value: 80, stroke: '#9ACD32', label: 'Meta: 80%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
                    <KPIChart data={rnpsDaChartData} title=" R-NPS DA % ⬆️" dataKeys={[{ dataKey: 'R-NPS DA', stroke: '#FF4500', name: 'R-NPS DA' }]} meta={{ value: 78, stroke: '#ADFF2F', label: 'Meta: 78%' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
                </div>
            </div>
        </div>
    );
}

export default CityDashboardPage;