import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, onSnapshot, getDocs } from 'firebase/firestore'; // Importe doc e onSnapshot

function Dashboard() {
  const [rankedData, setRankedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Array para armazenar as funções de "unsubscribe" dos listeners
    // Isso é crucial para limpar os listeners quando o componente é desmontado
    const unsubscribes = [];

    const setupRealtimeListeners = async () => {
      try {
        const tecnicoCollectionRef = collection(db, 'ordensDeServico');

        // Listener na coleção principal de técnicos
        const unsubscribeTecnicos = onSnapshot(tecnicoCollectionRef, async (tecnicoSnapshot) => {
          const tempTechnicianStats = {};
          const innerPromises = []; // Para as promessas das subcoleções

          if (tecnicoSnapshot.empty) {
            setRankedData([]);
            setLoading(false);
            return;
          }

          tecnicoSnapshot.docs.forEach((tecnicoDoc) => {
            const tecnicoNome = tecnicoDoc.id;
            // Inicializa ou reseta os contadores para CADA TÉCNICO
            tempTechnicianStats[tecnicoNome] = {
              total: 0,
              samsung: 0,
              assurant: 0,
            };

            const osPorDataCollectionRef = collection(tecnicoDoc.ref, 'osPorData');

            // Listener em CADA subcoleção 'osPorData' para cada técnico
            // Isso garante que se uma nova data for adicionada, ela será ouvida
            const unsubscribeDatas = onSnapshot(osPorDataCollectionRef, async (osPorDataSnapshot) => {
              // Resetar contadores do técnico ao receber novas atualizações de datas/os
              let currentTecnicoTotalOS = 0;
              let currentTecnicoSamsungOS = 0;
              let currentTecnicoAssurantOS = 0;

              const dateInnerPromises = [];

              osPorDataSnapshot.docs.forEach((dateDoc) => {
                const samsungCollectionRef = collection(dateDoc.ref, 'Samsung');
                const assurantCollectionRef = collection(dateDoc.ref, 'Assurant');

                // Listener para a subcoleção 'Samsung' dentro de cada data
                dateInnerPromises.push(new Promise(resolve => {
                  const unsubscribeSamsung = onSnapshot(samsungCollectionRef, (samsungSnapshot) => {
                    let samsungCount = 0;
                    samsungSnapshot.forEach(() => {
                      samsungCount++;
                    });
                    // Atualiza a contagem temporariamente, que será consolidada depois
                    // Para evitar múltiplas atualizações de estado do React,
                    // acumulamos tudo e atualizamos uma vez.
                    resolve({ type: 'samsung', count: samsungCount });
                  });
                  unsubscribes.push(unsubscribeSamsung); // Adiciona para limpar
                }));

                // Listener para a subcoleção 'Assurant' dentro de cada data
                dateInnerPromises.push(new Promise(resolve => {
                  const unsubscribeAssurant = onSnapshot(assurantCollectionRef, (assurantSnapshot) => {
                    let assurantCount = 0;
                    assurantSnapshot.forEach(() => {
                      assurantCount++;
                    });
                    // Atualiza a contagem temporariamente
                    resolve({ type: 'assurant', count: assurantCount });
                  });
                  unsubscribes.push(unsubscribeAssurant); // Adiciona para limpar
                }));
              });

              // Aguarda todas as contagens de Samsung/Assurant para esta data
              const counts = await Promise.all(dateInnerPromises);
              counts.forEach(result => {
                if (result.type === 'samsung') {
                  currentTecnicoSamsungOS += result.count;
                  currentTecnicoTotalOS += result.count;
                } else if (result.type === 'assurant') {
                  currentTecnicoAssurantOS += result.count;
                  currentTecnicoTotalOS += result.count;
                }
              });

              // Atualiza o objeto de estatísticas do técnico após todas as datas/OSs serem contadas
              // É importante fazer isso aqui para cada vez que 'osPorDataSnapshot' mudar
              // Para garantir que a contagem total de OS de um técnico seja atualizada
              // em resposta a mudanças em *qualquer* data ou subcoleção de OS.
              // Este é um desafio com listeners aninhados e agregação.
              // A abordagem mais robusta para agregação em tempo real é Cloud Functions.

              // Para manter a agregação no cliente sem Cloud Functions, precisamos re-processar
              // todos os dados de um técnico se algo mudar em suas subcoleções.
              // Isso pode ser ineficiente para muitos dados.
              // Uma solução aqui é re-executar toda a lógica de contagem do técnico
              // ou usar um estado auxiliar para gerenciar as contagens parciais.

              // Devido à complexidade de múltiplos listeners aninhados que se afetam,
              // vamos simplificar a lógica do listener principal para re-calcular TUDO
              // a cada grande mudança, ou usar `getDocs` dentro do `onSnapshot` principal
              // para uma visão consistente.

              // Decisão: Manteremos o onSnapshot principal para técnicos,
              // e faremos `getDocs` nas subcoleções dentro dele.
              // Isso garante consistência, mas não é "tempo real" para as subcoleções individuais.
              // Mas o onSnapshot principal ainda re-acionará a cada nova ordem/técnico.
              // O cenário ideal para agregação em tempo real é com Cloud Functions.
            });
            unsubscribes.push(unsubscribeDatas); // Adiciona para limpar
          });

          // Re-execute a lógica de agregação completa para todos os técnicos
          // Sempre que a lista de técnicos muda ou o listener osPorData muda.
          // Isso é o que a versão anterior do useEffect fazia.
          // Com onSnapshot, a ideia é que o 'tecnicoSnapshot' já nos dê a visão mais recente.

          // === RE-IMPLEMENTANDO A LÓGICA DE CÁLCULO DE FORMA SÍNCRONA AQUI ===
          // Dentro do onSnapshot principal, vamos buscar os dados aninhados com getDocs
          // para garantir que pegamos o estado mais recente.
          const currentTechnicianStats = {};

          for (const tecnicoDoc of tecnicoSnapshot.docs) {
            const tecnicoNome = tecnicoDoc.id;
            let totalOS = 0;
            let samsungOS = 0;
            let assurantOS = 0;

            const osPorDataCollectionRef = collection(tecnicoDoc.ref, 'osPorData');
            const osPorDataSnapshot = await getDocs(osPorDataCollectionRef); // getDocs aqui para a visão atual

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
            ...currentTechnicianStats[tecnico]
          })).sort((a, b) => b.total - a.total);

          setRankedData(sortedTechnicians);
          setLoading(false);
          // ===================================================================

        }, (err) => { // Tratamento de erro para o onSnapshot
          console.error("Erro no listener de técnicos:", err);
          setError("Erro ao carregar dados em tempo real. Verifique as permissões do Firebase.");
          setLoading(false);
        });

        unsubscribes.push(unsubscribeTecnicos); // Adiciona o listener principal para limpeza

      } catch (err) {
        console.error("Erro ao configurar listeners do Firebase: ", err);
        setError("Erro ao carregar dados. Verifique sua conexão ou as permissões do Firebase.");
        setLoading(false);
      }
    };

    setupRealtimeListeners();

    // Função de limpeza: será executada quando o componente for desmontado
    return () => {
      console.log("Limpando listeners do Firebase...");
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, []); // O array de dependências vazio significa que o useEffect roda uma vez ao montar o componente

  if (loading) {
    return <div style={{ textAlign: 'center', color: '#e0e0e0' }}>Carregando dados do Firebase...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', color: 'red' }}>{error}</div>;
  }

  return (
    <div className="output" style={{ marginTop: '20px', textAlign: 'center' }}> {/* Adicionado text-align: center aqui */}
      <h3>Ranking de Ordens de Serviço por Técnico ✅</h3>
      {rankedData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#ccc' }}>Nenhuma ordem de serviço encontrada para o ranking.</p>
      ) : (
        // A tabela é um elemento de bloco, para centralizá-la, precisamos de margin: auto
        // e uma largura definida.
        <table style={{
          width: '80%', // Defina uma largura para a tabela
          borderCollapse: 'collapse',
          marginTop: '20px',
          marginLeft: 'auto', // Centraliza a tabela horizontalmente
          marginRight: 'auto'  // Centraliza a tabela horizontalmente
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
      )}
    </div>
  );
}

export default Dashboard;