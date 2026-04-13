// src/pages/AcessoKpisPage.js
import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, BarChart2, MapPin, ArrowLeft } from 'lucide-react';
import '../App.css';

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

const parseValue = (val, type) => {
    if (typeof val !== 'string') return '';
    if (!val || val.trim() === '-' || val.trim() === '') return '';
    let cleanVal = val.trim().replace(',', '.');
    let hasPercent = cleanVal.includes('%');
    let numStr = cleanVal.replace(/[^0-9.-]/g, ''); 
    if (!numStr) return '';
    let num = parseFloat(numStr);
    if (isNaN(num)) return '';
    if (type === 'percent') {
        if (!hasPercent && num <= 1 && num >= -1 && num !== 0 && cleanVal.indexOf('.') > -1) num = num * 100;
        return Number(num.toFixed(2));
    } else if (type === 'decimal') {
        return Number(num.toFixed(2));
    } else if (type === 'qtd') {
        return Math.round(num); 
    }
    return num;
};

function AcessoKpisPage() {
    const [selectedCity, setSelectedCity] = useState(null);
    const [viewMode, setViewMode] = useState('menu'); // 'menu', 'cadastrar', 'sucesso'
    const [importText, setImportText] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [importLoading, setImportLoading] = useState(false);
    
    const navigate = useNavigate();
    const cities = ["São Luís", "Teresina", "Aracaju"];

    const processCSVData = (text) => {
        const separator = text.indexOf('\t') !== -1 ? '\t' : (text.indexOf(';') !== -1 ? ';' : ',');
        const rows = text.split(/\r?\n/).map(row => splitCSVRow(row, separator));

        if (rows.length < 80) {
            alert("O texto colado parece incompleto. Selecione a planilha inteira (Ctrl+A).");
            setPreviewData([]);
            return; 
        }

        const targetCols = [18, 19, 20]; // S=18, T=19, U=20
        const data = [];
        const weekRow = rows[4]; 

        if (!weekRow || weekRow.length < 21) {
            alert("Estrutura não reconhecida. Verifique se copiou a partir da coluna A.");
            setPreviewData([]);
            return;
        }

        targetCols.forEach(col => {
            const weekStr = weekRow[col];
            if (!weekStr) return;
            const weekParts = weekStr.trim().split('.');
            let weekNum = parseInt(weekParts.length > 1 ? weekParts[1] : weekParts[0], 10);
            if (isNaN(weekNum)) return;

            const weekObj = { week: weekNum };
            let count = 0;

            const parseAndSet = (key, rowIdx, type) => {
                if (rows[rowIdx] && rows[rowIdx].length > col) {
                    const val = parseValue(rows[rowIdx][col], type);
                    if (val !== '') { weekObj[key] = val; count++; }
                }
            };

            parseAndSet('LTP VD %', 15, 'percent');
            parseAndSet('LTP VD QTD', 16, 'qtd');  
            parseAndSet('LTP DA %', 17, 'percent');
            parseAndSet('LTP DA QTD', 18, 'qtd');  
            parseAndSet('FTC HAPPY CALL', 25, 'percent');
            parseAndSet('1ST VISIT VD', 36, 'percent');  
            parseAndSet('IN HOME D+1', 37, 'percent');   
            parseAndSet('R-TAT', 38, 'decimal');         
            parseAndSet('R-TAT VD CI', 42, 'decimal');   
            parseAndSet('R-TAT VD IH', 43, 'decimal');   
            parseAndSet('R-TAT DA', 44, 'decimal');      
            parseAndSet('RRR VD %', 55, 'percent');      
            parseAndSet('RRR VD QTD', 56, 'qtd');        
            parseAndSet('RRR DA %', 57, 'percent');      
            parseAndSet('RRR DA QTD', 58, 'qtd');        
            parseAndSet('ECO REPAIR VD', 61, 'percent'); 
            parseAndSet('PO IN HOME D+1', 75, 'percent');
            parseAndSet('R-NPS VD', 84, 'percent');      
            parseAndSet('R-NPS DA', 85, 'percent');      

            if (count > 0) data.push(weekObj);
        });
        setPreviewData(data);
    };

    const handleTextImport = (val) => {
        setImportText(val);
        if (val.trim().length > 200) processCSVData(val);
        else setPreviewData([]);
    };

    const confirmImport = async () => {
        if (previewData.length === 0 || !selectedCity) return;
        setImportLoading(true);
        try {
            // Guarda na coleção específica da cidade
            const cityCollection = collection(db, 'kpis_cities', selectedCity, 'records');
            for (const data of previewData) {
                await addDoc(cityCollection, {
                    ...data,
                    timestamp: serverTimestamp(),
                });
            }
            setImportText('');
            setPreviewData([]);
            setViewMode('sucesso');
        } catch (error) {
            console.error(error);
            alert('Erro ao guardar os dados no banco.');
        } finally {
            setImportLoading(false);
        }
    };

    return (
        <div className="form-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <h2 style={{ textAlign: 'center', color: '#00C49F', marginBottom: '30px' }}>
                <MapPin /> Gestão Regional de KPIs
            </h2>

            {!selectedCity ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h4 style={{ textAlign: 'center', color: '#ccc' }}>Selecione a Cidade:</h4>
                    {cities.map(city => (
                        <button key={city} className="btn-pill" style={{ justifyContent: 'center', fontSize: '1.2em', padding: '15px', background: '#333' }} onClick={() => setSelectedCity(city)}>
                            {city}
                        </button>
                    ))}
                </div>
            ) : viewMode === 'menu' ? (
                <div className="cool-card" style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#fff', marginBottom: '20px' }}>📍 {selectedCity}</h3>
                    <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                        <button className="btn-pill" style={{ background: '#2196F3', flex: 1, justifyContent: 'center' }} onClick={() => navigate(`/dashboard-cidade/${selectedCity}`)}>
                            <BarChart2 size={20} /> Visualizar Indicadores
                        </button>
                        <button className="btn-pill" style={{ background: '#00C49F', flex: 1, justifyContent: 'center' }} onClick={() => setViewMode('cadastrar')}>
                            <Upload size={20} /> Cadastrar Indicadores
                        </button>
                    </div>
                    <button className="btn-pill" style={{ background: 'transparent', border: '1px solid #555', marginTop: '20px', width: '100%', justifyContent: 'center' }} onClick={() => setSelectedCity(null)}>
                        Voltar às Cidades
                    </button>
                </div>
            ) : viewMode === 'cadastrar' ? (
                <div className="cool-card" style={{ borderColor: '#00C49F' }}>
                    <div className="cool-card-header" style={{ cursor: 'pointer' }} onClick={() => setViewMode('menu')}>
                        <ArrowLeft size={20} color="#00C49F" />
                        <span className="turno-pill" style={{ background: '#00C49F', color: '#000' }}>Voltar</span>
                    </div>
                    <h3 style={{ color: '#fff', textAlign: 'center' }}>Cadastro - {selectedCity}</h3>
                    <p style={{ color: '#aaa', fontSize: '0.85em', marginTop: '10px' }}>
                        Copie os dados da planilha (Ctrl+A e Ctrl+C) e cole abaixo:
                    </p>
                    <textarea 
                        className="app-input custom-scrollbar" 
                        placeholder="Cole o texto copiado do Excel aqui..." 
                        value={importText}
                        onChange={(e) => handleTextImport(e.target.value)}
                        style={{ width: '100%', marginBottom: '10px', minHeight: '100px', fontFamily: 'monospace', fontSize: '0.8em' }}
                    />
                    
                    <button 
                        type="button" 
                        className="btn-pill" 
                        onClick={confirmImport}
                        disabled={previewData.length === 0 || importLoading}
                        style={{ width: '100%', background: previewData.length > 0 ? '#00C49F' : '#555', color: previewData.length > 0 ? '#000' : '#888', justifyContent: 'center', cursor: previewData.length > 0 ? 'pointer' : 'not-allowed' }}
                    >
                        {importLoading ? 'A Guardar...' : <><Upload size={20} /> Processar e Guardar</>}
                    </button>
                </div>
            ) : (
                <div className="cool-card" style={{ textAlign: 'center', borderColor: '#4CAF50' }}>
                    <h3 style={{ color: '#4CAF50' }}>✅ Guardado com Sucesso!</h3>
                    <p style={{ color: '#ccc' }}>Os indicadores de {selectedCity} foram atualizados.</p>
                    <button className="btn-pill" style={{ background: '#2196F3', width: '100%', justifyContent: 'center', marginTop: '20px' }} onClick={() => navigate(`/dashboard-cidade/${selectedCity}`)}>
                        <BarChart2 size={20} /> Visualizar Indicadores
                    </button>
                    <button className="btn-pill" style={{ background: 'transparent', border: '1px solid #555', width: '100%', justifyContent: 'center', marginTop: '10px' }} onClick={() => setViewMode('menu')}>
                        Voltar ao Menu
                    </button>
                </div>
            )}
        </div>
    );
}

export default AcessoKpisPage;