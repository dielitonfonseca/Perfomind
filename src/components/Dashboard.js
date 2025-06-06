import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, onSnapshot, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ReferenceLine, Label } from 'recharts';

function Dashboard() {
  const [rankedData, setRankedData] = useState([]);
  const [ltpvdData, setLtpvdData] = useState([]);
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

        // --- Lógica para buscar os KPIs das últimas 4 semanas ordenadas por timestamp ---
        const kpisCollectionRef = collection(db, 'kpis');
        const q = query(kpisCollectionRef, orderBy('timestamp', 'desc'), limit(4));

        const unsubscribeKpis = onSnapshot(q, (snapshot) => {
          const kpisData = [];
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            kpisData.push({
              name: `Semana ${data.week}`,
              'LTP VD %': parseFloat(data['LTP VD %']),
              'LTP VD QTD': parseFloat(data['LTP VD QTD']), // Adiciona a QTD para o gráfico
            });
          });
          setLtpvdData(kpisData); // Mantém a ordem da mais recente para a mais antiga
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

  // Componente de Tooltip customizado para exibir a QTD
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload; // Pega o objeto de dados completo para o ponto
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
          {dataPoint['LTP VD QTD'] !== undefined && ( // Verifica se a QTD existe
            <p style={{ margin: 0 }}>{`LTP VD QTD: ${dataPoint['LTP VD QTD']}`}</p>
          )}
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

      {/* Novo Gráfico de Linha para LTP VD % */}
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
                right: 80,
                left: 20,
                bottom: 5,
              }}
              style={{ backgroundColor: '#2c2f38', borderRadius: '8px' }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} />
              <YAxis stroke="#e0e0e0" tick={{ fill: '#e0e0e0' }} domain={[0, 'auto']} />
              <Tooltip content={<CustomTooltip />} /> {/* Usa o Tooltip customizado */}
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
    </div>
  );
}

export default Dashboard;