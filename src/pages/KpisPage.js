import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Save, BarChart2, DollarSign, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import '../App.css';

function KpisForm() {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Tratamento dos dados: Substituir vírgula por ponto e converter para número
    const processedData = {};
    
    Object.keys(formData).forEach((key) => {
      let value = formData[key];
      
      if (typeof value === 'string') {
        value = value.replace(',', '.');
        const numberValue = parseFloat(value);
        if (!isNaN(numberValue)) {
          value = numberValue;
        }
      }
      processedData[key] = value;
    });

    try {
      await addDoc(collection(db, 'kpis'), {
        ...processedData,
        timestamp: serverTimestamp(),
      });
      alert('Dados de KPI salvos com sucesso! 🚀');
      
      setFormData({});
      e.target.reset();
      
    } catch (error) {
      console.error("Erro ao salvar KPI: ", error);
      alert('Erro ao salvar.');
    } finally {
        setLoading(false);
    }
  };

  // Estilo para os grupos de inputs
  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9em' };

  return (
    <div className="form-container" style={{ maxWidth: '100%', padding: '0 5px' }}>
      
      <form onSubmit={handleSubmit}>
        
        {/* SEMANA (DESTAQUE) */}
        <div className="cool-card" style={{ borderColor: '#00C49F' }}>
            <div className="cool-card-header">
                <span className="os-pill" style={{fontSize: '1em'}}>Configuração</span>
            </div>
            <div className="form-group" style={inputGroupStyle}>
                <label style={labelStyle}>Semana (Número):</label>
                <input 
                    className="app-input" 
                    type="number" 
                    name="week" 
                    onChange={handleChange} 
                    required 
                    placeholder="Ex: 42" 
                    style={{ fontSize: '1.2em', textAlign: 'center' }}
                />
            </div>
        </div>

        {/* INDICADORES DE QUALIDADE (LTP / RRR) */}
        <div className="cool-card">
            <div className="cool-card-header">
                <TrendingUp size={20} color="#4CAF50" />
                <span className="turno-pill">Qualidade Técnica</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>LTP VD %:</label>
                    <input className="app-input" type="text" name="LTP VD %" onChange={handleChange} placeholder="%" />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>LTP VD QTD:</label>
                    <input className="app-input" type="number" name="LTP VD QTD" onChange={handleChange} placeholder="Qtd" />
                </div>

                <div style={inputGroupStyle}>
                    <label style={labelStyle}>LTP DA %:</label>
                    <input className="app-input" type="text" name="LTP DA %" onChange={handleChange} placeholder="%" />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>LTP DA QTD:</label>
                    <input className="app-input" type="number" name="LTP DA QTD" onChange={handleChange} placeholder="Qtd" />
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>EX LTP VD %:</label>
                    <input className="app-input" type="text" name="EX LTP VD %" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>EX LTP VD QTD:</label>
                    <input className="app-input" type="number" name="EX LTP VD QTD" onChange={handleChange} />
                </div>
                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>EX LTP DA %:</label>
                    <input className="app-input" type="text" name="EX LPT DA %" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>EX LTP DA QTD:</label>
                    <input className="app-input" type="number" name="EX LRP DA QTD" onChange={handleChange} />
                </div>
            </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>RRR VD %:</label>
                    <input className="app-input" type="text" name="RRR VD %" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>RRR VD QTD:</label>
                    <input className="app-input" type="number" name="RRR VD QTD" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>RRR DA %:</label>
                    <input className="app-input" type="text" name="RRR DA %" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>RRR DA QTD:</label>
                    <input className="app-input" type="number" name="RRR DA QTD" onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* SATISFAÇÃO E SERVIÇO */}
        <div className="cool-card">
            <div className="cool-card-header">
                <CheckCircle size={20} color="#2196F3" />
                <span className="turno-pill">Satisfação & Serviço</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>R-NPS VD:</label>
                    <input className="app-input" type="text" name="R-NPS VD" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>R-NPS DA:</label>
                    <input className="app-input" type="text" name="R-NPS DA" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>SSR VD:</label>
                    <input className="app-input" type="text" name="SSR VD" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>SSR DA:</label>
                    <input className="app-input" type="text" name="SSR DA" onChange={handleChange} />
                </div>
            </div>

            <div style={{ marginTop: '10px' }}>
                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>ECO REPAIR VD:</label>
                    <input className="app-input" type="text" name="ECO REPAIR VD" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>FTC HAPPY CALL:</label>
                    <input className="app-input" type="text" name="FTC HAPPY CALL" onChange={handleChange} />
                </div>
                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>PO IN HOME D+1:</label>
                    <input className="app-input" type="text" name="PO IN HOME D+1" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>1ST VISIT VD:</label>
                    <input className="app-input" type="text" name="1ST VISIT VD" onChange={handleChange} />
                </div>
                 <div style={inputGroupStyle}>
                    <label style={labelStyle}>Perfect Agenda (IN HOME D+1):</label>
                    <input className="app-input" type="text" name="IN HOME D+1" onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* FAMÍLIA TAT */}
        <div className="cool-card">
            <div className="cool-card-header">
                <Clock size={20} color="#FF9800" />
                <span className="turno-pill">Família R-TAT</span>
            </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>R-TAT Geral:</label>
                    <input className="app-input" type="text" name="R-TAT" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>R-TAT VD CI:</label>
                    <input className="app-input" type="text" name="R-TAT VD CI" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>R-TAT VD IH:</label>
                    <input className="app-input" type="text" name="R-TAT VD IH" onChange={handleChange} />
                </div>
                <div style={inputGroupStyle}>
                    <label style={labelStyle}>R-TAT DA:</label>
                    <input className="app-input" type="text" name="R-TAT DA" onChange={handleChange} />
                </div>
            </div>
        </div>

        {/* OUTROS INDICADORES (Restaurados) */}
        <div className="cool-card">
             <div className="cool-card-header">
                <DollarSign size={20} color="#FF5722" />
                <span className="turno-pill">Financeiro & Outros</span>
            </div>
            <div style={inputGroupStyle}>
                <label style={labelStyle}>VENDAS STORE+:</label>
                <input className="app-input" type="number" name="VENDAS STORE+" onChange={handleChange} placeholder="Qtd" />
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>Treinamentos (%):</label>
                <input className="app-input" type="number" step="0.01" name="Treinamentos" onChange={handleChange} placeholder="%" />
            </div>

            <div style={inputGroupStyle}>
                <label style={labelStyle}>Orçamento (R$):</label>
                <input className="app-input" type="number" step="0.01" name="Orçamento" onChange={handleChange} placeholder="R$" />
            </div>
        </div>
        
        {/* BOTÃO SALVAR */}
        <button 
            type="submit" 
            className="btn-pill btn-finish" 
            style={{ 
                width: '100%', 
                minHeight: '50px', 
                fontSize: '1.1em',
                marginTop: '10px',
                marginBottom: '40px',
                justifyContent: 'center'
            }}
            disabled={loading}
        >
           {loading ? 'Salvando...' : <><Save size={20} /> Salvar KPIs</>} 
        </button>
      </form>
    </div>
  );
}

export default KpisForm;