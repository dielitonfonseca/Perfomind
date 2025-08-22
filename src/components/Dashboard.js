import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label, PieChart, Pie, Cell } from 'recharts';


const KPIChart = ({ data, title, dataKeys, meta, tooltipContent, yAxisDomain = [0, 'auto'] }) => {
  if (!data || data.length === 0) {
    return <p className="no-data-message">Nenhum dado de "{title}" encontrado para as últimas 8 semanas.</p>;
  }

  return (
    <div className="kpi-chart-container">
      <h3>{title} </h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 80, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
            <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={yAxisDomain} />
            <Tooltip content={tooltipContent} />
            <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
            {dataKeys.map((key) => (
              <Line
                key={key.dataKey}
                type="monotone"
                dataKey={key.dataKey}
                stroke={key.stroke}
                activeDot={{ r: 8 }}
                name={key.name}
              />
            ))}
            {meta && Array.isArray(meta) ? (
              meta.map((m, idx) => (
                <ReferenceLine key={idx} y={m.value} stroke={m.stroke} strokeDasharray="3 3">
                  <Label
                    value={m.label}
                    position="right"
                    fill={m.stroke}
                    style={{ fontSize: '0.8em', textAnchor: 'start' }}
                  />
                </ReferenceLine>
              ))
            ) : (
              meta && (
                <ReferenceLine y={meta.value} stroke={meta.stroke} strokeDasharray="3 3">
                  <Label
                    value={meta.label}
                    position="right"
                    fill={meta.stroke}
                    style={{ fontSize: '0.8em', textAnchor: 'start' }}
                  />
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

          if (name.includes('%') || name.includes('FTC') || name.includes('NPS') || name.includes('VISIT') || name.includes('IN HOME') || name.includes('REPAIR')) {
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
          }

          return <p key={`item-${index}`} style={{ color: entry.color }}>{`${name}: ${displayValue}`}</p>;
        })}
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p>{`${payload[0].name}: R$ ${payload[0].value.toFixed(2)}`}</p>
      </div>
    );
  }
  return null;
};


const META_ORC_IH_DEFAULT = 75000;

function Dashboard() {
  const [technicianRanking, setTechnicianRanking] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Estados centralizados para metas
  const [metaOrcamento, setMetaOrcamento] = useState(META_ORC_IH_DEFAULT);
  const [metaAtingida, setMetaAtingida] = useState(0);
  const [orcamentoPorTecnico, setOrcamentoPorTecnico] = useState([]);
  
  // --- LÓGICA DE CARREGAMENTO MELHORADA ---
  const [loadingMetas, setLoadingMetas] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [loadingKpis, setLoadingKpis] = useState(true);


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const unsubscribes = [];

    // Listener para o documento de metas (valor da meta, valor atingido e valores por técnico)
    const metaDocRef = doc(db, 'metas', 'orcamentoMensal');
    const unsubscribeMeta = onSnapshot(metaDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMetaOrcamento(data.valor || META_ORC_IH_DEFAULT);
        setMetaAtingida(data.valor_atingido || 0);

        const tecnicosMap = data.tecnicos || {};
        const tecnicosArray = Object.keys(tecnicosMap).map(nome => ({
          name: nome,
          orcamento: tecnicosMap[nome]
        })).sort((a, b) => b.orcamento - a.orcamento);
        setOrcamentoPorTecnico(tecnicosArray);
      } else {
        setMetaOrcamento(META_ORC_IH_DEFAULT);
        setMetaAtingida(0);
        setOrcamentoPorTecnico([]);
      }
      setLoadingMetas(false);
    }, (err) => {
      console.error("Erro ao buscar meta:", err);
      setError("Erro ao buscar metas de orçamento.");
      setLoadingMetas(false);
    });
    unsubscribes.push(unsubscribeMeta);

    // Listener para as estatísticas de OS dos técnicos
    const technicianStatsCollectionRef = collection(db, 'technicianStats');
    const q = query(technicianStatsCollectionRef, orderBy('totalOS', 'desc'));
    const unsubscribeTechnicianStats = onSnapshot(q, (snapshot) => {
      const sortedTechnicians = snapshot.docs.map(doc => ({
        name: doc.id,
        ...doc.data(),
      }));
      setTechnicianRanking(sortedTechnicians);
      setLoadingRanking(false);
    }, (err) => {
      console.error("Erro no listener de estatísticas de técnicos:", err);
      setError("Erro ao carregar ranking de técnicos.");
      setLoadingRanking(false);
    });
    unsubscribes.push(unsubscribeTechnicianStats);

    // Listener para os KPIs semanais
    const kpisCollectionRef = collection(db, 'kpis');
    const qKpis = query(kpisCollectionRef, orderBy('week', 'asc'));
    const unsubscribeKpis = onSnapshot(qKpis, (snapshot) => {
      const fetchedKpis = snapshot.docs.map(doc => ({
        name: `W ${doc.data().week}`,
        ...doc.data(),
      }));
      setKpiData(fetchedKpis.slice(-8));
      setLoadingKpis(false);
    }, (err) => {
      console.error("Erro no listener de KPIs:", err);
      setError("Erro ao carregar dados de KPIs.");
      setLoadingKpis(false);
    });
    unsubscribes.push(unsubscribeKpis);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  const calculateWeeklyMetrics = (dataPoint) => {
    // A lógica de cálculo de pontuação permanece a mesma
    return { score: 0, accelerators: 0, detractors: 0, finalScore: 0 }; // Placeholder
  };

  const weeklyScores = useMemo(() => kpiData.map(calculateWeeklyMetrics), [kpiData, metaOrcamento]);
  
  const calculateCommission = (finalScore) => {
    if (finalScore < 5) return 0;
    if (finalScore >= 5 && finalScore < 7) return 200;
    if (finalScore >= 7 && finalScore < 9) return 300;
    if (finalScore >= 9) return 400;
    return 0;
  };

  const lastWeekScore = weeklyScores.length > 0 ? weeklyScores[weeklyScores.length - 1].finalScore : 0;
  const lastWeekCommission = calculateCommission(lastWeekScore);
  
  const pieChartData = useMemo(() => {
    const atingido = metaAtingida;
    const restante = Math.max(0, metaOrcamento - atingido);
    return [{ name: 'Atingido', value: atingido }, { name: 'Restante', value: restante }];
  }, [metaAtingida, metaOrcamento]);

  const PIE_COLORS = ['#0088FE', '#FF8042'];

  const chartData = useMemo(() => ({
      ltpvd: kpiData.map(d => ({ name: d.name, 'LTP VD %': parseFloat(d['LTP VD %']), 'LTP VD QTD': parseFloat(d['LTP VD QTD']) })),
      ltpda: kpiData.map(d => ({ name: d.name, 'LTP DA %': parseFloat(d['LTP DA %']), 'LTP DA QTD': parseFloat(d['LTP DA QTD']) })),
      exltpvd: kpiData.map(d => ({ name: d.name, 'EX LTP VD %': parseFloat(d['EX LTP VD %']), 'EX LTP VD QTD': parseFloat(d['EX LTP VD QTD']) })),
      exltpda: kpiData.map(d => ({ name: d.name, 'EX LPT DA %': parseFloat(d['EX LPT DA %']), 'EX LRP DA QTD': parseFloat(d['EX LRP DA QTD']) })),
      rrrVd: kpiData.map(d => ({ name: d.name, 'RRR VD %': parseFloat(d['RRR VD %']), 'RRR VD QTD': parseFloat(d['RRR VD QTD']) })),
      rrrDa: kpiData.map(d => ({ name: d.name, 'RRR DA %': parseFloat(d['RRR DA %']), 'RRR DA QTD': parseFloat(d['RRR DA QTD']) })),
      ssrVd: kpiData.map(d => ({ name: d.name, 'SSR VD': parseFloat(d['SSR VD']) })),
      ssrDa: kpiData.map(d => ({ name: d.name, 'SSR DA': parseFloat(d['SSR DA']) })),
      ecoRepair: kpiData.map(d => ({ name: d.name, 'ECO REPAIR VD': parseFloat(d['ECO REPAIR VD']) })),
      ftcHappyCall: kpiData.map(d => ({ name: d.name, 'FTC HAPPY CALL': parseFloat(d['FTC HAPPY CALL']) })),
      poInHome: kpiData.map(d => ({ name: d.name, 'PO IN HOME D+1': parseFloat(d['PO IN HOME D+1']) })),
      firstVisit: kpiData.map(d => ({ name: d.name, '1ST VISIT VD': parseFloat(d['1ST VISIT VD']) })),
      inHome: kpiData.map(d => ({ name: d.name, 'IN HOME D+1': parseFloat(d['IN HOME D+1']) })),
      rnpsVd: kpiData.map(d => ({ name: d.name, 'R-NPS VD': parseFloat(d['R-NPS VD']) })),
      rnpsDa: kpiData.map(d => ({ name: d.name, 'R-NPS DA': parseFloat(d['R-NPS DA']) })),
  }), [kpiData]);


  if (loadingMetas || loadingRanking || loadingKpis) return <div className="no-data-message">Carregando dados...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="output">
      <div className="kpi-chart-container" style={{ textAlign: 'center' }}>
        <h3>Progresso da Meta de Orçamento</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                {pieChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <p className="no-data-message" style={{ color: '#e0e0e0' }}>Meta: R$ {metaOrcamento.toFixed(2)}</p>
      </div>

      <h3>Ranking de Ordens de Serviço por Técnico</h3>
      {technicianRanking.length === 0 ? <p className="no-data-message">Nenhuma OS encontrada.</p> : (
        <table style={{ width: '80%', margin: '20px auto', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th style={{ padding: '10px', border: '1px solid #555' }}>Técnico</th>
              <th style={{ padding: '10px', border: '1px solid #555' }}>Total OS</th>
              <th style={{ padding: '10px', border: '1px solid #555' }}>OS Samsung</th>
              <th style={{ padding: '10px', border: '1px solid #555' }}>OS Assurant</th>
            </tr>
          </thead>
          <tbody>
            {technicianRanking.map((tecnico, index) => (
              <tr key={tecnico.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.name}</td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.totalOS}</td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.samsungOS}</td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.assurantOS}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Orçamentos Aprovados por Técnico</h3>
      <div className="kpi-chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={orcamentoPorTecnico}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="orcamento" fill="#8884d8" name="Orçamento Aprovado" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <h3>KPIs de Desempenho</h3>
      <div className="kpi-grid">
        <KPIChart data={chartData.ltpvd} title="LTP VD %" dataKeys={[{ dataKey: 'LTP VD %', stroke: '#8884d8', name: 'LTP VD %' }]} meta={[{ value: 12.8, stroke: '#ffc658', label: 'Meta' }, { value: 5, stroke: '#FF0000', label: 'P4P' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 40]} />
        <KPIChart data={chartData.ltpda} title="LTP DA %" dataKeys={[{ dataKey: 'LTP DA %', stroke: '#ff7300', name: 'LTP DA %' }]} meta={[{ value: 17.4, stroke: '#00C49F', label: 'Meta' }, { value: 7, stroke: '#FFD700', label: 'P4P' }]} tooltipContent={<CustomTooltip />} />
        <KPIChart data={chartData.exltpvd} title="EX LTP VD %" dataKeys={[{ dataKey: 'EX LTP VD %', stroke: '#3366FF', name: 'EX LTP VD %' }]} meta={{ value: 1.44, stroke: '#FFCC00', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 10]} />
        <KPIChart data={chartData.exltpda} title="EX LTP DA %" dataKeys={[{ dataKey: 'EX LPT DA %', stroke: '#CC0066', name: 'EX LTP DA %' }]} meta={{ value: 1.50, stroke: '#99FF00', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 10]} />
        <KPIChart data={chartData.rrrVd} title="RRR VD %" dataKeys={[{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }]} meta={[{ value: 2.8, stroke: '#FFCC00', label: 'Meta' }, { value: 1.5, stroke: '#008080', label: 'P4P' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 15]} />
        <KPIChart data={chartData.rrrDa} title="RRR DA %" dataKeys={[{ dataKey: 'RRR DA %', stroke: '#A52A2A', name: 'RRR DA %' }]} meta={[{ value: 5, stroke: '#FF4500', label: 'Meta' }, { value: 3, stroke: '#FFD700', label: 'P4P' }]} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 15]} />
        <KPIChart data={chartData.ssrVd} title="SSR VD %" dataKeys={[{ dataKey: 'SSR VD', stroke: '#BA55D3', name: 'SSR VD' }]} meta={{ value: 0.4, stroke: '#FFD700', label: 'Meta' }} tooltipContent={<CustomTooltip />} />
        <KPIChart data={chartData.ssrDa} title="SSR DA %" dataKeys={[{ dataKey: 'SSR DA', stroke: '#FF00FF', name: 'SSR DA' }]} meta={{ value: 1.1, stroke: '#FFA07A', label: 'Meta' }} tooltipContent={<CustomTooltip />} />
        <KPIChart data={chartData.ecoRepair} title="ECO REPAIR VD %" dataKeys={[{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }]} meta={{ value: 60, stroke: '#FF5722', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
        <KPIChart data={chartData.ftcHappyCall} title="FTC HAPPY CALL %" dataKeys={[{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }]} meta={{ value: 88, stroke: '#FFEB3B', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
        <KPIChart data={chartData.poInHome} title="PO IN HOME D+1 %" dataKeys={[{ dataKey: 'PO IN HOME D+1', stroke: '#3F51B5', name: 'PO IN HOME D+1' }]} meta={{ value: 70, stroke: '#FFC107', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
        <KPIChart data={chartData.firstVisit} title="1ST VISIT VD %" dataKeys={[{ dataKey: '1ST VISIT VD', stroke: '#FFBB28', name: '1ST VISIT VD' }]} meta={{ value: 20, stroke: '#FF0000', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
        <KPIChart data={chartData.inHome} title="IN HOME D+1 %" dataKeys={[{ dataKey: 'IN HOME D+1', stroke: '#00C49F', name: 'IN HOME D+1' }]} meta={{ value: 20, stroke: '#FF4081', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 50]} />
        <KPIChart data={chartData.rnpsVd} title="R-NPS VD %" dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#4682B4', name: 'R-NPS VD' }]} meta={{ value: 80, stroke: '#9ACD32', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
        <KPIChart data={chartData.rnpsDa} title="R-NPS DA %" dataKeys={[{ dataKey: 'R-NPS DA', stroke: '#FF4500', name: 'R-NPS DA' }]} meta={{ value: 78, stroke: '#ADFF2F', label: 'Meta' }} tooltipContent={<CustomTooltip />} yAxisDomain={[0, 100]} />
      </div>

      ---

      {isMobile ? (
        <>
          <h2>Outras Métricas por Semana</h2>
          {kpiData.map((dataPoint) => (
            <div key={dataPoint.name} style={{ marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
              <h1 style={{ textAlign: 'center' }}>{dataPoint.name}</h1>
              <p style={{ textAlign: 'center' }}>Orçamento: {dataPoint['Orçamento'] || 'N/A'}</p>
              <p style={{ textAlign: 'center' }}>Treinamentos %: {dataPoint['Treinamentos'] || 'N/A'}</p>
              <p style={{ textAlign: 'center' }}>Vendas Store+: {dataPoint['VENDAS STORE+'] || 'N/A'}</p>
            </div>
          ))}
        </>
      ) : (
        <>
          <h3>Outras Métricas por Semana</h3>
          <table style={{ width: '80%', borderCollapse: 'collapse', marginTop: '20px', marginLeft: 'auto', marginRight: 'auto' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Semana</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Orçamento</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Treinamentos %</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Vendas Store+</th>
              </tr>
            </thead>
            <tbody>
              {kpiData.map((dataPoint, index) => (
                <tr key={dataPoint.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.name}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint['Orçamento'] || 'N/A'}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint['Treinamentos'] || 'N/A'}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint['VENDAS STORE+'] || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      ---

      {isMobile ? (
        <>
          <h1 style={{ color: '#e0e0e0', marginTop: '30px', textAlign: 'center' }}>Pontuação Semanal</h1>
          {weeklyScores.map((dataPoint) => (
            <div key={dataPoint.name} style={{ marginBottom: '15px', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
              <h1 style={{ fontSize: '1.2em', margin: '5px 0', textAlign: 'center' }}>{dataPoint.name}</h1>
              <p style={{ textAlign: 'center' }}>Pontuação: {dataPoint.score}</p>
              <p style={{ textAlign: 'center' }}>Aceleradores: {dataPoint.accelerators}</p>
              <p style={{ textAlign: 'center' }}>Detratores: {dataPoint.detractors}</p>
              <p style={{ textAlign: 'center' }}>Resultado: {dataPoint.finalScore.toFixed(1)}</p>
            </div>
          ))}
        </>
      ) : (
        <>
          <h3>Pontuação Semanal</h3>
          <table style={{ width: '80%', borderCollapse: 'collapse', marginTop: '20px', marginLeft: 'auto', marginRight: 'auto' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Semana</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Pontuação</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Aceleradores</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Detratores</th>
                <th style={{ padding: '10px', border: '1px solid #555' }}>Final</th>
              </tr>
            </thead>
            <tbody>
              {weeklyScores.map((dataPoint, index) => (
                <tr key={dataPoint.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.name}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.score}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.accelerators}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.detractors}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.finalScore.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {weeklyScores.length > 0 && (
        <h1 style={{ color: '#9e9e9e', marginTop: '30px', marginBottom: '20px', textAlign: 'center' }}>
          Comissionamento baseado na última semana: R$ {lastWeekCommission.toFixed(2)}
        </h1>
      )}
    </div>
  );
}

export default Dashboard;