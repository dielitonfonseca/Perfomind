import React, { useState, useRef } from 'react';
import { processPartsData } from '../utils/partsLogic';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import '../App.css'; 

const PartsReportPage = () => {
  // --- Estados de Configuração Global ---
  const [inputText, setInputText] = useState('');
  const [reportTitle, setReportTitle] = useState('Relatório Técnico de Peças');
  const [reportSubtitle, setReportSubtitle] = useState('Análise de Consumo e Modelos');
  const [manualDays, setManualDays] = useState('');

  // --- Configuração de Insights (Um a um) ---
  const [insightsConfig, setInsightsConfig] = useState({
    totalParts: true,
    avgParts: true,
    topPart: true,
    transactions: true
  });

  // --- Configuração da Tabela Completa ---
  const [showGeneralTable, setShowGeneralTable] = useState(true);
  const [tableMetric, setTableMetric] = useState('daily'); // 'daily', 'weekly', 'monthly'

  // --- CONFIGURAÇÃO DOS 5 GRÁFICOS DE PEÇAS ---
  const [chartsConfig, setChartsConfig] = useState([
    { id: 1, active: true, title: 'Top Peças (Geral)', category: 'TODOS', limit: 5, showOrders: false },
    { id: 2, active: false, title: 'Top Peças (VD)', category: 'VD', limit: 5, showOrders: false },
    { id: 3, active: false, title: 'Top Peças (Linha Branca)', category: 'WSM', limit: 5, showOrders: false },
    { id: 4, active: false, title: 'Top Peças (Refrigeradores)', category: 'REF', limit: 5, showOrders: false },
    { id: 5, active: false, title: 'Top Peças (Ar Condicionado)', category: 'RAC', limit: 5, showOrders: false },
  ]);

  // --- CONFIGURAÇÃO DOS 4 RANKINGS DE MODELOS ---
  const [modelRankings, setModelRankings] = useState([
    { id: 1, active: true, title: 'Top Modelos (Geral)', category: 'TODOS', onlyWithParts: true },
    { id: 2, active: false, title: 'Top Modelos (VD)', category: 'VD', onlyWithParts: true },
    { id: 3, active: false, title: 'Top Modelos (Linha Branca)', category: 'WSM', onlyWithParts: true },
    { id: 4, active: false, title: 'Top Modelos (RAC)', category: 'RAC', onlyWithParts: true },
  ]);

  // --- Dados Processados ---
  const [data, setData] = useState(null);
  const reportRef = useRef();

  const handleProcess = () => {
    if (!inputText) return;
    const processed = processPartsData(inputText);
    if (processed.error) {
        alert(processed.error);
        return;
    }
    setData(processed);
  };

  // --- Atualizadores de Estado ---
  const updateChartConfig = (id, field, value) => {
    setChartsConfig(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateRankingConfig = (id, field, value) => {
    setModelRankings(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleInsight = (key) => {
    setInsightsConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Lógica de Filtros ---
  const getFilteredPartsData = (config) => {
    if (!data || !data.parts) return [];
    let filtered = data.parts;
    if (config.category !== 'TODOS') {
        filtered = filtered.filter(p => p.category === config.category);
    }
    return filtered.slice(0, config.limit);
  };

  const getModelRankingData = (config) => {
    if (!data || !data.transactions) return [];
    const filtered = data.transactions.filter(t => {
        if (config.category !== 'TODOS' && t.category !== config.category) return false;
        if (config.onlyWithParts && !t.hasParts) return false;
        return true;
    });
    const counts = {};
    filtered.forEach(t => {
        if (!counts[t.model]) counts[t.model] = 0;
        counts[t.model]++;
    });
    return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  };

  // --- Geração de PDF ---
  const generatePDF = async () => {
    const input = reportRef.current;
    if (!input) return;
    try {
        const canvas = await html2canvas(input, { 
            scale: 2, backgroundColor: '#ffffff', useCORS: true,
            height: input.scrollHeight, windowHeight: input.scrollHeight
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        if (pdfHeight > 297) {
            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = 297;
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
            while (heightLeft >= 0) {
              position = heightLeft - pdfHeight; 
              pdf.addPage();
              pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
              heightLeft -= pageHeight;
            }
        } else {
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        }
        pdf.save(`Relatorio_Pecas_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) { console.error("Erro ao gerar PDF", err); }
  };

  const daysToUse = manualDays ? parseInt(manualDays) : (data?.days || 1);

  // Helper para Tabela
  const getConsumptionValue = (totalCount) => {
      if (tableMetric === 'weekly') return (totalCount / (daysToUse / 7)).toFixed(2);
      if (tableMetric === 'monthly') return (totalCount / (daysToUse / 30)).toFixed(2);
      return (totalCount / daysToUse).toFixed(2); // daily
  };

  const getConsumptionLabel = () => {
      if (tableMetric === 'weekly') return 'Média/Semana';
      if (tableMetric === 'monthly') return 'Média/Mês';
      return 'Média/Dia';
  };

  return (
    <div className="reports-page-container">
      {/* --- MENU LATERAL (CONFIGURAÇÃO) --- */}
      <div className="config-panel custom-scrollbar">
        <h2 className="config-title">Painel de Controle</h2>
        
        <div className="config-group">
            <label>Cabeçalho do Relatório</label>
            <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={{marginBottom:'5px'}} />
            <input type="text" value={reportSubtitle} onChange={e => setReportSubtitle(e.target.value)} />
        </div>

        <div className="config-group">
            <label>Entrada de Dados</label>
            <textarea 
                rows="5" 
                placeholder="Cole o Excel aqui..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="input-textarea"
            />
            <button className="btn-generate full-width" onClick={handleProcess}>
                PROCESSAR
            </button>
        </div>

        {data && (
            <>
                <div className="config-group">
                    <label>Período (Dias)</label>
                    <input type="number" placeholder={data.days} value={manualDays} onChange={e => setManualDays(e.target.value)} />
                </div>

                <div className="config-divider">Insights (Cards)</div>
                <div className="toggle-item small">
                    <div className="toggle-header">
                        <span>Total de Peças</span>
                        <Toggle active={insightsConfig.totalParts} onToggle={() => toggleInsight('totalParts')} />
                    </div>
                </div>
                <div className="toggle-item small">
                    <div className="toggle-header">
                        <span>Média Diária</span>
                        <Toggle active={insightsConfig.avgParts} onToggle={() => toggleInsight('avgParts')} />
                    </div>
                </div>
                <div className="toggle-item small">
                    <div className="toggle-header">
                        <span>Peça Mais Usada</span>
                        <Toggle active={insightsConfig.topPart} onToggle={() => toggleInsight('topPart')} />
                    </div>
                </div>
                <div className="toggle-item small">
                    <div className="toggle-header">
                        <span>Total Transações</span>
                        <Toggle active={insightsConfig.transactions} onToggle={() => toggleInsight('transactions')} />
                    </div>
                </div>

                <div className="config-divider">Tabela Completa</div>
                <div className="toggle-item">
                    <div className="toggle-header">
                        <span>Ativar Tabela</span>
                        <Toggle active={showGeneralTable} onToggle={() => setShowGeneralTable(!showGeneralTable)} />
                    </div>
                    {showGeneralTable && (
                        <div className="toggle-content fade-in">
                            <label style={{fontSize: '12px', color: '#aaa', marginBottom: '5px', display: 'block'}}>Métrica de Consumo:</label>
                            <select value={tableMetric} onChange={(e) => setTableMetric(e.target.value)} style={{width: '100%'}}>
                                <option value="daily">Consumo Dia</option>
                                <option value="weekly">Consumo Semana</option>
                                <option value="monthly">Consumo Mês</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="config-divider">Gráficos de Peças (Top X)</div>
                {chartsConfig.map((chart) => (
                    <div key={chart.id} className="toggle-item">
                        <div className="toggle-header">
                            <span>Gráfico #{chart.id}</span>
                            <Toggle active={chart.active} onToggle={(val) => updateChartConfig(chart.id, 'active', val)} />
                        </div>
                        {chart.active && (
                            <div className="toggle-content fade-in">
                                <input type="text" value={chart.title} onChange={e => updateChartConfig(chart.id, 'title', e.target.value)} placeholder="Título" style={{marginBottom:'8px'}} />
                                <div className="row-inputs">
                                    <select value={chart.category} onChange={e => updateChartConfig(chart.id, 'category', e.target.value)}>
                                        <option value="TODOS">Geral</option>
                                        <option value="VD">VD</option>
                                        <option value="WSM">WSM</option>
                                        <option value="REF">REF</option>
                                        <option value="RAC">RAC</option>
                                    </select>
                                    <input type="number" value={chart.limit} onChange={e => updateChartConfig(chart.id, 'limit', e.target.value)} placeholder="Qtd" style={{width: '60px'}} />
                                </div>
                                <div className="sub-toggle">
                                    <span>Listar Ordens (Detalhe)</span>
                                    <Toggle active={chart.showOrders} onToggle={(val) => updateChartConfig(chart.id, 'showOrders', val)} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <div className="config-divider">Rankings de Modelos</div>
                {modelRankings.map((rank) => (
                    <div key={rank.id} className="toggle-item">
                        <div className="toggle-header">
                            <span>Ranking #{rank.id}</span>
                            <Toggle active={rank.active} onToggle={(val) => updateRankingConfig(rank.id, 'active', val)} />
                        </div>
                        {rank.active && (
                            <div className="toggle-content fade-in">
                                <input type="text" value={rank.title} onChange={e => updateRankingConfig(rank.id, 'title', e.target.value)} placeholder="Título" style={{marginBottom:'8px'}} />
                                <select value={rank.category} onChange={e => updateRankingConfig(rank.id, 'category', e.target.value)} style={{marginBottom:'8px', width:'100%'}}>
                                    <option value="TODOS">Todas Categorias</option>
                                    <option value="VD">VD</option>
                                    <option value="WSM">WSM</option>
                                    <option value="REF">REF</option>
                                    <option value="RAC">RAC</option>
                                    <option value="Outros">Outros</option>
                                </select>
                                <div className="radio-group">
                                    <label><input type="radio" checked={rank.onlyWithParts} onChange={() => updateRankingConfig(rank.id, 'onlyWithParts', true)} /> Com Peça</label>
                                    <label><input type="radio" checked={!rank.onlyWithParts} onChange={() => updateRankingConfig(rank.id, 'onlyWithParts', false)} /> Geral</label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <button className="btn-generate full-width" onClick={generatePDF} style={{marginTop: '20px'}}>
                    BAIXAR PDF
                </button>
            </>
        )}
      </div>

      {/* --- ÁREA DE PRÉ-VISUALIZAÇÃO (DIREITA) --- */}
      <div className="preview-panel custom-scrollbar">
        {data ? (
            <div ref={reportRef} className="pdf-sheet">
                {/* Header */}
                <div className="report-header">
                    <div className="header-titles">
                        <h1>{reportTitle}</h1>
                        <p>{reportSubtitle}</p>
                    </div>
                    <div className="header-meta">
                        <span>Período: {data.dateRange.start} a {data.dateRange.end}</span>
                        <span>Intervalo: {daysToUse} dias</span>
                        <span>Total de OSs: {data.transactions.length}</span>
                    </div>
                </div>

                {/* Insights Cards */}
                <div className="insights-grid">
                    {insightsConfig.totalParts && (
                        <InsightCard label="Total Peças" value={data.totalPartsUsed} color="#00C49F" icon="📦" />
                    )}
                    {insightsConfig.avgParts && (
                        <InsightCard label="Média Peças/Dia" value={(data.totalPartsUsed / daysToUse).toFixed(1)} color="#FFBB28" icon="📅" />
                    )}
                    {insightsConfig.topPart && (
                        <InsightCard label="Peça Mais Usada" value={data.parts[0]?.code || '-'} sub={`Qtd: ${data.parts[0]?.count || 0}`} color="#FF8042" icon="🏆" />
                    )}
                    {insightsConfig.transactions && (
                        <InsightCard label="Total Transações" value={data.transactions.length} color="#0088FE" icon="📑" />
                    )}
                </div>

                {/* Gráficos de Peças */}
                <div className="charts-section">
                    {chartsConfig.filter(c => c.active).map((chart) => {
                        const chartData = getFilteredPartsData(chart);
                        return (
                            <div key={chart.id} className="report-block">
                                <h3 className="block-title">{chart.title} <small>(Top {chart.limit} - {chart.category})</small></h3>
                                
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={50 + (chartData.length * 40)}>
                                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#eee" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="code" type="category" width={110} tick={{fontSize: 11, fill: '#333'}} />
                                            <Tooltip cursor={{fill: '#f5f5f5'}} contentStyle={{backgroundColor: '#fff', border: '1px solid #ccc', color: '#000'}} />
                                            <Bar dataKey="count" barSize={20} radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][index % 5]} />
                                                ))}
                                                <LabelList dataKey="count" position="right" fill="#333" fontSize={12} fontWeight="bold" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {chart.showOrders && (
                                    <div className="orders-breakdown">
                                        {chartData.map((part, pIdx) => {
                                            const orders = data.transactions.filter(t => t.partsList && t.partsList.includes(part.code));
                                            if (orders.length === 0) return null;
                                            return (
                                                <div key={pIdx} className="part-orders-table">
                                                    <h4 className="part-header">
                                                        <span className="bullet" style={{backgroundColor: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'][pIdx % 5]}}></span>
                                                        {part.code} - <span style={{fontWeight: 'normal'}}>{part.desc}</span>
                                                    </h4>
                                                    <table className="styled-table mini">
                                                        <thead>
                                                            <tr>
                                                                <th>Data</th>
                                                                <th>OS / Referência</th>
                                                                <th>Modelo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {orders.map((os, oIdx) => (
                                                                <tr key={oIdx}>
                                                                    <td>{os.date ? os.date.toLocaleDateString('pt-BR') : '-'}</td>
                                                                    <td>{os.osNumber || 'N/A'}</td>
                                                                    <td>{os.model}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Rankings de Modelos */}
                <div className="rankings-grid">
                    {modelRankings.filter(r => r.active).map(rank => {
                        const rankingData = getModelRankingData(rank);
                        return (
                            <div key={rank.id} className="ranking-card">
                                <h4 className="ranking-header">
                                    {rank.title}
                                    <span className="ranking-sub">({rank.category === 'TODOS' ? 'Geral' : rank.category})</span>
                                </h4>
                                {rankingData.length > 0 ? (
                                    <table className="styled-table ranking">
                                        <tbody>
                                            {rankingData.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="rank-pos">#{idx+1}</td>
                                                    <td className="rank-name">{item.name}</td>
                                                    <td className="rank-val">{item.value}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : <p className="no-data">Sem dados.</p>}
                            </div>
                        );
                    })}
                </div>

                {/* Tabela Geral */}
                {showGeneralTable && (
                    <div className="report-block">
                        <h3 className="block-title">Tabela Geral de Peças</h3>
                        <table className="styled-table full">
                            <thead>
                                <tr>
                                    <th style={{width: '50px'}}>Pos.</th>
                                    <th>Código da Peça</th>
                                    <th>Descrição / Categoria</th>
                                    <th className="text-center" style={{width: '80px'}}>Total</th>
                                    <th className="text-center" style={{width: '100px'}}>{getConsumptionLabel()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.parts.slice(0, 50).map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}º</td>
                                        <td className="font-mono">{item.code}</td>
                                        <td>
                                            <span className="badge">{item.category}</span> {item.desc}
                                        </td>
                                        <td className="text-center font-bold bg-highlight">{item.count}</td>
                                        <td className="text-center">{getConsumptionValue(item.count)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="table-footer">
                            Exibindo as top 50 de {data.parts.length} peças encontradas no período.
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="empty-state">
                <p>Cole a planilha à esquerda e clique em <strong>PROCESSAR</strong> para gerar o relatório.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Componentes Auxiliares
const Toggle = ({ active, onToggle }) => (
    <label className="switch">
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} />
        <span className="slider round"></span>
    </label>
);

const InsightCard = ({ label, value, sub, color, icon }) => (
    <div className="insight-card" style={{ borderTop: `4px solid ${color}` }}>
        <div className="insight-icon" style={{color: color}}>{icon}</div>
        <div className="insight-content">
            <span className="insight-label">{label}</span>
            <strong className="insight-value" style={{color: '#333'}}>{value}</strong>
            {sub && <span className="insight-sub">{sub}</span>}
        </div>
    </div>
);

export default PartsReportPage;