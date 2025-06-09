// src/components/Dashboard.js
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label } from 'recharts';

// Reusable Chart Component
const KPIChart = ({ data, title, dataKeys, meta, tooltipContent, yAxisDomain = [0, 'auto' ] }) => {
  if (!data || data.length === 0) {
    return <p className="no-data-message">Nenhum dado de "{title}" encontrado para as últimas 4 semanas.</p>;
  }

  return (
    <div className="kpi-chart-container">
      <h3>{title} 📈</h3>
      <div style={{ width: '100%', height: 300 }}> {/* Largura e altura para ResponsiveContainer */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 85, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
            <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={yAxisDomain} />
            <Tooltip content={tooltipContent} />
            <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
            {dataKeys.map((key, index) => (
              <Line
                key={key.dataKey}
                type="monotone"
                dataKey={key.dataKey}
                stroke={key.stroke}
                activeDot={{ r: 8 }}
                name={key.name}
              />
            ))}
            {meta && Array.isArray(meta) ? ( // Check if meta is an array to render multiple lines
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
            ) : ( // Keep existing behavior for single meta object for other charts
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

// Custom Tooltip Component (more flexible)
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

          return <p key={`item-${index}`}>{`${name}: ${displayValue}`}</p>;
        })}
      </div>
    );
  }
  return null;
};

function Dashboard() {
  const [technicianRanking, setTechnicianRanking] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribes = [];

    const setupRealtimeListeners = async () => {
      try {
        // Listener for Technician Ranking
        const tecnicoCollectionRef = collection(db, 'ordensDeServico');
        const unsubscribeTecnicos = onSnapshot(tecnicoCollectionRef, async (tecnicoSnapshot) => {
          const currentTechnicianStats = {};

          if (tecnicoSnapshot.empty) {
            setTechnicianRanking([]);
            return;
          }

          for (const tecnicoDoc of tecnicoSnapshot.docs) {
            const tecnicoNome = tecnicoDoc.id;
            let totalOS = 0;
            let samsungOS = 0;
            let assurantOS = 0;

            const osPorDataCollectionRef = collection(tecnicoDoc.ref, 'osPorData');
            const osPorDataSnapshot = await getDocs(osPorDataCollectionRef);

            for (const dateDoc of osPorDataSnapshot.docs) {
              const samsungCollectionRef = collection(dateDoc.ref, 'Samsung');
              const assurantCollectionRef = collection(dateDoc.ref, 'Assurant');

              const samsungDocs = await getDocs(samsungCollectionRef);
              samsungDocs.forEach(() => {
                totalOS++;
                samsungOS++;
              });

              const assurantDocs = await getDocs(assurantCollectionRef);
              assurantDocs.forEach(() => {
                totalOS++;
                assurantOS++;
              });
            }
            currentTechnicianStats[tecnicoNome] = {
              total: totalOS,
              samsung: samsungOS,
              assurant: assurantOS,
            };
          }

          const sortedTechnicians = Object.keys(currentTechnicianStats).map(tecnico => ({
            name: tecnico,
            total: currentTechnicianStats[tecnico].total,
            samsung: currentTechnicianStats[tecnico].samsung,
            assurant: currentTechnicianStats[tecnico].assurant,
          })).sort((a, b) => b.total - a.total);

          setTechnicianRanking(sortedTechnicians);
        }, (err) => {
          console.error("Erro no listener de técnicos:", err);
          setError("Erro ao carregar ranking de técnicos. Verifique as permissões do Firebase.");
        });

        unsubscribes.push(unsubscribeTecnicos);

        // Listener for KPIs (last 4 weeks)
        const kpisCollectionRef = collection(db, 'kpis');
        const q = query(kpisCollectionRef, orderBy('timestamp', 'desc'), limit(4));

        const unsubscribeKpis = onSnapshot(q, (snapshot) => {
          const fetchedKpis = snapshot.docs.map(doc => ({
            name: `Semana ${doc.data().week}`,
            ...doc.data(),
          }));
          setKpiData(fetchedKpis);
          setLoading(false);
        }, (err) => {
          console.error("Erro no listener de KPIs:", err);
          setError("Erro ao carregar dados de KPIs. Verifique as permissões do Firebase.");
          setLoading(false);
        });

        unsubscribes.push(unsubscribeKpis);

      } catch (err) {
        console.error("Erro ao configurar listeners do Firebase: ", err);
        setError("Erro ao carregar dados. Verifique sua conexão ou as permissões do Firebase.");
        setLoading(false);
      }
    };

    setupRealtimeListeners();

    return () => {
      console.log("Limpando listeners do Firebase...");
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Memoized data for each KPI chart to prevent unnecessary re-renders
  const ltpvdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'LTP VD %': parseFloat(d['LTP VD %']), 'LTP VD QTD': parseFloat(d['LTP VD QTD']) })), [kpiData]);
  const ltpdaChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'LTP DA %': parseFloat(d['LTP DA %']), 'LTP DA QTD': parseFloat(d['LTP DA QTD']) })), [kpiData]);
  const exltpvdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'EX LTP VD %': parseFloat(d['EX LTP VD %']), 'EX LTP VD QTD': parseFloat(d['EX LTP VD QTD']) })), [kpiData]);
  const exltpdaChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'EX LPT DA %': parseFloat(d['EX LPT DA %']), 'EX LRP DA QTD': parseFloat(d['EX LRP DA QTD']) })), [kpiData]);
  const ftcHappyCallChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'FTC HAPPY CALL': parseFloat(d['FTC HAPPY CALL']) })), [kpiData]);
  const ftcVdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'FTC VD': parseFloat(d['FTC VD']) })), [kpiData]);
  const ftcDaChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'FTC DA': parseFloat(d['FTC DA']) })), [kpiData]);
  const ecoRepairVdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'ECO REPAIR VD': parseFloat(d['ECO REPAIR VD']) })), [kpiData]);
  const vendasStorePlusChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'VENDAS STORE+': parseFloat(d['VENDAS STORE+']) })), [kpiData]);
  const poInHomeD1ChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'PO IN HOME D+1': parseFloat(d['PO IN HOME D+1']) })), [kpiData]);
  const treinamentosChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'Treinamentos': parseFloat(d['Treinamentos']) })), [kpiData]);
  const orcamentoChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'Orçamento': parseFloat(d['Orçamento']) })), [kpiData]);
  const firstVisitVdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, '1ST VISIT VD': parseFloat(d['1ST VISIT VD']) })), [kpiData]);
  const inHomeD1ChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'IN HOME D+1': parseFloat(d['IN HOME D+1']) })), [kpiData]);
  const rrrVdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'RRR VD %': parseFloat(d['RRR VD %']), 'RRR VD QTD': parseFloat(d['RRR VD QTD']) })), [kpiData]);
  const rrrDaChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'RRR DA %': parseFloat(d['RRR DA %']), 'RRR DA QTD': parseFloat(d['RRR DA QTD']) })), [kpiData]);
  const rnpsVdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'R-NPS VD': parseFloat(d['R-NPS VD']) })), [kpiData]);
  const rnpsDaChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'R-NPS DA': parseFloat(d['R-NPS DA']) })), [kpiData]);
  const ssrVdChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'SSR VD': parseFloat(d['SSR VD']) })), [kpiData]);
  const ssrDaChartData = useMemo(() => kpiData.map(d => ({ name: d.name, 'SSR DA': parseFloat(d['SSR DA']) })), [kpiData]);

  if (loading) {
    return <div className="no-data-message">Carregando dados do Firebase...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="output">
      <h3>Ranking de Ordens de Serviço por Técnico ✅</h3>
      {technicianRanking.length === 0 ? (
        <p className="no-data-message">Nenhuma ordem de serviço encontrada para o ranking.</p>
      ) : (
        <>
          <table style={{
            width: '80%',
            borderCollapse: 'collapse',
            marginTop: '20px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Técnico</th>
                <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Total OS</th>
                <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>OS Samsung</th>
                <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>OS Assurant</th>
              </tr>
            </thead>
            <tbody>
              {technicianRanking.map((tecnico, index) => (
                <tr key={tecnico.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.name}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.total}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.samsung}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.assurant}</td>
                </tr>
              ))}
            </tbody>
          </table>

        </>
      )}

      {/* Grid para os gráficos de KPI */}
      <h2>KPIs de Desempenho 🚀</h2>
      <div className="kpi-grid">
        <KPIChart
          data={ltpvdChartData}
          title="  LTP VD % (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'LTP VD %', stroke: '#8884d8', name: 'LTP VD %' }]}
          meta={[ // Now an array of meta objects for multiple reference lines
            { value: 12.8, stroke: '#ffc658', label: 'Meta: 12.8%' },
            { value: 5, stroke: '#FF0000', label: 'P4P: 5%' } // Adding the 5% line
          ]}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={ltpdaChartData}
          title="  LTP DA % (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'LTP DA %', stroke: '#ff7300', name: 'LTP DA %' }]}
          meta={[ // Now an array of meta objects for multiple reference lines
            { value: 17.4, stroke: '#ffc658', label: 'Meta: 17.4%' },
            { value: 7, stroke: '#FF0000', label: 'P4P: 7%' } // Adding the 5% line
        ]}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={exltpvdChartData}
          title="  EX LTP VD % (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'EX LTP VD %', stroke: '#3366FF', name: 'EX LTP VD %' }]}
          meta={{ value: 1.44, stroke: '#FFCC00', label: 'Meta: 1.44%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={exltpdaChartData}
          title="  EX LTP DA % (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'EX LPT DA %', stroke: '#CC0066', name: 'EX LTP DA %' }]}
          meta={{ value: 1.50, stroke: '#99FF00', label: 'Meta: 1.50%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={ecoRepairVdChartData}
          title="  ECO REPAIR VD (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'ECO REPAIR VD', stroke: '#4CAF50', name: 'ECO REPAIR VD' }]}
          meta={{ value: 60, stroke: '#FF5722', label: 'Meta: 60%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={ftcHappyCallChartData}
          title="  FTC HAPPY CALL (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'FTC HAPPY CALL', stroke: '#9C27B0', name: 'FTC HAPPY CALL' }]}
          meta={{ value: 88, stroke: '#FFEB3B', label: 'Meta: 88%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={poInHomeD1ChartData}
          title="  PO IN HOME D+1 (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'PO IN HOME D+1', stroke: '#3F51B5', name: 'PO IN HOME D+1' }]}
          meta={{ value: 70, stroke: '#FFC107', label: 'Meta: 70%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={vendasStorePlusChartData}
          title="  VENDAS STORE+ (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'VENDAS STORE+', stroke: '#00BCD4', name: 'VENDAS STORE+' }]}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={treinamentosChartData}
          title="  Treinamentos (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'Treinamentos', stroke: '#FF5722', name: 'Treinamentos' }]}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={orcamentoChartData}
          title="  Orçamento (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'Orçamento', stroke: '#607D8B', name: 'Orçamento' }]}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={ftcVdChartData}
          title="  FTC VD (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'FTC VD', stroke: '#6633FF', name: 'FTC VD' }]}
          meta={{ value: 89, stroke: '#FF9900', label: 'Meta: 89%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={ftcDaChartData}
          title="  FTC DA (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'FTC DA', stroke: '#FF66B2', name: 'FTC DA' }]}
          meta={{ value: 84, stroke: '#00FFFF', label: 'Meta: 84%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={firstVisitVdChartData}
          title="  1ST VISIT VD (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: '1ST VISIT VD', stroke: '#FFBB28', name: '1ST VISIT VD' }]}
          meta={{ value: 20, stroke: '#FF0000', label: 'Meta: 20%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={inHomeD1ChartData}
          title="  IN HOME D+1 (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'IN HOME D+1', stroke: '#00C49F', name: 'IN HOME D+1' }]}
          meta={{ value: 20, stroke: '#FF4081', label: 'Meta: 20%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={rrrVdChartData}
          title="  RRR VD % (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'RRR VD %', stroke: '#8A2BE2', name: 'RRR VD %' }]}
          meta={{ value: 1.5, stroke: '#008080', label: 'Meta: 1.5%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={rrrDaChartData}
          title="  RRR DA % (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'RRR DA %', stroke: '#A52A2A', name: 'RRR DA %' }]}
          meta={{ value: 3, stroke: '#FFD700', label: 'Meta: 3%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={rnpsVdChartData}
          title="  R-NPS VD (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'R-NPS VD', stroke: '#4682B4', name: 'R-NPS VD' }]}
          meta={{ value: 80, stroke: '#9ACD32', label: 'Meta: 80%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={rnpsDaChartData}
          title="  R-NPS DA (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'R-NPS DA', stroke: '#FF4500', name: 'R-NPS DA' }]}
          meta={{ value: 78, stroke: '#ADFF2F', label: 'Meta: 78%' }}
          tooltipContent={<CustomTooltip />}
          yAxisDomain={[0, 100]}
        />

        <KPIChart
          data={ssrVdChartData}
          title="  SSR VD (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'SSR VD', stroke: '#BA55D3', name: 'SSR VD' }]}
          meta={{ value: 0.4, stroke: '#800080', label: 'Meta: 0.4%' }}
          tooltipContent={<CustomTooltip />}
        />

        <KPIChart
          data={ssrDaChartData}
          title="  SSR DA (Últimas 4 Semanas Registradas)"
          dataKeys={[{ dataKey: 'SSR DA', stroke: '#FF00FF', name: 'SSR DA' }]}
          meta={{ value: 1.1, stroke: '#FFA07A', label: 'Meta: 1.1%' }}
          tooltipContent={<CustomTooltip />}
        />
      </div>


      {/* Table for other metrics */}
      <h3>Outras Métricas por Semana ✅</h3>
      {kpiData.length === 0 ? (
        <p className="no-data-message">Nenhum dado de Orçamento, Treinamentos ou Vendas Store+ encontrado para as últimas 4 semanas.</p>
      ) : (
        <table style={{
          width: '80%',
          borderCollapse: 'collapse',
          marginTop: '20px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <thead>
            <tr style={{ background: '#333' }}>
              <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Semana</th>
              <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Orçamento</th>
              <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Treinamentos</th>
              <th style={{ padding: '10px', border: '1px solid #555', textAlign: 'left' }}>Vendas Store+</th>
            </tr>
          </thead>
          <tbody>
            {kpiData.map((dataPoint, index) => (
              <tr key={dataPoint.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.name}</td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>
                  {dataPoint['Orçamento'] || 'N/A'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>
                  {dataPoint['Treinamentos'] || 'N/A'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>
                  {dataPoint['VENDAS STORE+'] || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;