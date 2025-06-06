import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label } from 'recharts';

function Dashboard() {
  const [rankedData, setRankedData] = useState([]);
  const [ltpvdData, setLtpvdData] = useState([]);
  const [ltpdaData, setLtpdaData] = useState([]);
  const [exltpvdData, setExltpvdData] = useState([]); // Novo estado para EX LTP VD
  const [exltpdaData, setExltpdaData] = useState([]); // Novo estado para EX LTP DA
  const [ftcVdData, setFtcVdData] = useState([]);     // Novo estado para FTC VD
  const [ftcDaData, setFtcDaData] = useState([]);     // Novo estado para FTC DA
  const [firstVisitVdData, setFirstVisitVdData] = useState([]);
  const [inHomeD1Data, setInHomeD1Data] = useState([]);
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

        // --- Lógica para buscar os KPIs das últimas 4 semanas para todos os gráficos ---
        const kpisCollectionRef = collection(db, 'kpis');
        const q = query(kpisCollectionRef, orderBy('timestamp', 'desc'), limit(4));

        const unsubscribeKpis = onSnapshot(q, (snapshot) => {
          const fetchedLtpvdData = [];
          const fetchedLtpdaData = [];
          const fetchedExLtpvdData = []; // Array para EX LTP VD
          const fetchedExLtpdaData = []; // Array para EX LTP DA
          const fetchedFtcVdData = [];   // Array para FTC VD
          const fetchedFtcDaData = [];   // Array para FTC DA
          const fetchedFirstVisitVdData = [];
          const fetchedInHomeD1Data = [];

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
            fetchedExLtpvdData.push({ // Popula dados para EX LTP VD
                name: `Semana ${data.week}`,
                'EX LTP VD %': parseFloat(data['EX LTP VD %']),
                'EX LTP VD QTD': parseFloat(data['EX LTP VD QTD']),
            });
            fetchedExLtpdaData.push({ // Popula dados para EX LTP DA
                name: `Semana ${data.week}`,
                'EX LPT DA %': parseFloat(data['EX LPT DA %']), // Atenção ao campo 'EX LPT DA %' no Firebase
                'EX LRP DA QTD': parseFloat(data['EX LRP DA QTD']), // Atenção ao campo 'EX LRP DA QTD' no Firebase
            });
            fetchedFtcVdData.push({   // Popula dados para FTC VD
                name: `Semana ${data.week}`,
                'FTC VD': parseFloat(data['FTC VD']),
            });
            fetchedFtcDaData.push({   // Popula dados para FTC DA
                name: `Semana ${data.week}`,
                'FTC DA': parseFloat(data['FTC DA']),
            });
            fetchedFirstVisitVdData.push({
                name: `Semana ${data.week}`,
                '1ST VISIT VD': parseFloat(data['1ST VISIT VD']),
            });
            fetchedInHomeD1Data.push({
                name: `Semana ${data.week}`,
                'IN HOME D+1': parseFloat(data['IN HOME D+1']),
            });
          });
          setLtpvdData(fetchedLtpvdData);
          setLtpdaData(fetchedLtpdaData);
          setExltpvdData(fetchedExLtpvdData); // Define o estado
          setExltpdaData(fetchedExLtpdaData); // Define o estado
          setFtcVdData(fetchedFtcVdData);     // Define o estado
          setFtcDaData(fetchedFtcDaData);     // Define o estado
          setFirstVisitVdData(fetchedFirstVisitVdData);
          setInHomeD1Data(fetchedInHomeD1Data);
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

  // Componente de Tooltip customizado para exibir a QTD (para gráficos LTP e EX LTP)
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
      } else if (dataKeyName === 'EX LPT DA %' && dataPoint['EX LRP DA QTD'] !== undefined) { // Corrigido para EX LPT DA % e EX LRP DA QTD
        qtdLabel = `EX LRP DA QTD: ${dataPoint['EX LRP DA QTD']}`;
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

  // Componente de Tooltip customizado para gráficos apenas de porcentagem (FTC, 1ST VISIT VD, IN HOME D+1)
  const CustomPercentTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#333',
          border: '1px solid #555',
          borderRadius: '5px',
          padding: '10px',
          color: '#e0e0e0'
        }}>
          <p className="label" style={{ color: '#007BFF', margin: 0, marginBottom: '5px' }}>{label}</p>
          <p style={{ margin: 0 }}>{`${payload[0].name}: ${payload[0].value}%`}</p>
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
              <Tooltip content={<CustomLTPTooltip />} /> {/* Usa CustomLTPTooltip para mostrar QTD */}
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="EX LTP VD %" stroke="#3366FF" activeDot={{ r: 8 }} name="EX LTP VD %" /> {/* Nova cor */}
              <ReferenceLine y={1.44} stroke="#FFCC00" strokeDasharray="3 3" > {/* Meta 1.44% */}
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
              <Tooltip content={<CustomLTPTooltip />} /> {/* Usa CustomLTPTooltip para mostrar QTD */}
              <Legend wrapperStyle={{ color: '#e0e0e0', textAlign: 'center' }} />
              <Line type="monotone" dataKey="EX LPT DA %" stroke="#CC0066" activeDot={{ r: 8 }} name="EX LTP DA %" /> {/* Nova cor e dataKey */}
              <ReferenceLine y={1.50} stroke="#99FF00" strokeDasharray="3 3" > {/* Meta 1.50% */}
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

      {/* Novo Gráfico de Linha para FTC VD */}
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
              <Line type="monotone" dataKey="FTC VD" stroke="#6633FF" activeDot={{ r: 8 }} name="FTC VD" /> {/* Nova cor */}
              <ReferenceLine y={89} stroke="#FF9900" strokeDasharray="3 3" > {/* Meta 89% */}
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

      {/* Novo Gráfico de Linha para FTC DA */}
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
              <Line type="monotone" dataKey="FTC DA" stroke="#FF66B2" activeDot={{ r: 8 }} name="FTC DA" /> {/* Nova cor */}
              <ReferenceLine y={84} stroke="#00FFFF" strokeDasharray="3 3" > {/* Meta 84% */}
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
              <ReferenceLine y={25} stroke="#FF4081" strokeDasharray="3 3" >
                <Label
                  value="Meta: 25%"
                  position="right"
                  fill="#FF4081"
                  style={{ fontSize: '0.8em', textAnchor: 'start' }}
                />
              </ReferenceLine>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default Dashboard;