import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs } from 'firebase/firestore'; // Usaremos getDocs para buscar todas as coleções de técnicos

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      const tempDashboardData = {};

      try {
        // 1. Obter todos os documentos da coleção principal 'ordensDeServico' (que são os documentos dos técnicos)
        const tecnicoCollectionRef = collection(db, 'ordensDeServico');
        const tecnicoSnapshot = await getDocs(tecnicoCollectionRef);

        const fetchPromises = tecnicoSnapshot.docs.map(async (tecnicoDoc) => {
          const tecnicoNome = tecnicoDoc.id; // O ID do documento é o nome do técnico
          tempDashboardData[tecnicoNome] = {};

          // 2. Para cada técnico, obter os documentos da subcoleção 'osPorData'
          const osPorDataCollectionRef = collection(tecnicoDoc.ref, 'osPorData');
          const osPorDataSnapshot = await getDocs(osPorDataCollectionRef);

          const datePromises = osPorDataSnapshot.docs.map(async (dateDoc) => {
            const date = dateDoc.id; // O ID do documento é a data (AAAA-MM-DD)
            let total = 0;
            let samsung = 0;
            let assurant = 0;
            const ordens = [];

            // 3. Para cada data, obter os documentos da subcoleção 'ordens'
            const ordensCollectionRef = collection(dateDoc.ref, 'ordens');
            const ordensSnapshot = await getDocs(ordensCollectionRef);

            ordensSnapshot.forEach((osDoc) => {
              const os = osDoc.data();
              total++;
              if (os.tipoOS === 'samsung') {
                samsung++;
              } else if (os.tipoOS === 'assurant') {
                assurant++;
              }
              ordens.push({ id: osDoc.id, ...os });
            });

            tempDashboardData[tecnicoNome][date] = { total, samsung, assurant, ordens };
          });
          await Promise.all(datePromises);
        });

        await Promise.all(fetchPromises);
        setDashboardData(tempDashboardData);
        setLoading(false);
      } catch (err) {
        console.error("Erro ao buscar dados do Firebase: ", err);
        setError("Erro ao carregar dados. Verifique sua conexão ou as permissões do Firebase.");
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Você pode adicionar um intervalo para atualizar os dados periodicamente, mas para este tipo de dashboard
    // um fetch ao carregar o componente é geralmente suficiente, ou adicionar um botão de "atualizar".
    // const interval = setInterval(fetchDashboardData, 60000); // Atualiza a cada minuto
    // return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#e0e0e0' }}>Carregando dados do Firebase...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>;
  }

  return (
    <div className="output" style={{ marginTop: '20px' }}>
      <h3>Análise de Ordens de Serviço por Técnico e Data ✅</h3>
      {Object.keys(dashboardData).length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhuma ordem de serviço encontrada.</p>
      ) : (
        Object.keys(dashboardData).sort().map((tecnico) => (
          <div key={tecnico} style={{ marginBottom: '20px', border: '1px solid #444', padding: '15px', borderRadius: '8px' }}>
            <h4>Técnico: {tecnico}</h4>
            {Object.keys(dashboardData[tecnico]).sort().map((date) => (
              <div key={date} style={{ marginLeft: '15px', marginTop: '10px', borderLeft: '2px solid #007BFF', paddingLeft: '10px' }}>
                <h5>Data: {date}</h5>
                <p>Total de OS: {dashboardData[tecnico][date].total}</p>
                <p>OS Samsung: {dashboardData[tecnico][date].samsung}</p>
                <p>OS Assurant: {dashboardData[tecnico][date].assurant}</p>
                {/* Opcional: Mostrar detalhes de cada OS */}
                <details>
                   <summary>Ver detalhes das OS ({dashboardData[tecnico][date].ordens.length})</summary>
                   <ul style={{ listStyleType: 'none', padding: '0', margin: '10px 0 0 0' }}>
                     {dashboardData[tecnico][date].ordens.map((os) => (
                       <li key={os.id} style={{ fontSize: '0.9em', marginBottom: '5px', background: '#3a3f4a', padding: '8px', borderRadius: '4px' }}>
                         <strong>OS:</strong> {os.numeroOS} <br/>
                         <strong>Cliente:</strong> {os.cliente} <br/>
                         <strong>Tipo:</strong> {os.tipoOS} <br/>
                         {os.defeito && <span><strong>Defeito:</strong> {os.defeito} <br/></span>}
                         {os.reparo && <span><strong>Reparo:</strong> {os.reparo} <br/></span>}
                         {os.pecaSubstituida && <span><strong>Peça:</strong> {os.pecaSubstituida} <br/></span>}
                         {os.observacoes && <span><strong>Obs:</strong> {os.observacoes}</span>}
                       </li>
                     ))}
                   </ul>
                 </details>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

export default Dashboard;