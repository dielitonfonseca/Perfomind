import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

function ContelePage() {
  const [inputText, setInputText] = useState('');
  const [previewData, setPreviewData] = useState([]);

  // Função para limpar e processar o texto colado
  const parseData = (text) => {
    if (!text.trim()) return [];

    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    let headers = [];
    let foundHeader = false;

    // Tenta encontrar a linha de cabeçalho
    for (let line of lines) {
      const cols = line.split('\t');
      if (cols.some(c => c.toLowerCase().includes('nome do cliente') || c.toLowerCase().includes('rua'))) {
        headers = cols.map(c => c.trim().toLowerCase());
        foundHeader = true;
        break;
      }
    }

    if (!foundHeader) return [];

    const getIdx = (names) => {
      for (let name of names) {
        const idx = headers.findIndex(h => h.includes(name.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxMap = {
      nome: getIdx(['nome do cliente', 'cliente']),
      rua: getIdx(['rua', 'logradouro']),
      numero: getIdx(['numero', 'nro']),
      cep: getIdx(['cep']),
      cidade: getIdx(['cidade']),
      uf: getIdx(['uf', 'estado']),
      telefone: getIdx(['telefone de contato', 'telefone', 'celular']),
      bairro: getIdx(['bairro']),
      obs: getIdx(['observação', 'obs']),
      nroAsc: getIdx(['nro.asc', 'asc']),
      jobNo: getIdx(['job no.', 'job'])
    };

    const results = [];
    const seen = new Set();

    for (let line of lines) {
      const cols = line.split('\t');
      
      // Pula se for cabeçalho ou linha de metadados (técnico, motorista, etc)
      const lineLower = line.toLowerCase();
      if (lineLower.includes('nome do cliente') || 
          lineLower.includes('técnico') || 
          lineLower.includes('téc:') || 
          lineLower.includes('motorista') || 
          lineLower.includes('placa:') ||
          cols.length < 5) continue;

      const row = {
        nome: (cols[idxMap.nome] || '').trim(),
        rua: (cols[idxMap.rua] || '').trim(),
        numero: (cols[idxMap.numero] || '').trim(),
        cep: (cols[idxMap.cep] || '').trim(),
        cidade: (cols[idxMap.cidade] || '').trim(),
        uf: (cols[idxMap.uf] || '').trim(),
        telefone: (cols[idxMap.telefone] || '').trim(),
        bairro: (cols[idxMap.bairro] || '').trim(),
        obs: (cols[idxMap.obs] || '').trim(),
        nroAsc: (cols[idxMap.nroAsc] || '').trim(),
        jobNo: (cols[idxMap.jobNo] || '').trim()
      };

      // Chave única para evitar duplicados
      const key = `${row.nroAsc}-${row.jobNo}-${row.nome}`.toLowerCase();
      if (!seen.has(key) && row.nome) {
        seen.add(key);
        results.push(row);
      }
    }

    return results;
  };

  useEffect(() => {
    const parsed = parseData(inputText);
    setPreviewData(parsed);
  }, [inputText]);

  const handleConvert = () => {
    if (previewData.length === 0) {
      alert('Nenhum dado válido encontrado para converter.');
      return;
    }

    // Cabeçalhos do CSV Contele
    const csvHeaders = [
      'Razão social', 'Nome Fantasia *', 'Rua (nome completo)*', 'Número *', 
      'Complemento', 'Bairro', 'CEP*', 'Cidade *', 'UF *', 'CPF/CNPJ', 
      'Observação', 'Categoria', 'Carteiras', 'Nome do contato', 'Email', 
      'Telefone de contato', 'Etiquetas'
    ];

    const csvRows = previewData.map(row => [
      '', // Razão social
      row.nome, // Nome Fantasia *
      row.rua, // Rua (nome completo)*
      row.numero, // Número *
      '', // Complemento
      row.bairro, // Bairro
      row.cep, // CEP*
      row.cidade, // Cidade *
      row.uf, // UF *
      '', // CPF/CNPJ
      row.obs, // Observação
      '', // Categoria
      '', // Carteiras
      row.nome, // Nome do contato
      '', // Email
      row.telefone, // Telefone de contato
      '' // Etiquetas
    ]);

    // Monta o conteúdo do CSV
    const csvContent = [
      csvHeaders.join(';'),
      ...csvRows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    // Cria o download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `importacao_contele_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    if (window.confirm('Deseja limpar todos os dados?')) {
      setInputText('');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <div className="page-title">
        <FileText size={28} color="#00C49F" />
        <h2>Conversor Contele</h2>
      </div>

      <div style={{ background: '#2c2f38', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ color: '#ccc', fontWeight: 'bold' }}>
            Cole a planilha do Excel (com cabeçalhos):
          </label>
          {inputText && (
            <button 
              onClick={handleClear}
              style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}
            >
              <Trash2 size={16} /> Limpar
            </button>
          )}
        </div>
        
        <textarea
          className="app-textarea"
          rows="8"
          placeholder="Dica: Copie as colunas do Excel (incluindo o cabeçalho) e cole aqui..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          style={{ minHeight: '150px', marginBottom: '15px', fontSize: '0.9rem' }}
        />

        <button 
          className={`btn-modern primary full-width ${previewData.length === 0 ? 'disabled' : ''}`}
          onClick={handleConvert}
          disabled={previewData.length === 0}
        >
          <Download size={20} style={{ marginRight: '8px' }} />
          Converter e Baixar {previewData.length > 0 ? `(${previewData.length} clientes)` : '.csv'}
        </button>
      </div>

      {previewData.length > 0 && (
        <div className="preview-section" style={{ background: '#1e1e1e', borderRadius: '12px', padding: '20px', border: '1px solid #333' }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#00C49F', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle size={20} /> Pré-visualização dos Dados
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                  <th style={{ padding: '10px', color: '#888' }}>Cliente</th>
                  <th style={{ padding: '10px', color: '#888' }}>Endereço</th>
                  <th style={{ padding: '10px', color: '#888' }}>Cidade/UF</th>
                  <th style={{ padding: '10px', color: '#888' }}>Telefone</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #2a2a2a' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{row.nome}</td>
                    <td style={{ padding: '10px', color: '#ccc' }}>{row.rua}, {row.numero} - {row.bairro}</td>
                    <td style={{ padding: '10px', color: '#aaa' }}>{row.cidade} - {row.uf}</td>
                    <td style={{ padding: '10px', color: '#00C49F' }}>{row.telefone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {inputText && previewData.length === 0 && (
        <div style={{ background: 'rgba(255, 77, 77, 0.1)', border: '1px solid #ff4d4d', borderRadius: '8px', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', color: '#ff4d4d' }}>
          <AlertCircle size={20} />
          <span>Não foi possível identificar colunas válidas. Certifique-se de copiar o cabeçalho do Excel.</span>
        </div>
      )}
    </div>
  );
}

export default ContelePage;
