import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, getDocs, doc, updateDoc, getDoc, collectionGroup, where, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { MapPin, CheckCircle, XCircle, Calendar, ArrowRightCircle, AlertCircle } from 'lucide-react';
import '../App.css';

function MyRoutePage() {
  const [routes, setRoutes] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [techsFound, setTechsFound] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelItem, setCancelItem] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => { fetchRoutes(); }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'rotas')); 
      const snap = await getDocs(q);
      let allItems = [];
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (data.itens) {
            const itensComId = data.itens.map((item, idx) => ({ 
                ...item, docId: docSnap.id, idx: idx, tecnicoResponsavel: data.tecnicoResponsavel || item.tecnico
            }));
            allItems = [...allItems, ...itensComId];
        }
      });
      const techs = [...new Set(allItems.map(i => i.tecnicoResponsavel || i.tecnico))];
      setTechsFound(techs);
      
      const sorted = allItems.sort((a, b) => {
        const scoreA = a.status === 'pendente' ? 0 : 1;
        const scoreB = b.status === 'pendente' ? 0 : 1;
        return scoreA - scoreB;
      });

      setRoutes(sorted);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleNavigate = async (item, e) => {
    e.stopPropagation();
    const osNumber = (item.osOriginal || item.os || '').toString().trim();
    let destination = '';
    let foundInDb = false;

    if (item.latitude && item.longitude) {
        destination = `${item.latitude},${item.longitude}`;
        foundInDb = true;
    } 
    
    if (!foundInDb && osNumber) {
        try {
            const historyQuery = query(collectionGroup(db, 'historico'), where('osVinculada', '==', osNumber), limit(1));
            const historySnap = await getDocs(historyQuery);
            if (!historySnap.empty) {
                const data = historySnap.docs[0].data();
                if (data.latitude && data.longitude) {
                    destination = `${data.latitude},${data.longitude}`;
                    foundInDb = true;
                }
            } else {
                 const osQuery = query(collectionGroup(db, 'Samsung'), where('numeroOS', '==', osNumber), limit(1));
                 const osSnap = await getDocs(osQuery);
                 if(!osSnap.empty) {
                     const osData = osSnap.docs[0].data();
                     if (osData.localizacao && osData.localizacao.latitude) {
                         destination = `${osData.localizacao.latitude},${osData.localizacao.longitude}`;
                         foundInDb = true;
                     }
                 }
            }
        } catch (error) { console.warn("Erro busca GPS:", error); }
    }

    if (!foundInDb) {
        const queryAddress = `${item.bairro || ''}, ${item.cidade || ''}, ${item.endereco || ''}`;
        alert(`⚠️ Localização GPS não encontrada.\nRedirecionando para: ${item.bairro}`);
        destination = encodeURIComponent(queryAddress);
    }

    window.open(`https://www.google.com/maps/search/?api=1&query=${destination}`, '_blank');
  };

  const handleFinalize = (item, e) => {
    e.stopPropagation();
    navigate('/', { state: { routeData: item } });
  };

  const requestCancel = (item, e) => {
    e.stopPropagation();
    setCancelItem(item);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (!cancelReason) return alert('Digite o motivo!');
    try {
      const docRef = doc(db, 'rotas', cancelItem.docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const newItens = [...data.itens];
        newItens[cancelItem.idx] = { ...newItens[cancelItem.idx], status: 'cancelado', motivoCancelamento: cancelReason };
        await updateDoc(docRef, { itens: newItens });
        
        setRoutes(prev => {
            const updated = prev.map(r => (r.docId === cancelItem.docId && r.idx === cancelItem.idx) ? { ...r, status: 'cancelado', motivoCancelamento: cancelReason } : r);
            return updated.sort((a, b) => (a.status === 'pendente' ? 0 : 1) - (b.status === 'pendente' ? 0 : 1));
        });
        
        setShowCancelModal(false); setCancelReason(''); setCancelItem(null);
      }
    } catch (e) { console.error(e); }
  };

  const filteredRoutes = selectedTech ? routes.filter(r => (r.tecnicoResponsavel || r.tecnico) === selectedTech) : routes;

  return (
    <div className="page-container" style={{ paddingBottom: '90px' }}>
      
      {/* SELETOR DE TÉCNICO (LISTA NO TOPO) */}
      <div className="filter-header">
         <h2 className="page-title">Minha Rota</h2>
         <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} className="app-select tech-filter">
            <option value="">Todos os Técnicos</option>
            {techsFound.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? <div className="loading-spinner">Carregando...</div> : (
        <div className="route-list">
          {filteredRoutes.map((item, idx) => {
            let statusClass = 'border-pendente';
            if (item.status === 'concluido') { statusClass = 'border-concluido'; }
            else if (item.status === 'cancelado') { statusClass = 'border-cancelado'; }

            const showDate = item.visitDate && item.visitDate !== '00/00/0000';

            return (
              <div key={`${item.os}-${idx}`} className={`cool-card ${statusClass}`}>
                
                <div className="cool-card-header">
                    
                    {/* ESQUERDA: DATA (DESTAQUE) EM CIMA, OS EM BAIXO */}
                    <div className="header-left-stacked">
                        {showDate ? (
                            <div className="date-main-badge">
                                <Calendar size={13} /> {item.visitDate}
                            </div>
                        ) : (
                             // Espaço reservado se não houver data, ou ocultar
                             <div className="date-main-badge" style={{opacity:0.5, fontSize:'0.7em'}}>S/ Data</div>
                        )}
                        <span className="os-subtext">{item.osOriginal || item.os}</span>
                    </div>

                    {/* CENTRO: TURNO */}
                    <span className="turno-pill">{item.turno}</span>
                    
                    {/* DIREITA: APENAS TAT (SEM ÍCONE DE RELÓGIO) */}
                    <div className="header-right-status">
                        {item.tat && (
                            <div className="tat-badge">
                                {item.tat} <AlertCircle size={12} /> 
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="cool-card-body" style={{ cursor: 'default' }}>
                    <h3 className="client-name-large">{item.cliente}</h3>
                    <p className="address-detail">{item.bairro} • {item.cidade}</p>
                    <div className="meta-tags">
                        <span className="model-tag">{item.modelo}</span>
                        {item.tipoGarantia && <span className={`garantia-tag ${item.tipoGarantia}`}>{item.tipoGarantia}</span>}
                    </div>
                </div>

                <div className="cool-card-footer-grid">
                    {item.status === 'pendente' && (
                        <button className="btn-cancel" onClick={(e) => requestCancel(item, e)}>
                            Cancelar
                        </button>
                    )}
                    
                    <button className="btn-pill btn-go" onClick={(e) => handleNavigate(item, e)}>
                        <MapPin size={16} /> Ir
                    </button>

                    {item.status === 'pendente' && (
                        <button className="btn-pill btn-finish" onClick={(e) => handleFinalize(item, e)}>
                            Finalizar <ArrowRightCircle size={16} />
                        </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCancelModal && (
        <div className="modal-overlay">
            <div className="modal-content">
                <h3>Cancelar?</h3>
                <input 
                    className="app-input"
                    placeholder="Motivo (Ex: Cliente ausente)" 
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    autoFocus
                />
                <div className="modal-buttons">
                    <button className="btn-modern secondary" onClick={() => setShowCancelModal(false)}>Voltar</button>
                    <button className="btn-modern danger" onClick={confirmCancel}>Confirmar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default MyRoutePage;