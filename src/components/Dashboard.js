import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label } from 'recharts';

function Dashboard() {
  const [rankedData, setRankedData] = useState([]);
  const [ltpvdData, setLtpvdData] = useState([]);
  const [ltpdaData, setLtpdaData] = useState([]);
  const [exltpvdData, setExltpvdData] = useState([]);
  const [exltpdaData, setExltpdaData] = useState([]);
  const [ftcVdData, setFtcVdData] = useState([]);     
  const [ftcDaData, setFtcDaData] = useState([]);
  const [ecoRepairVdData, setEcoRepairVdData] = useState([]);
  const [ftcHappyCallData, setFtcHappyCallData] = useState([]);
  const [poInHomeD1Data, setPoInHomeD1Data] = useState([]);
  const [vendasStorePlusData, setVendasStorePlusData] = useState([]);
  const [treinamentosData, setTreinamentosData] = useState([]);
  const [orcamentoData, setOrcamentoData] = useState([]);
  const [firstVisitVdData, setFirstVisitVdData] = useState([]);
  const [inHomeD1Data, setInHomeD1Data] = useState([]);
  const [rrrVdData, setRrrVdData] = useState([]);
  const [rrrDaData, setRrrDaData] = useState([]);
  const [rnpsVdData, setRnpsVdData] = useState([]);
  const [rnpsDaData, setRnpsDaData] = useState([]);
  const [ssrVdData, setSsrVdData] = useState([]);
  const [ssrDaData, setSsrDaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribes = [];

    const setupRealtimeListeners = async () => {
      try {
        // --- Lógica para o Ranking de Técnicos (já existente) ---
        const tecnicoCollectionRef = collection(db, 'ordensDeServico');

        const unsubscribeTecnicos = onSnapshot(tecnicoCollectionRef, async (tecnicoSnapshot) => {
          const currentTechnicianStats = {};

          if (tecnicoSnapshot.empty) {
            setRankedData([]);
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

          setRankedData(sortedTechnicians);
        }, (err) => {
          console.error("Erro no listener de técnicos:", err);
          setError("Erro ao carregar dados em tempo real. Verifique as permissões do Firebase.");
          setLoading(false);
        });

        unsubscribes.push(unsubscribeTecnicos);

        // --- Lógica para buscar os KPIs das últimas 4 semanas para todos os gráficos e tabela ---
        const kpisCollectionRef = collection(db, 'kpis');
        const q = query(kpisCollectionRef, orderBy('timestamp', 'desc'), limit(4));

        const unsubscribeKpis = onSnapshot(q, (snapshot) => {
          const fetchedLtpvdData = [];
          const fetchedLtpdaData = [];
          const fetchedExLtpvdData = [];
          const fetchedExLtpdaData = [];
          const fetchedFtcHappyCallData = [];
          const fetchedFtcVdData = [];   
          const fetchedFtcDaData = [];
          const fetchedEcoRepairVdData = [];
          const fetchedVendasStorePlusData = [];
          const fetchedPoInHomeD1Data = [];
          const fetchedTreinamentosData = [];
          const fetchedOrcamentoData = [];
          const fetchedFirstVisitVdData = [];
          const fetchedInHomeD1Data = [];
          const fetchedRrrVdData = [];
          const fetchedRrrDaData = [];
          const fetchedRnpsVdData = [];
          const fetchedRnpsDaData = [];
          const fetchedSsrVdData = [];
          const fetchedSsrDaData = [];

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            fetchedLtpvdData.push({
              name: `Semana ${data.week}`,
              'LTP VD %': parseFloat(data['LTP VD %']),
              'LTP VD QTD': parseFloat(data['LTP VD QTD']),
            });
            fetchedLtpdaData.push({
                name: `Semana ${data.week}`,
                'LTP DA %': parseFloat(data['LTP DA %']),
                'LTP DA QTD': parseFloat(data['LTP DA QTD']),
            });
            fetchedExLtpvdData.push({
                name: `Semana ${data.week}`,
                'EX LTP VD %': parseFloat(data['EX LTP VD %']),
                'EX LTP VD QTD': parseFloat(data['EX LTP VD QTD']),
            });
            fetchedExLtpdaData.push({
                name: `Semana ${data.week}`,
                'EX LPT DA %': parseFloat(data['EX LPT DA %']),
                'EX LRP DA QTD': parseFloat(data['EX LRP DA QTD']),
            });
            fetchedFtcHappyCallData.push({
                name: `Semana ${data.week}`,
                'FTC HAPPY CALL': parseFloat(data['FTC HAPPY CALL']),
            });
            fetchedFtcVdData.push({
                name: `Semana ${data.week}`,
                'FTC VD': parseFloat(data['FTC VD']),
            });
            fetchedFtcDaData.push({
                name: `Semana ${data.week}`,
                'FTC DA': parseFloat(data['FTC DA']),
            });
            fetchedEcoRepairVdData.push({
                name: `Semana ${data.week}`,
                'ECO REPAIR VD': parseFloat(data['ECO REPAIR VD']),
            });
            fetchedVendasStorePlusData.push({
                name: `Semana ${data.week}`,
                'VENDAS STORE+': parseFloat(data['VENDAS STORE+']),
            });
            fetchedPoInHomeD1Data.push({
                name: `Semana ${data.week}`,
                'PO IN HOME D+1': parseFloat(data['PO IN HOME D+1']),
            });
            fetchedTreinamentosData.push({
                name: `Semana ${data.week}`,
                'Treinamentos': parseFloat(data['Treinamentos']),
            });
            fetchedOrcamentoData.push({
                name: `Semana ${data.week}`,
                'Orçamento': parseFloat(data['Orçamento']),
            });
            fetchedFirstVisitVdData.push({
                name: `Semana ${data.week}`,
                '1ST VISIT VD': parseFloat(data['1ST VISIT VD']),
            });
            fetchedInHomeD1Data.push({
                name: `Semana ${data.week}`,
                'IN HOME D+1': parseFloat(data['IN HOME D+1']),
            });
            fetchedRrrVdData.push({
                name: `Semana ${data.week}`,
                'RRR VD %': parseFloat(data['RRR VD %']),
                'RRR VD QTD': parseFloat(data['RRR VD QTD']),
            });
            fetchedRrrDaData.push({
                name: `Semana ${data.week}`,
                'RRR DA %': parseFloat(data['RRR DA %']),
                'RRR DA QTD': parseFloat(data['RRR DA QTD']),
            });
            fetchedRnpsVdData.push({
                name: `Semana ${data.week}`,
                'R-NPS VD': parseFloat(data['R-NPS VD']),
            });
            fetchedRnpsDaData.push({
                name: `Semana ${data.week}`,
                'R-NPS DA': parseFloat(data['R-NPS DA']),
            });
            fetchedSsrVdData.push({
                name: `Semana ${data.week}`,
                'SSR VD': parseFloat(data['SSR VD']),
            });
            fetchedSsrDaData.push({
                name: `Semana ${data.week}`,
                'SSR DA': parseFloat(data['SSR DA']),
            });
          });
          setLtpvdData(fetchedLtpvdData);
          setLtpdaData(fetchedLtpdaData);
          setExltpvdData(fetchedExLtpvdData);
          setExltpdaData(fetchedExLtpdaData);
          setFtcHappyCallData(fetchedFtcHappyCallData);
          setFtcVdData(fetchedFtcVdData);
          setFtcDaData(fetchedFtcDaData);
          setEcoRepairVdData(fetchedEcoRepairVdData);
          setVendasStorePlusData(fetchedVendasStorePlusData);
          setPoInHomeD1Data(fetchedPoInHomeD1Data);
          setTreinamentosData(fetchedTreinamentosData);
          setOrcamentoData(fetchedOrcamentoData);
          setFirstVisitVdData(fetchedFirstVisitVdData);
          setInHomeD1Data(fetchedInHomeD1Data);
          setRrrVdData(fetchedRrrVdData);
          setRrrDaData(fetchedRrrDaData);
          setRnpsVdData(fetchedRnpsVdData);
          setRnpsDaData(fetchedRnpsDaData);
          setSsrVdData(fetchedSsrVdData);
          setSsrDaData(fetchedSsrDaData);
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

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#e0e0e0' }}>Carregando dados do Firebase...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>;
  }

  // Componente de Tooltip customizado para exibir a QTD (para gráficos LTP e EX LTP, RRR)
  const CustomLTPTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const dataKeyName = payload[0].name;
      const dataKeyValue = payload[0].value;
      
      let qtdLabel = '';
      if (dataKeyName === 'LTP VD %' && dataPoint['LTP VD QTD'] !== undefined) {
        qtdLabel = `LTP VD QTD: ${dataPoint['LTP VD QTD']}`;
      } else if (dataKeyName === 'LTP DA %' && dataPoint['LTP DA QTD'] !== undefined) {
        qtdLabel = `LTP DA QTD: ${dataPoint['LTP DA QTD']}`;
      } else if (dataKeyName === 'EX LTP VD %' && dataPoint['EX LTP VD QTD'] !== undefined) {
        qtdLabel = `EX LTP VD QTD: ${dataPoint['EX LTP VD QTD']}`;
      } else if (dataKeyName === 'EX LPT DA %' && dataPoint['EX LRP DA QTD'] !== undefined) {
        qtdLabel = `EX LRP DA QTD: ${dataPoint['EX LRP DA QTD']}`;
      } else if (dataKeyName === 'RRR VD %' && dataPoint['RRR VD QTD'] !== undefined) {
        qtdLabel = `RRR VD QTD: ${dataPoint['RRR VD QTD']}`;
      } else if (dataKeyName === 'RRR DA %' && dataPoint['RRR DA QTD'] !== undefined) {
        qtdLabel = `RRR DA QTD: ${dataPoint['RRR DA QTD']}`;
      }

      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#333',
          border: '1px solid #555',
          borderRadius: '5px',
          padding: '10px',
          color: '#e0e0e0'
        }}>
          <p className="label" style={{ color: '#007BFF', margin: 0, marginBottom: '5px' }}>{label}</p>
          <p style={{ margin: 0 }}>{`${dataKeyName}: ${dataKeyValue}%`}</p>
          {qtdLabel && <p style={{ margin: 0 }}>{qtdLabel}</p>}
        </div>
      );
    }

    return null;
  };

  // Componente de Tooltip customizado para gráficos apenas de porcentagem/valor (FTC, 1ST VISIT VD, IN HOME D+1, R-NPS, SSR, Eco Repair, Vendas Store+, PO IH D+1, Treinamentos, Orçamento)
  const CustomPercentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataKeyName = payload[0].name;
      const dataKeyValue = payload[0].value;
      // Adiciona sufixo % se for uma porcentagem, caso contrário, exibe o valor puro
      const displayValue = dataKeyName.includes('%') || dataKeyName.includes('FTC') || dataKeyName.includes('NPS') ? `${dataKeyValue}%` : dataKeyValue;

      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#333',
          border: '1px solid #555',
          borderRadius: '5px',
          padding: '10px',
          color: '#e0e0e0'
        }}>
          <p className="label" style={{ color: '#007BFF', margin: 0, marginBottom: '5px' }}>{label}</p>
          <p style={{ margin: 0 }}>{`${dataKeyName}: ${displayValue}`}</p>
        </div>
      );
    }
    return null;
  };


  return (
    <div className="output" style={{ marginTop: '20px', textAlign: 'center' }}>
      <h3>Ranking de Ordens de Serviço por Técnico ✅</h3>
      {rankedData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhuma ordem de serviço encontrada para o ranking.</p>
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
              {rankedData.map((tecnico, index) => (
                <tr key={tecnico.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.name}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.total}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.samsung}</td>
                  <td style={{ padding: '10px', border: '1px solid #555' }}>{tecnico.assurant}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Gráfico de Barras */}
          <h3 style={{ marginTop: '40px' }}>Gráfico de Ordens de Serviço por Técnico 📊</h3>
          <div style={{ width: '100%', height: 400, marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rankedData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
                <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
                <Tooltip
                  wrapperStyle={{ backgroundColor: '#333', border: '1px solid #555', borderRadius: '5px', padding: '10px' }}
                  labelStyle={{ color: '#007BFF' }}
                  itemStyle={{ color: '#e0e0e0' }}
                  contentStyle={{ backgroundColor: '#333', border: '1px solid #555' }}
                />
                <Legend wrapperStyle={{ color: '#e0e0e0' }} />
                <Bar dataKey="total" fill="#007BFF" name="Total OS" />
                <Bar dataKey="samsung" fill="#82ca9d" name="OS Samsung" />
                <Bar dataKey="assurant" fill="#ffc658" name="OS Assurant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Gráfico de Linha para LTP VD % */}
      <h3 style={{ marginTop: '40px' }}>KPI: LTP VD % (Últimas 4 Semanas Registradas) 📈</h3>
      {ltpvdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "LTP VD %" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ltpvdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomLTPTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="LTP VD %" stroke="#8884d8" activeDot={{ r: 8 }} name="LTP VD %" />
              <ReferenceLine y={12.8} stroke="#ffc658" strokeDasharray="3 3" >
                <Label
                  value="Meta: 12.8%"
                  position="right"
                  fill="#ffc658"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para LTP DA % */}
      <h3 style={{ marginTop: '40px' }}>KPI: LTP DA % (Últimas 4 Semanas Registradas) 📈</h3>
      {ltpdaData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "LTP DA %" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ltpdaData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomLTPTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="LTP DA %" stroke="#ff7300" activeDot={{ r: 8 }} name="LTP DA %" />
              <ReferenceLine y={17.4} stroke="#00C49F" strokeDasharray="3 3" >
                <Label
                  value="Meta: 17.4%"
                  position="right"
                  fill="#00C49F"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para EX LTP VD % */}
      <h3 style={{ marginTop: '40px' }}>KPI: EX LTP VD % (Últimas 4 Semanas Registradas) 📈</h3>
      {exltpvdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "EX LTP VD %" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={exltpvdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomLTPTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="EX LTP VD %" stroke="#3366FF" activeDot={{ r: 8 }} name="EX LTP VD %" />
              <ReferenceLine y={1.44} stroke="#FFCC00" strokeDasharray="3 3" >
                <Label
                  value="Meta: 1.44%"
                  position="right"
                  fill="#FFCC00"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para EX LTP DA % */}
      <h3 style={{ marginTop: '40px' }}>KPI: EX LTP DA % (Últimas 4 Semanas Registradas) 📈</h3>
      {exltpdaData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "EX LTP DA %" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={exltpdaData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomLTPTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="EX LPT DA %" stroke="#CC0066" activeDot={{ r: 8 }} name="EX LTP DA %" />
              <ReferenceLine y={1.50} stroke="#99FF00" strokeDasharray="3 3" >
                <Label
                  value="Meta: 1.50%"
                  position="right"
                  fill="#99FF00"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para ECO REPAIR VD */}
      <h3 style={{ marginTop: '40px' }}>KPI: ECO REPAIR VD (Últimas 4 Semanas Registradas) 📈</h3>
      {ecoRepairVdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "ECO REPAIR VD" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ecoRepairVdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} /> {/* Assumindo que é uma porcentagem */}
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="ECO REPAIR VD" stroke="#4CAF50" activeDot={{ r: 8 }} name="ECO REPAIR VD" />
              <ReferenceLine y={60} stroke="#FF5722" strokeDasharray="3 3" >
                <Label
                  value="Meta: 60%"
                  position="right"
                  fill="#FF5722"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para FTC HAPPY CALL */}
      <h3 style={{ marginTop: '40px' }}>KPI: FTC HAPPY CALL (Últimas 4 Semanas Registradas) 📈</h3>
      {ftcHappyCallData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "FTC HAPPY CALL" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ftcHappyCallData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="FTC HAPPY CALL" stroke="#9C27B0" activeDot={{ r: 8 }} name="FTC HAPPY CALL" />
              <ReferenceLine y={88} stroke="#FFEB3B" strokeDasharray="3 3" >
                <Label
                  value="Meta: 88%"
                  position="right"
                  fill="#FFEB3B"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para PO IN HOME D+1 */}
      <h3 style={{ marginTop: '40px' }}>KPI: PO IN HOME D+1 (Últimas 4 Semanas Registradas) 📈</h3>
      {poInHomeD1Data.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "PO IN HOME D+1" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={poInHomeD1Data}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} /> {/* Assumindo que é uma porcentagem */}
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="PO IN HOME D+1" stroke="#3F51B5" activeDot={{ r: 8 }} name="PO IN HOME D+1" />
              <ReferenceLine y={70} stroke="#FFC107" strokeDasharray="3 3" >
                <Label
                  value="Meta: 70%"
                  position="right"
                  fill="#FFC107"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para VENDAS STORE+ */}
      <h3 style={{ marginTop: '40px' }}>KPI: VENDAS STORE+ (Últimas 4 Semanas Registradas) 📈</h3>
      {vendasStorePlusData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "VENDAS STORE+" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={vendasStorePlusData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="VENDAS STORE+" stroke="#00BCD4" activeDot={{ r: 8 }} name="VENDAS STORE+" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para TREINAMENTOS */}
      <h3 style={{ marginTop: '40px' }}>KPI: Treinamentos (Últimas 4 Semanas Registradas) 📈</h3>
      {treinamentosData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "Treinamentos" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={treinamentosData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="Treinamentos" stroke="#FF5722" activeDot={{ r: 8 }} name="Treinamentos" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para ORÇAMENTO */}
      <h3 style={{ marginTop: '40px' }}>KPI: Orçamento (Últimas 4 Semanas Registradas) 📈</h3>
      {orcamentoData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "Orçamento" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={orcamentoData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="Orçamento" stroke="#607D8B" activeDot={{ r: 8 }} name="Orçamento" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de Linha para FTC VD (Reintroduzido e populado corretamente) */}
      <h3 style={{ marginTop: '40px' }}>KPI: FTC VD (Últimas 4 Semanas Registradas) 📈</h3>
      {ftcVdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "FTC VD" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ftcVdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="FTC VD" stroke="#6633FF" activeDot={{ r: 8 }} name="FTC VD" />
              <ReferenceLine y={89} stroke="#FF9900" strokeDasharray="3 3" >
                <Label
                  value="Meta: 89%"
                  position="right"
                  fill="#FF9900"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de Linha para FTC DA (Reintroduzido e populado corretamente) */}
      <h3 style={{ marginTop: '40px' }}>KPI: FTC DA (Últimas 4 Semanas Registradas) 📈</h3>
      {ftcDaData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "FTC DA" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ftcDaData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="FTC DA" stroke="#FF66B2" activeDot={{ r: 8 }} name="FTC DA" />
              <ReferenceLine y={84} stroke="#00FFFF" strokeDasharray="3 3" >
                <Label
                  value="Meta: 84%"
                  position="right"
                  fill="#00FFFF"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de Linha para 1ST VISIT VD */}
      <h3 style={{ marginTop: '40px' }}>KPI: 1ST VISIT VD (Últimas 4 Semanas Registradas) 📈</h3>
      {firstVisitVdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "1ST VISIT VD" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={firstVisitVdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="1ST VISIT VD" stroke="#FFBB28" activeDot={{ r: 8 }} name="1ST VISIT VD" />
              <ReferenceLine y={20} stroke="#FF0000" strokeDasharray="3 3" >
                <Label
                  value="Meta: 20%"
                  position="right"
                  fill="#FF0000"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de Linha para IN HOME D+1 */}
      <h3 style={{ marginTop: '40px' }}>KPI: IN HOME D+1 (Últimas 4 Semanas Registradas) 📈</h3>
      {inHomeD1Data.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "IN HOME D+1" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={inHomeD1Data}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="IN HOME D+1" stroke="#00C49F" activeDot={{ r: 8 }} name="IN HOME D+1" />
              <ReferenceLine y={20} stroke="#FF4081" strokeDasharray="3 3" >
                <Label
                  value="Meta: 20%"
                  position="right"
                  fill="#FF4081"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para RRR VD % */}
      <h3 style={{ marginTop: '40px' }}>KPI: RRR VD % (Últimas 4 Semanas Registradas) 📈</h3>
      {rrrVdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "RRR VD %" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rrrVdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomLTPTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="RRR VD %" stroke="#8A2BE2" activeDot={{ r: 8 }} name="RRR VD %" />
              <ReferenceLine y={1.5} stroke="#008080" strokeDasharray="3 3" >
                <Label
                  value="Meta: 1.5%"
                  position="right"
                  fill="#008080"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para RRR DA % */}
      <h3 style={{ marginTop: '40px' }}>KPI: RRR DA % (Últimas 4 Semanas Registradas) 📈</h3>
      {rrrDaData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "RRR DA %" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rrrDaData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomLTPTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="RRR DA %" stroke="#A52A2A" activeDot={{ r: 8 }} name="RRR DA %" />
              <ReferenceLine y={3} stroke="#FFD700" strokeDasharray="3 3" >
                <Label
                  value="Meta: 3%"
                  position="right"
                  fill="#FFD700"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para R-NPS VD */}
      <h3 style={{ marginTop: '40px' }}>KPI: R-NPS VD (Últimas 4 Semanas Registradas) 📈</h3>
      {rnpsVdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "R-NPS VD" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rnpsVdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="R-NPS VD" stroke="#4682B4" activeDot={{ r: 8 }} name="R-NPS VD" />
              <ReferenceLine y={80} stroke="#9ACD32" strokeDasharray="3 3" >
                <Label
                  value="Meta: 80%"
                  position="right"
                  fill="#9ACD32"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para R-NPS DA */}
      <h3 style={{ marginTop: '40px' }}>KPI: R-NPS DA (Últimas 4 Semanas Registradas) 📈</h3>
      {rnpsDaData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "R-NPS DA" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rnpsDaData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 100]} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="R-NPS DA" stroke="#FF4500" activeDot={{ r: 8 }} name="R-NPS DA" />
              <ReferenceLine y={78} stroke="#ADFF2F" strokeDasharray="3 3" >
                <Label
                  value="Meta: 78%"
                  position="right"
                  fill="#ADFF2F"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para SSR VD */}
      <h3 style={{ marginTop: '40px' }}>KPI: SSR VD (Últimas 4 Semanas Registradas) 📈</h3>
      {ssrVdData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "SSR VD" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ssrVdData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="SSR VD" stroke="#BA55D3" activeDot={{ r: 8 }} name="SSR VD" />
              <ReferenceLine y={0.4} stroke="#800080" strokeDasharray="3 3" >
                <Label
                  value="Meta: 0.4%"
                  position="right"
                  fill="#800080"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Novo Gráfico de Linha para SSR DA */}
      <h3 style={{ marginTop: '40px' }}>KPI: SSR DA (Últimas 4 Semanas Registradas) 📈</h3>
      {ssrDaData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de "SSR DA" encontrado para as últimas 4 semanas.</p>
      ) : (
        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ssrDaData}
              margin={{
                top: 5,
                right: 50,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomPercentTooltip />} />
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="SSR DA" stroke="#FF00FF" activeDot={{ r: 8 }} name="SSR DA" />
              <ReferenceLine y={1.1} stroke="#FFA07A" strokeDasharray="3 3" >
                <Label
                  value="Meta: 1.1%"
                  position="right"
                  fill="#FFA07A"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela para Orçamento, Treinamentos, Vendas Store+ */}
      <h3 style={{ marginTop: '40px' }}>Outras Métricas por Semana ✅</h3>
      {treinamentosData.length === 0 ? ( // Podemos usar qualquer um dos novos dados para verificar se há semanas
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhum dado de Orçamento, Treinamentos ou Vendas Store+ encontrado para as últimas 4 semanas.</p>
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
            {treinamentosData.map((dataPoint, index) => ( // Usamos a primeira dataPoint, pois todas as arrays devem ter o mesmo Week
              <tr key={dataPoint.name} style={{ background: index % 2 === 0 ? '#2a2a2a' : '#3a3a3a' }}>
                <td style={{ padding: '10px', border: '1px solid #555' }}>{dataPoint.name}</td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>
                  {orcamentoData.find(item => item.name === dataPoint.name)?.['Orçamento'] || 'N/A'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>
                  {dataPoint['Treinamentos'] || 'N/A'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #555' }}>
                  {vendasStorePlusData.find(item => item.name === dataPoint.name)?.['VENDAS STORE+'] || 'N/A'}
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