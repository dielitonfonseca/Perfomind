import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

function KpisForm() {
  const [formData, setFormData] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'kpis'), {
        ...formData,
        timestamp: serverTimestamp(),
      });
      alert('Dados de KPI salvos com sucesso!');
      setFormData({}); // Limpar formulário
    } catch (error) {
      console.error("Erro ao salvar KPI: ", error);
      alert('Erro ao salvar.');
    }
  };

  return (
    <div className="form-container">
      <h2>Cadastrar Metas Semanais (KPIs) 📈</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Semana (Número):</label>
          <input type="number" name="week" onChange={handleChange} required placeholder="Ex: 42" />
        </div>

        <h3>Indicadores Principais</h3>
        
        <label>LTP VD %:</label>
        <input type="number" step="0.01" name="LTP VD %" onChange={handleChange} />
        
        <label>LTP VD QTD:</label>
        <input type="number" name="LTP VD QTD" onChange={handleChange} />

        <label>LTP DA %:</label>
        <input type="number" step="0.01" name="LTP DA %" onChange={handleChange} />
        
        <label>LTP DA QTD:</label>
        <input type="number" name="LTP DA QTD" onChange={handleChange} />

        <label>EX LTP VD %:</label>
        <input type="number" step="0.01" name="EX LTP VD %" onChange={handleChange} />

        <label>EX LTP VD QTD:</label>
        <input type="number" name="EX LTP VD QTD" onChange={handleChange} />

        <label>EX LPT DA %:</label>
        <input type="number" step="0.01" name="EX LPT DA %" onChange={handleChange} />

        <label>EX LRP DA QTD:</label>
        <input type="number" name="EX LRP DA QTD" onChange={handleChange} />

        <label>RRR VD %:</label>
        <input type="number" step="0.01" name="RRR VD %" onChange={handleChange} />
        
        <label>RRR VD QTD:</label>
        <input type="number" name="RRR VD QTD" onChange={handleChange} />

        <label>RRR DA %:</label>
        <input type="number" step="0.01" name="RRR DA %" onChange={handleChange} />
        
        <label>RRR DA QTD:</label>
        <input type="number" name="RRR DA QTD" onChange={handleChange} />
        
        <label>R-NPS VD:</label>
        <input type="number" step="0.01" name="R-NPS VD" onChange={handleChange} />

        <label>R-NPS DA:</label>
        <input type="number" step="0.01" name="R-NPS DA" onChange={handleChange} />

        <label>SSR VD:</label>
        <input type="number" step="0.01" name="SSR VD" onChange={handleChange} />

        <label>SSR DA:</label>
        <input type="number" step="0.01" name="SSR DA" onChange={handleChange} />

        <label>ECO REPAIR VD:</label>
        <input type="number" step="0.01" name="ECO REPAIR VD" onChange={handleChange} />

        <label>FTC HAPPY CALL:</label>
        <input type="number" step="0.01" name="FTC HAPPY CALL" onChange={handleChange} />
        
        <label>PO IN HOME D+1:</label>
        <input type="number" step="0.01" name="PO IN HOME D+1" onChange={handleChange} />

        <label>1ST VISIT VD:</label>
        <input type="number" step="0.01" name="1ST VISIT VD" onChange={handleChange} />

        {/* Renomeado visualmente para Perfect Agenda, mas mantendo a key para compatibilidade se necessário, ou pode mudar a key se desejar resetar o histórico deste campo */}
        <label>Perfect Agenda (IN HOME D+1):</label>
        <input type="number" step="0.01" name="IN HOME D+1" onChange={handleChange} />

        {/* NOVOS CAMPOS SOLICITADOS */}
        <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '10px' }}>
            <h4 style={{marginTop: 0, color: '#aaa'}}>Família R-TAT</h4>
            
            <label>R-TAT:</label>
            <input type="number" step="0.01" name="R-TAT" onChange={handleChange} placeholder="Geral" />

            <label>R-TAT VD CI:</label>
            <input type="number" step="0.01" name="R-TAT VD CI" onChange={handleChange} />

            <label>R-TAT VD IH:</label>
            <input type="number" step="0.01" name="R-TAT VD IH" onChange={handleChange} />

            <label>R-TAT DA:</label>
            <input type="number" step="0.01" name="R-TAT DA" onChange={handleChange} />
        </div>
        
        <h3>Outros Indicadores</h3>

        <label>VENDAS STORE+:</label>
        <input type="number" name="VENDAS STORE+" onChange={handleChange} />

        <label>Treinamentos:</label>
        <input type="number" step="0.01" name="Treinamentos" onChange={handleChange} />

        <label>Orçamento (R$):</label>
        <input type="number" step="0.01" name="Orçamento" onChange={handleChange} />

        <button type="submit">Salvar KPIs 💾</button>
      </form>
    </div>
  );
}

export default KpisForm;