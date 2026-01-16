import React, { useState } from 'react';
import { Copy, Check, Send, FileText } from 'lucide-react';
import '../App.css';

function Output({ data }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTelegramShare = () => {
    // Codifica o texto para URL
    const textEncoded = encodeURIComponent(data);
    // Link para compartilhar no Telegram
    const url = `https://t.me/share/url?url=&text=${textEncoded}`;
    window.open(url, '_blank');
  };

  return (
    <div className="cool-card" style={{ marginTop: '20px', borderColor: '#00C49F' }}>
      <div className="cool-card-header">
        <FileText size={20} color="#00C49F" />
        <span style={{ marginLeft: '10px', fontWeight: 'bold', color: '#fff' }}>Resumo da OS</span>
      </div>

      <div className="cool-card-body">
        <textarea
          className="app-textarea result-box"
          readOnly
          value={data}
          rows={12}
          style={{
            background: '#1a1a1a',
            border: '1px solid #333',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            lineHeight: '1.4',
            color: '#e0e0e0',
            resize: 'none',
            whiteSpace: 'pre-wrap' // Mantém a formatação do texto
          }}
        />
      </div>

      <div className="cool-card-footer-grid" style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleCopy}
          className={`btn-pill ${copied ? 'btn-finish' : 'btn-go'}`}
          style={{ 
            flex: 1,
            minHeight: '45px', 
            background: copied ? '#4CAF50' : '#333', 
            border: copied ? 'none' : '1px solid #555',
            justifyContent: 'center'
          }}
        >
          {copied ? <><Check size={18} /> Copiado!</> : <><Copy size={18} /> Copiar</>}
        </button>

        <button
          onClick={handleTelegramShare}
          className="btn-pill"
          style={{ 
            flex: 1,
            minHeight: '45px', 
            background: '#0088cc', /* Azul Telegram */
            color: '#fff',
            border: 'none',
            justifyContent: 'center'
          }}
        >
          <Send size={18} /> Telegram
        </button>
      </div>
    </div>
  );
}

export default Output;