import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { Save, FileSpreadsheet, Trash2, User, Calendar, Clock, AlertCircle } from 'lucide-react';
import formOptions from '../data/formOptions.json';
import '../App.css';

function ImportRoutesPage() {
  const [inputText, setInputText] = useState('');
  const [jsonResult, setJsonResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [existingRoutes, setExistingRoutes] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [manualTech, setManualTech] = useState('');

  const fetchRoutes = async () => {
    try {
      const q = query(collection(db, 'rotas'), orderBy('dataCriacao', 'desc'), limit(30));
      const snap = await getDocs(q);
      setExistingRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleDeleteRoute = async (id, dataRota) => {
    if (window.confirm(`Tem certeza que deseja excluir a rota do dia ${dataRota}?`)) {
      try {
        await deleteDoc(doc(db, 'rotas', id));
        setExistingRoutes(prev => prev.filter(r => r.id !== id));
      } catch (e) { alert("Erro ao excluir."); }
    }
  };

  const parseData = (rows) => {
    const finalTech = selectedTech === 'Outro' ? manualTech : selectedTech;
    return rows.map(item => ({
        os: item.os || `SEM-OS-${Math.floor(Math.random()*1000)}`,
        osOriginal: item.osOriginal || item.os || '',
        cliente: item.cliente || 'Cliente Desconhecido',
        tecnico: finalTech || item.tecnico || 'A definir',
        turno: item.turno || 'Comercial',
        cidade: item.cidade || '',
        bairro: item.bairro || '',
        modelo: item.modelo || '',
        tat: item.tat || '',
        tipoGarantia: item.tipoGarantia || 'OW',
        observacao: item.observacao || '',
        visitDate: item.visitDate || '00/00/0000',
        pecas: item.pecas || [],
        status: 'pendente',
        endereco: `${item.bairro || ''}, ${item.cidade || ''}`
    }));
  };

  const handlePasteProcess = () => {
    if (!inputText) return;
    const lines = inputText.split('\n');
    const processed = [];
    let currentBlockTech = '';

    const headerTerms = [
        'SO Nro.', 'ASC Job No.', 'Nome do Cliente', 'CONFIRMAÇÃO', 'TURNO', 
        'Cidade do Cliente', 'BAIRRO', 'Modelo', 'TAT', '1st Visit Date', 
        'PLACA:', 'MOTORISTA:'
    ];

    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      if (trimmedLine.toUpperCase().startsWith('TÉC:') || trimmedLine.toUpperCase().startsWith('TEC:')) {
          const splitTech = trimmedLine.split(':');
          if (splitTech[1]) currentBlockTech = splitTech[1].trim();
          return;
      }

      if (trimmedLine.includes('Nome do Cliente') || trimmedLine.includes('SO Nro.')) return;

      const cols = line.split('\t');
      if (cols.length < 3) return; 

      const pecas = [];
      if (cols[14] && cols[14].trim()) pecas.push(cols[14].trim());
      if (cols[16] && cols[16].trim()) pecas.push(cols[16].trim());

      processed.push({
        os: cols[0]?.trim(),
        cliente: cols[2]?.trim(),
        turno: cols[4]?.trim(),
        cidade: cols[5]?.replace('/', '').trim(),
        bairro: cols[6]?.replace('/', '').trim(),
        modelo: cols[7]?.trim(),
        tat: cols[8]?.trim(),
        visitDate: cols[9]?.trim(),
        tipoGarantia: cols[11]?.trim(),
        observacao: cols[13]?.trim(),
        tecnico: currentBlockTech,
        pecas: pecas
      });
    });

    setJsonResult(parseData(processed));
    if (currentBlockTech && !selectedTech) {
        alert(`Técnico detectado: ${currentBlockTech}.`);
    }
  };

  const saveRoute = async () => {
    if (jsonResult.length === 0) return;
    setLoading(true);
    try {
      const techFinal = selectedTech === 'Outro' ? manualTech : (selectedTech || jsonResult[0].tecnico);
      await addDoc(collection(db, 'rotas'), {
        dataCriacao: serverTimestamp(),
        dataRota: new Date().toISOString().split('T')[0],
        tecnicoResponsavel: techFinal,
        origem: 'importacao',
        itens: jsonResult.map(i => ({...i, tecnico: techFinal}))
      });
      alert('Rota salva! 🚀');
      setJsonResult([]);
      setInputText('');
      fetchRoutes();
    } catch (error) { alert('Erro ao salvar.'); } finally { setLoading(false); }
  };

  const bigButtonStyle = {
    minHeight: '50px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1rem',
    textAlign: 'center',
    width: '100%'
  };

  return (
    <div className="page-container" style={{ paddingBottom: '90px' }}>
      <h2 className="page-title"><Save size={24}/> Cadastrar Rota</h2>
      
      <div className="card-input">
        <label className="label-modern"><User size={16}/> Selecione o Técnico:</label>
        <select className="app-select" value={selectedTech} onChange={e => setSelectedTech(e.target.value)}>
            <option value="">-- Automático / Detectar do Texto --</option>
            {formOptions.technicians.map(t => <option key={t} value={t}>{t}</option>)}
            <option value="Outro">Outro...</option>
        </select>
        {selectedTech === 'Outro' && <input className="app-input mt-2" placeholder="Digite o nome" value={manualTech} onChange={e => setManualTech(e.target.value)} />}
      </div>

      <div className="card-input mt-3">
        <textarea className="app-textarea" rows="8" placeholder="Cole a rota aqui..." value={inputText} onChange={e => setInputText(e.target.value)} />
        <button className="btn-pill btn-go mt-2" onClick={handlePasteProcess} style={bigButtonStyle}>Processar Texto</button>
      </div>

      {jsonResult.length > 0 && (
        <div className="preview-container mt-4">
            <h3 style={{color:'#fff', marginBottom:'10px'}}>Prévia ({jsonResult.length})</h3>
            {jsonResult.map((item, idx) => (
               <div key={idx} className="cool-card border-pendente" style={{transform: 'scale(0.95)', opacity: 0.9}}>
                   <div className="cool-card-header">
                       {/* Esquerda: Data */}
                       <div className="header-left-meta">
                           {item.visitDate && item.visitDate !== '00/00/0000' && (
                                <div className="date-badge"><Calendar size={12} /> {item.visitDate}</div>
                           )}
                       </div>

                       <span className="turno-pill">{item.turno}</span>

                       {/* Direita: TAT | OS | Status */}
                       <div className="header-right-status">
                           {item.tat && (
                               <div className="tat-badge">{item.tat} <AlertCircle size={12} /></div>
                           )}
                           <span className="os-text-small">{item.osOriginal}</span>
                           <Clock size={20} className="icon-status pendente" />
                       </div>
                   </div>

                   <div className="cool-card-body">
                       <h3 className="client-name-large">{item.cliente}</h3>
                       <p className="address-detail">{item.bairro} • {item.cidade}</p>
                   </div>
               </div>
            ))}
            <button className="btn-pill btn-finish full-width mt-3" onClick={saveRoute} disabled={loading} style={bigButtonStyle}>Confirmar ✅</button>
        </div>
      )}

      {/* Lista de Rotas (Mantida igual ao anterior, omitida para brevidade) */}
      <div className="mt-4">
        <h3 style={{fontSize:'1.1em', marginBottom:'15px', color:'#ccc', marginLeft: '5px'}}>Últimas Importações</h3>
        {existingRoutes.map(route => (
            <div key={route.id} className="cool-card" style={{ padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 'bold' }}>
                        <Calendar size={16} color="#00C49F" /> 
                        {route.dataRota}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '0.9em' }}>
                        <User size={14} /> 
                        {route.tecnicoResponsavel || 'Geral'}
                    </div>
                    <div style={{ fontSize: '0.8em', color: '#888', marginTop: '2px' }}>
                        {route.itens ? `${route.itens.length} visitas` : '0 visitas'}
                    </div>
                </div>
                <button className="btn-icon danger" onClick={() => handleDeleteRoute(route.id, route.dataRota)} style={{ padding: '10px', borderRadius: '12px' }}>
                    <Trash2 size={20} />
                </button>
            </div>
        ))}
      </div>
    </div>
  );
}

export default ImportRoutesPage;