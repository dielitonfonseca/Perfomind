import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Save, BarChart2, DollarSign, Clock, CheckCircle, TrendingUp, Upload, FileText } from 'lucide-react';
import '../App.css';

// Função para quebrar linhas CSV respeitando aspas
function splitCSVRow(text, separator) {
    if (separator === '\t') return text.split('\t');
    let result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result.map(s => s.replace(/^"|"$/g, '').trim());
}

// Função de conversão e formatação estrita de valores
const parseValue = (val, type) => {
    if (typeof val !== 'string') return '';
    if (!val || val.trim() === '-' || val.trim() === '') return '';
    
    let cleanVal = val.trim().replace(',', '.');
    let hasPercent = cleanVal.includes('%');
    let numStr = cleanVal.replace(/[^0-9.-]/g, ''); // Remove caracteres estranhos, mantém ponto, número e negativo
    
    if (!numStr) return '';
    let num = parseFloat(numStr);

    if (isNaN(num)) return '';

    if (type === 'percent') {
        // Se vier do CSV puro como 0.9091 (sem %), multiplica por 100.
        if (!hasPercent && num <= 1 && num >= -1 && num !== 0 && cleanVal.indexOf('.') > -1) {
            num = num * 100;
        }
        return Number(num.toFixed(2));
    } else if (type === 'decimal') {
        return Number(num.toFixed(2));
    } else if (type === 'qtd') {
        return Math.round(num); // Quantidades devem ser inteiras
    }
    return num;
};

function KpisForm() {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  
  // Estados para importação
  const [importText, setImportText] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [importLoading, setImportLoading] = useState(false);

  const processCSVData = (text) => {
      // Identifica o separador (Tabulação para colado do Excel, Ponto e Vírgula ou Vírgula para arquivos CSV)
      const separator = text.indexOf('\t') !== -1 ? '\t' : (text.indexOf(';') !== -1 ? ';' : ',');
      const rows = text.split(/\r?\n/).map(row => splitCSVRow(row, separator));

      if (rows.length < 80) {
          alert("O texto colado ou arquivo parece incompleto. Selecione a planilha inteira (Ctrl+A).");
          setPreviewData([]);
          return; 
      }

      const targetCols = [18, 19, 20]; // Colunas 0-based: S=18, T=19, U=20
      const data = [];

      const weekRow = rows[4]; // S5, T5, U5 estão na linha 5 (index 4)
      if (!weekRow || weekRow.length < 21) {
          alert("Estrutura não reconhecida. Verifique se copiou a partir da coluna A.");
          setPreviewData([]);
          return;
      }

      targetCols.forEach(col => {
          const weekStr = weekRow[col];
          if (!weekStr) return;
          
          // Extrai apenas o número da semana (ex: "2026.12" -> 12)
          const weekParts = weekStr.trim().split('.');
          let weekNum = parseInt(weekParts.length > 1 ? weekParts[1] : weekParts[0], 10);
          
          if (isNaN(weekNum)) return;

          const weekObj = { week: weekNum };
          let count = 0;

          // Helper para extrair a célula exata (Linha no Excel - 1)
          const parseAndSet = (key, rowIdx, type) => {
              if (rows[rowIdx] && rows[rowIdx].length > col) {
                  const rawVal = rows[rowIdx][col];
                  const val = parseValue(rawVal, type);
                  if (val !== '') {
                      weekObj[key] = val; // Já vem convertido para número ou decimal fixo
                      count++;
                  }
              }
          };

          // Mapeamento exato das linhas baseado no Excel fornecido
          parseAndSet('LTP VD %', 15, 'percent'); // Linha 16
          parseAndSet('LTP VD QTD', 16, 'qtd');   // Linha 17
          parseAndSet('LTP DA %', 17, 'percent'); // Linha 18
          parseAndSet('LTP DA QTD', 18, 'qtd');   // Linha 19
          
          parseAndSet('FTC HAPPY CALL', 25, 'percent'); // Linha 26
          
          parseAndSet('1ST VISIT VD', 36, 'percent');   // Linha 37
          parseAndSet('IN HOME D+1', 37, 'percent');    // Perfect Agenda: Linha 38
          parseAndSet('R-TAT', 38, 'decimal');          // R-TAT Geral: Linha 39
          
          parseAndSet('R-TAT VD CI', 42, 'decimal');    // Linha 43
          parseAndSet('R-TAT VD IH', 43, 'decimal');    // Linha 44
          parseAndSet('R-TAT DA', 44, 'decimal');       // Linha 45
          
          parseAndSet('RRR VD %', 55, 'percent');       // C-RRR VD %: Linha 56
          parseAndSet('RRR VD QTD', 56, 'qtd');         // C-RRR VD QTD: Linha 57
          parseAndSet('RRR DA %', 57, 'percent');       // C-RRR DA %: Linha 58
          parseAndSet('RRR DA QTD', 58, 'qtd');         // C-RRR DA QTD: Linha 59
          
          parseAndSet('ECO REPAIR VD', 61, 'percent');  // Linha 62
          parseAndSet('PO IN HOME D+1', 75, 'percent'); // Linha 76
          
          parseAndSet('R-NPS VD', 84, 'percent');       // Linha 85
          parseAndSet('R-NPS DA', 85, 'percent');       // Linha 86

          if (count > 0) {
              data.push(weekObj);
          }
      });

      setPreviewData(data);
  };

  const handleTextImport = (val) => {
      setImportText(val);
      if (val.trim().length > 200) {
          processCSVData(val);
      } else {
          setPreviewData([]);
      }
  };

  const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          const content = evt.target.result;
          setImportText("Arquivo CSV carregado com sucesso. Analisando dados...");
          processCSVData(content);
      };
      reader.readAsText(file);
  };

  const confirmImport = async () => {
      if (previewData.length === 0) return;
      setImportLoading(true);
      try {
          for (const data of previewData) {
              await addDoc(collection(db, 'kpis'), {
                  ...data,
                  timestamp: serverTimestamp(),
              });
          }
          alert(`✅ ${previewData.length} Semanas cadastradas automaticamente com sucesso!`);
          setImportText('');
          setPreviewData([]);
      } catch (error) {
          console.error(error);
          alert('Erro ao salvar os dados no banco.');
      } finally {
          setImportLoading(false);
      }
  };

  // Funções do formulário manual
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
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

  const inputGroupStyle = { marginBottom: '15px' };
  const labelStyle = { display: 'block', marginBottom: '5px', color: '#ccc', fontSize: '0.9em' };

  return (
    <div className="form-container" style={{ maxWidth: '100%', padding: '0 5px' }}>
      
      {/* ----------------- MÓDULO DE IMPORTAÇÃO AUTOMÁTICA ----------------- */}
      <div className="cool-card" style={{ borderColor: '#00C49F', marginBottom: '30px' }}>
          <div className="cool-card-header">
              <FileText size={20} color="#00C49F" />
              <span className="turno-pill" style={{ background: '#00C49F', color: '#000' }}>Importação Automática</span>
          </div>
          <p style={{ color: '#aaa', fontSize: '0.85em', marginTop: '10px' }}>
              Abra a planilha enviada, aperte <strong>Ctrl+A</strong> (para selecionar tudo), depois <strong>Ctrl+C</strong> (copiar), e cole o conteúdo na caixa abaixo. Você também pode enviar o arquivo CSV se preferir.
          </p>
          
          <textarea 
              className="app-input custom-scrollbar" 
              placeholder="Cole o texto copiado do Excel aqui..." 
              value={importText}
              onChange={(e) => handleTextImport(e.target.value)}
              style={{ width: '100%', marginBottom: '10px', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8em', resize: 'vertical' }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <span style={{ fontSize: '0.85em', color: '#777' }}>Ou envie o CSV:</span>
              <input 
                  type="file" 
                  accept=".csv, .txt"
                  onChange={handleFileUpload}
                  style={{ fontSize: '0.8em', color: '#ccc' }}
              />
          </div>
          
          {previewData.length > 0 && (
              <div style={{ background: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px dashed #444', marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#00C49F' }}>Pré-visualização Pronta ({previewData.length} Semanas Encontradas)</h4>
                  <div className="custom-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                      {previewData.map(d => (
                          <div key={d.week} style={{ minWidth: '180px', background: '#2a2a2a', padding: '10px', borderRadius: '6px' }}>
                              <strong style={{ color: '#fff', display: 'block', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '5px' }}>
                                Semana {d.week}
                              </strong>
                              <ul style={{ margin: '0', paddingLeft: '0', listStyleType: 'none', color: '#aaa', fontSize: '0.8em' }}>
                                  {Object.entries(d).filter(([k])=> k !== 'week').map(([k, v]) => (
                                      <li key={k} style={{ marginBottom: '3px' }}>
                                          <strong style={{ color: '#888' }}>{k}:</strong> <span style={{ color: '#2196F3' }}>{v}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <button 
              type="button" 
              className="btn-pill" 
              onClick={confirmImport}
              disabled={previewData.length === 0 || importLoading}
              style={{ 
                  width: '100%', 
                  background: previewData.length > 0 ? '#00C49F' : '#555', 
                  color: previewData.length > 0 ? '#000' : '#888',
                  justifyContent: 'center',
                  cursor: previewData.length > 0 ? 'pointer' : 'not-allowed'
              }}
          >
              {importLoading ? 'Cadastrando no Banco...' : <><Upload size={20} /> Processar e Salvar KPIs</>}
          </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '30px', color: '#666', fontWeight: 'bold' }}>
          — OU PREENCHA MANUALMENTE ABAIXO —
      </div>

      {/* ----------------- FORMULÁRIO MANUAL ORIGINAL ----------------- */}
      <form onSubmit={handleSubmit}>
        
        <div className="cool-card">
            <div className="cool-card-header">
                <span className="os-pill" style={{fontSize: '1em'}}>Configuração Manual</span>
            </div>
            <div className="form-group" style={inputGroupStyle}>
                <label style={labelStyle}>Semana (Número):</label>
                <input 
                    className="app-input" 
                    type="number" 
                    name="week" 
                    onChange={handleChange} 
                    placeholder="Ex: 42" 
                    style={{ fontSize: '1.2em', textAlign: 'center' }}
                />
            </div>
        </div>

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
           {loading ? 'Salvando...' : <><Save size={20} /> Salvar KPIs Manualmente</>} 
        </button>
      </form>
    </div>
  );
}

export default KpisForm;