import React, { useState, useRef } from 'react';
import { processPartsData } from '../utils/partsLogic';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Moon, Sun } from 'lucide-react'; // Ícones
import '../App.css'; 

const PartsReportPage = () => {
  // --- Estado de Tema (Padrão: Dark Mode = false / Light) ---
  const [isDarkMode, setIsDarkMode] = useState(false);

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
  const [tableMetric, setTableMetric] = useState('daily');

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
    <div className={`reports-page-container ${isDarkMode ? 'dark-mode' : ''}`}>
      
      {/* --- MENU LATERAL (CONFIGURAÇÃO) --- */}
      <div className="config-panel custom-scrollbar">
        <div className="config-header-row">
            <h2 className="config-title">Configurações</h2>
            <button className="mode-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
                {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                {isDarkMode ? 'Light' : 'Dark'}
            </button>
        </div>
        
        <div className="config-group">
            <label>Cabeçalho do Relatório</label>
            <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={{marginBottom:'5px', width: '100%'}} />
            <input type="text" value={reportSubtitle} onChange={e => setReportSubtitle(e.target.value)} style={{width: '100%'}} />
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
                PROCESSAR DADOS
            </button>
        </div>

        {data && (
            <>
                <div className="config-group">
                    <label>Período Considerado (Dias)</label>
                    <input type="number" placeholder={data.days} value={manualDays} onChange={e => setManualDays(e.target.value)} style={{width: '100%'}} />
                </div>

                <div className="config-divider">Cartões de Insights</div>
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

                <div className="config-divider">Tabela Geral</div>
                <div className="toggle-item">
                    <div className="toggle-header">
                        <span>Exibir Tabela</span>
                        <Toggle active={showGeneralTable} onToggle={() => setShowGeneralTable(!showGeneralTable)} />
                    </div>
                    {showGeneralTable && (
                        <div className="toggle-content fade-in">
                            <label style={{fontSize: '12px', marginBottom: '5px', display: 'block'}}>Métrica de Consumo:</label>
                            <select value={tableMetric} onChange={(e) => setTableMetric(e.target.value)} style={{width: '100%'}}>
                                <option value="daily">Consumo Dia</option>
                                <option value="weekly">Consumo Semana</option>
                                <option value="monthly">Consumo Mês</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="config-divider">Gráficos (Top Peças)</div>
                {chartsConfig.map((chart) => (
                    <div key={chart.id} className="toggle-item">
                        <div className="toggle-header">
                            <span>Gráfico #{chart.id}</span>
                            <Toggle active={chart.active} onToggle={(val) => updateChartConfig(chart.id, 'active', val)} />
                        </div>
                        {chart.active && (
                            <div className="toggle-content fade-in">
                                <input type="text" value={chart.title} onChange={e => updateChartConfig(chart.id, 'title', e.target.value)} placeholder="Título" style={{marginBottom:'8px', width: '90%'}} />
                                <div className="row-inputs" style={{display: 'flex', gap: '5px'}}>
                                    <select value={chart.category} onChange={e => updateChartConfig(chart.id, 'category', e.target.value)}>
                                        <option value="TODOS">Geral</option>
                                        <option value="VD">VD</option>
                                        <option value="WSM">WSM</option>
                                        <option value="REF">REF</option>
                                        <option value="RAC">RAC</option>
                                    </select>
                                    <input type="number" value={chart.limit} onChange={e => updateChartConfig(chart.id, 'limit', e.target.value)} placeholder="Qtd" style={{width: '50px'}} />
                                </div>
                                <div className="sub-toggle" style={{marginTop: '10px', fontSize: '12px'}}>
                                    <span>Listar Ordens (Detalhe)</span>
                                    <Toggle active={chart.showOrders} onToggle={(val) => updateChartConfig(chart.id, 'showOrders', val)} />
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <div className="config-divider">Rankings (Modelos)</div>
                {modelRankings.map((rank) => (
                    <div key={rank.id} className="toggle-item">
                        <div className="toggle-header">
                            <span>Ranking #{rank.id}</span>
                            <Toggle active={rank.active} onToggle={(val) => updateRankingConfig(rank.id, 'active', val)} />
                        </div>
                        {rank.active && (
                            <div className="toggle-content fade-in">
                                <input type="text" value={rank.title} onChange={e => updateRankingConfig(rank.id, 'title', e.target.value)} placeholder="Título" style={{marginBottom:'8px', width:'90%'}} />
                                <select value={rank.category} onChange={e => updateRankingConfig(rank.id, 'category', e.target.value)} style={{marginBottom:'8px', width:'100%'}}>
                                    <option value="TODOS">Todas Categorias</option>
                                    <option value="VD">VD</option>
                                    <option value="WSM">WSM</option>
                                    <option value="REF">REF</option>
                                    <option value="RAC">RAC</option>
                                </select>
                                <div style={{fontSize: '12px'}}>
                                    <label><input type="radio" checked={rank.onlyWithParts} onChange={() => updateRankingConfig(rank.id, 'onlyWithParts', true)} /> Com Peça</label>
                                    <label style={{marginLeft: '10px'}}><input type="radio" checked={!rank.onlyWithParts} onChange={() => updateRankingConfig(rank.id, 'onlyWithParts', false)} /> Geral</label>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                <button className="btn-generate full-width" onClick={generatePDF} style={{marginTop: '20px'}}>
                    BAIXAR RELATÓRIO PDF
                </button>
            </>
        )}
      </div>

      {/* --- ÁREA DE PRÉ-VISUALIZAÇÃO --- */}
      <div className="preview-panel custom-scrollbar">
        {data ? (
            <div ref={reportRef} className="pdf-sheet">
                
                {/* Header Estilo Moderno */}
                <div className="report-header-modern">
                    <div>
                        <h1>{reportTitle}</h1>
                        <p>{reportSubtitle}</p>
                    </div>
                    <div className="header-meta-tags">
                        <span className="meta-tag">📅 {data.dateRange.start} - {data.dateRange.end}</span>
                        <span className="meta-tag">⏱ {daysToUse} Dias</span>
                        <span className="meta-tag">📑 {data.transactions.length} OSs</span>
                    </div>
                </div>

                {/* Cards Coloridos */}
                <div className="stats-grid">
                    {insightsConfig.totalParts && (
                        <div className="stat-card-modern" style={{background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'}}>
                            <div className="stat-icon-bg">📦</div>
                            <div>
                                <div className="stat-value">{data.totalPartsUsed}</div>
                                <div className="stat-label">Peças Totais</div>
                            </div>
                        </div>
                    )}
                    {insightsConfig.avgParts && (
                        <div className="stat-card-modern" style={{background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'}}>
                            <div className="stat-icon-bg">📊</div>
                            <div>
                                <div className="stat-value">{(data.totalPartsUsed / daysToUse).toFixed(1)}</div>
                                <div className="stat-label">Média / Dia</div>
                            </div>
                        </div>
                    )}
                    {insightsConfig.topPart && (
                        <div className="stat-card-modern" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}}>
                            <div className="stat-icon-bg">🏆</div>
                            <div>
                                <div className="stat-value" style={{fontSize: '18px', marginBottom: '5px'}}>{data.parts[0]?.code || '-'}</div>
                                <div className="stat-label">Top Peça ({data.parts[0]?.count})</div>
                            </div>
                        </div>
                    )}
                    {insightsConfig.transactions && (
                        <div className="stat-card-modern" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'}}>
                            <div className="stat-icon-bg">📝</div>
                            <div>
                                <div className="stat-value">{data.transactions.length}</div>
                                <div className="stat-label">Transações</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Rankings de Modelos */}
                {modelRankings.some(r => r.active) && (
                   <div className="report-section">
                       <h3 className="section-title">Rankings de Modelos</h3>
                       <div className="rankings-modern-grid">
                           {modelRankings.filter(r => r.active).map(rank => {
                               const rankingData = getModelRankingData(rank);
                               const maxVal = rankingData.length > 0 ? rankingData[0].value : 1;
                               return (
                                   <div key={rank.id} className="ranking-container">
                                       <h4 style={{margin: '0 0 15px 0', fontSize: '14px', color: '#111827'}}>{rank.title}</h4>
                                       {rankingData.length > 0 ? (
                                           <div className="ranking-list">
                                               {rankingData.map((item, idx) => (
                                                   <div key={idx} className="ranking-item">
                                                       <div className={`rank-badge ${idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other'}`}>
                                                           {idx + 1}
                                                       </div>
                                                       <div className="rank-info">
                                                           <div className="rank-header">
                                                               <span>{item.name}</span>
                                                               <span>{item.value}</span>
                                                           </div>
                                                           <div className="rank-bar-bg">
                                                               <div 
                                                                  className="rank-bar-fill" 
                                                                  style={{
                                                                    width: `${(item.value / maxVal) * 100}%`,
                                                                    backgroundColor: idx === 0 ? '#fbbf24' : idx === 1 ? '#9ca3af' : idx === 2 ? '#d97706' : '#2563eb'
                                                                  }}
                                                               ></div>
                                                           </div>
                                                       </div>
                                                   </div>
                                               ))}
                                           </div>
                                       ) : <p style={{fontSize:'12px', color:'#999'}}>Sem dados para exibir.</p>}
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                )}

                {/* Gráficos de Peças */}
                <div className="report-section">
                    {chartsConfig.filter(c => c.active).map((chart) => {
                        const chartData = getFilteredPartsData(chart);
                        return (
                            <div key={chart.id} style={{marginBottom: '40px', pageBreakInside: 'avoid'}}>
                                <h3 className="section-title">{chart.title}</h3>
                                
                                <div style={{border: '1px solid #f3f4f6', borderRadius: '8px', padding: '10px'}}>
                                    <ResponsiveContainer width="100%" height={60 + (chartData.length * 40)}>
                                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#eee" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="code" type="category" width={110} tick={{fontSize: 11, fill: '#374151', fontWeight: 600}} />
                                            <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'}} />
                                            <Bar dataKey="count" barSize={18} radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5]} />
                                                ))}
                                                <LabelList dataKey="count" position="right" fill="#374151" fontSize={11} fontWeight="bold" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {chart.showOrders && (
                                    <div style={{marginTop: '15px', paddingLeft: '10px', borderLeft: '2px solid #e5e7eb'}}>
                                        {chartData.map((part, pIdx) => {
                                            const orders = data.transactions.filter(t => t.partsList && t.partsList.includes(part.code));
                                            if (orders.length === 0) return null;
                                            return (
                                                <div key={pIdx} style={{marginBottom: '10px'}}>
                                                    <h4 style={{fontSize: '12px', margin: '0 0 5px 0', color: '#1f2937'}}>
                                                        <span style={{color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][pIdx % 5]}}>●</span> {part.code} - {part.desc}
                                                    </h4>
                                                    <table className="styled-table-modern" style={{width: '100%', fontSize: '10px'}}>
                                                        <tbody>
                                                            {orders.map((os, oIdx) => (
                                                                <tr key={oIdx}>
                                                                    <td style={{width: '80px'}}>{os.date ? os.date.toLocaleDateString('pt-BR') : '-'}</td>
                                                                    <td style={{width: '100px'}}>{os.osNumber || 'N/A'}</td>
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

                {/* Tabela Geral */}
                {showGeneralTable && (
                    <div className="report-section">
                        <h3 className="section-title">Detalhamento de Peças</h3>
                        <table className="styled-table-modern">
                            <thead>
                                <tr>
                                    <th style={{width: '40px'}}>#</th>
                                    <th style={{width: '120px'}}>Código</th>
                                    <th>Descrição / Categoria</th>
                                    <th className="text-center" style={{width: '80px'}}>Qtd.</th>
                                    <th className="text-center" style={{width: '100px'}}>{getConsumptionLabel()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.parts.slice(0, 50).map((item, index) => (
                                    <tr key={index}>
                                        <td style={{fontWeight: 'bold', color: '#9ca3af'}}>{index + 1}</td>
                                        <td style={{fontFamily: 'monospace', fontWeight: 600}}>{item.code}</td>
                                        <td>
                                            <span className="badge-category">{item.category}</span>
                                            {item.desc}
                                        </td>
                                        <td style={{textAlign: 'center', fontWeight: 'bold', color: '#2563eb'}}>{item.count}</td>
                                        <td style={{textAlign: 'center'}}>{getConsumptionValue(item.count)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{marginTop: '10px', fontSize: '10px', color: '#6b7280', fontStyle: 'italic'}}>
                            * Exibindo as top 50 peças com maior saída no período selecionado.
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <div className="empty-state" style={{textAlign: 'center', color: '#9ca3af', marginTop: '100px'}}>
                <div style={{fontSize: '48px', marginBottom: '20px'}}>📊</div>
                <p>Cole a planilha à esquerda e clique em <br/><strong>PROCESSAR DADOS</strong> para gerar o relatório.</p>
            </div>
        )}
      </div>
    </div>
  );
};

// Componente Toggle (Mantido simples)
const Toggle = ({ active, onToggle }) => (
    <label className="switch">
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} />
        <span className="slider round"></span>
    </label>
);

export default PartsReportPage;