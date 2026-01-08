import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, getDocs, query, orderBy, addDoc, serverTimestamp, 
  limit, onSnapshot, where, doc, updateDoc 
} from 'firebase/firestore';

// Estilos
const styles = {
  container: { padding: '20px', color: '#fff', maxWidth: '1200px', margin: '0 auto' },
  header: { borderBottom: '2px solid #00C49F', paddingBottom: '10px', marginBottom: '20px' },
  section: { background: '#333', padding: '20px', borderRadius: '8px', marginBottom: '20px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, minWidth: '200px' },
  label: { color: '#ccc', fontSize: '0.9em' },
  select: { padding: '10px', borderRadius: '4px', border: '1px solid #555', background: '#222', color: '#fff' },
  textArea: { width: '100%', height: '100px', background: '#222', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '10px', marginTop: '10px' },
  button: { padding: '10px 20px', background: '#00C49F', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  secondaryButton: { padding: '5px 15px', background: '#555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' },
  routeCard: { background: '#2a2a2a', border: '1px solid #444', borderRadius: '8px', padding: '15px', marginBottom: '15px' },
  routeHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  orderList: { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' },
  orderItem: (completed) => ({
    padding: '5px', background: completed ? 'rgba(0, 196, 159, 0.1)' : '#333', 
    textDecoration: completed ? 'line-through' : 'none', 
    color: completed ? '#888' : '#fff', 
    border: '1px solid #444', borderRadius: '4px', fontSize: '0.85em'
  })
};

const Rotas = () => {
  // --- ESTADOS DE INPUT ---
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedCar, setSelectedCar] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [pastedText, setPastedText] = useState('');
  
  // --- ESTADOS DE CONTROLE ---
  const [processing, setProcessing] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState(null); // ID da rota sendo editada
  const [routesHistory, setRoutesHistory] = useState([]); // Lista das últimas 30 rotas
  const [completedOrders, setCompletedOrders] = useState([]); // Lista de OSs que já estão em 'ordensDeServico'

  // 1. Carregar Técnicos e Histórico de Rotas
  useEffect(() => {
    // Carregar Técnicos
    const fetchTechs = async () => {
      const q = query(collection(db, 'technicianStats'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      setTechnicians(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTechs();

    // Listener para as últimas 30 rotas (Coleção Pai 'controleRotas')
    const qRoutes = query(collection(db, 'controleRotas'), orderBy('createdAt', 'desc'), limit(30));
    const unsubRoutes = onSnapshot(qRoutes, (snap) => {
      const routes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRoutesHistory(routes);
    });

    // Listener Global para ordens concluídas (Coleção 'ordensDeServico')
    // *Otimização:* Em produção, ideal filtrar por data recente para não baixar tudo.
    const qCompleted = query(collection(db, 'ordensDeServico'), limit(500)); // Limite de segurança
    const unsubCompleted = onSnapshot(qCompleted, (snap) => {
      const completedOS = snap.docs.map(d => d.data().numeroOS);
      setCompletedOrders(completedOS);
    });

    return () => {
      unsubRoutes();
      unsubCompleted();
    };
  }, []);

  // 2. Preencher formulário ao clicar em "Editar Rota"
  const handleEditRoute = (route) => {
    setEditingRouteId(route.id);
    setSelectedTech(route.tecnico);
    setSelectedCar(route.carro);
    setSelectedDriver(route.motorista);
    setPastedText(''); // Limpa para nova colagem
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRouteId(null);
    setPastedText('');
    setSelectedTech('');
    setSelectedCar('');
    setSelectedDriver('');
  };

  // 3. Processar e Enviar
  const handleProcess = async () => {
    if (!selectedTech || !pastedText) {
      alert("Selecione um técnico e cole as ordens.");
      return;
    }

    setProcessing(true);
    
    // Parse do texto colado
    const rows = pastedText.trim().split('\n').map(r => r.split('\t'));
    const newOrders = rows.filter(r => r.length > 0 && r[0]); // Filtra vazios

    if (newOrders.length === 0) {
      setProcessing(false);
      return;
    }

    try {
      let routeId = editingRouteId;
      let routeRef;

      // Se NÃO estiver editando, cria uma NOVA rota (Cabeçalho)
      if (!routeId) {
        const routeData = {
          tecnico: selectedTech,
          carro: selectedCar,
          motorista: selectedDriver,
          createdAt: serverTimestamp(),
          status: 'Aberta',
          totalOrdens: newOrders.length,
          ordensLista: newOrders.map(r => r[0]) // Array simples de OSs para facilitar busca local
        };
        routeRef = await addDoc(collection(db, 'controleRotas'), routeData);
        routeId = routeRef.id;
      } else {
        // Se estiver editando, atualiza a existente
        routeRef = doc(db, 'controleRotas', routeId);
        // Precisamos ler a rota antiga para somar as ordensLista (opcional, mas bom para integridade)
        const oldRouteSnap = await getDocs(query(collection(db, 'rotasAgendadas', selectedTech, 'novas'), where('rotaId', '==', routeId)));
        // Simplificação: apenas atualiza timestamp
        await updateDoc(routeRef, { 
          updatedAt: serverTimestamp(),
          // Em um app real, você atualizaria o array 'ordensLista' aqui com arrayUnion
        });
      }

      // Adiciona as ordens individuais na coleção de trabalho 'rotasAgendadas'
      const batchPromises = newOrders.map(async (row) => {
        const orderData = {
          numeroOS: row[0],
          cliente: row[1] || '',
          endereco: row[2] || '',
          servico: row[3] || '',
          tecnico: selectedTech,
          rotaId: routeId, // Vínculo com o pai
          status: 'Pendente',
          createdAt: new Date().toISOString()
        };
        // Salva na subcoleção do técnico
        return addDoc(collection(db, 'rotasAgendadas', selectedTech, 'novas'), orderData);
      });

      await Promise.all(batchPromises);

      // Se estava editando, atualiza a lista de ordens da rota localmente ou via refresh
      if (editingRouteId) {
        // Lógica extra se quiser atualizar o contador da rota pai
        alert(`Adicionadas ${newOrders.length} ordens à rota existente!`);
      } else {
        alert("Nova rota gerada com sucesso!");
      }

      // Limpar formulário
      setPastedText('');
      if (!editingRouteId) {
        setSelectedTech(''); // Só limpa técnico se for nova rota
      }
      
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar rota.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>Gestão de Rotas {editingRouteId ? '(Editando ✏️)' : '🆕'}</h2>

      {/* --- FORMULÁRIO --- */}
      <div style={styles.section}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Técnico</label>
            <select 
              style={styles.select} 
              value={selectedTech} 
              onChange={e => setSelectedTech(e.target.value)}
              disabled={!!editingRouteId} // Trava técnico na edição
            >
              <option value="">Selecione...</option>
              {technicians.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Carro</label>
            <select style={styles.select} value={selectedCar} onChange={e => setSelectedCar(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="Fiat Uno">Fiat Uno</option>
              <option value="Fiorino">Fiorino</option>
            </select>
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Motorista</label>
            <select style={styles.select} value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="Motorista 1">Motorista 1</option>
              <option value="Motorista 2">Motorista 2</option>
            </select>
          </div>
        </div>

        <label style={styles.label}>Cole a tabela do Excel aqui (OS | Cliente | Endereço | Serviço):</label>
        <textarea 
          style={styles.textArea}
          value={pastedText}
          onChange={e => setPastedText(e.target.value)}
          placeholder="Cole aqui..."
        />

        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          <button style={styles.button} onClick={handleProcess} disabled={processing}>
            {processing ? 'Processando...' : (editingRouteId ? 'ADICIONAR À ROTA' : 'GERAR ROTA')}
          </button>
          
          {editingRouteId && (
            <button style={{ ...styles.button, background: '#d9534f' }} onClick={handleCancelEdit}>
              CANCELAR EDIÇÃO
            </button>
          )}
        </div>
      </div>

      {/* --- LISTA DAS ÚLTIMAS 30 ROTAS --- */}
      <h3 style={{ borderBottom: '1px solid #555', paddingBottom: '10px' }}>Últimas Rotas</h3>
      
      <div>
        {routesHistory.map(route => (
          <RouteCard 
            key={route.id} 
            route={route} 
            completedOrders={completedOrders}
            onEdit={() => handleEditRoute(route)}
          />
        ))}
        {routesHistory.length === 0 && <p style={{ color: '#888' }}>Nenhuma rota encontrada.</p>}
      </div>
    </div>
  );
};

// Componente Interno para cada Cartão de Rota
const RouteCard = ({ route, completedOrders, onEdit }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega as ordens ESPECÍFICAS dessa rota
  useEffect(() => {
    const q = query(
      collection(db, 'rotasAgendadas', route.tecnico, 'novas'), 
      where('rotaId', '==', route.id)
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [route.id, route.tecnico]);

  // Verifica progresso
  // Uma ordem está completa se seu 'numeroOS' estiver na lista 'completedOrders' (que vem de ordensDeServico)
  const completedCount = orders.filter(o => completedOrders.includes(String(o.numeroOS))).length;
  const totalCount = orders.length;
  const isFinished = totalCount > 0 && completedCount === totalCount;

  return (
    <div style={{ 
      ...styles.routeCard, 
      borderColor: isFinished ? '#00C49F' : '#444',
      opacity: isFinished ? 0.8 : 1 
    }}>
      <div style={styles.routeHeader}>
        <div>
          <strong style={{ fontSize: '1.1em', color: '#00C49F' }}>{route.tecnico}</strong>
          <span style={{ color: '#888', marginLeft: '10px', fontSize: '0.9em' }}>
            {route.createdAt?.toDate().toLocaleDateString()} - {route.carro}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ 
            fontSize: '0.9em', 
            color: isFinished ? '#00C49F' : '#ccc',
            fontWeight: 'bold'
          }}>
            {isFinished ? 'CONCLUÍDA ✅' : `${completedCount}/${totalCount} Concluídas`}
          </span>
          
          {!isFinished && (
            <button style={styles.secondaryButton} onClick={onEdit}>
              EDITAR ✏️
            </button>
          )}
        </div>
      </div>

      {/* Lista de Ordens da Rota */}
      {loading ? <p style={{ fontSize: '0.8em', color: '#888' }}>Carregando ordens...</p> : (
        <ul style={styles.orderList}>
          {orders.map(order => {
            // Verifica se ESSA ordem específica está concluída (está na coleção ordensDeServico)
            const isDone = completedOrders.includes(String(order.numeroOS));
            
            return (
              <li key={order.id} style={styles.orderItem(isDone)}>
                <strong>{order.numeroOS}</strong><br/>
                <span style={{ fontSize: '0.8em' }}>{order.cliente || 'Sem cliente'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Rotas;