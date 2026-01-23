import React, { useState, useRef } from 'react';
import { processPartsData } from '../utils/partsLogic';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, LineChart, Line, ComposedChart, PieChart, Pie, Legend } from 'recharts';
import '../App.css'; 

const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8A2BE2', '#FF4500'];

// --- NOVA REGRA DE CATEGORIZAÇÃO DE MODELOS ---
const getCategoryFromModel = (model) => {
    if (!model) return 'OUTROS';
    const m = model.toUpperCase().trim();
    
    // Regras atualizadas conforme solicitado
    if (m.startsWith('WW') || m.startsWith('WD') || m.startsWith('WF')) return 'WSM';
    if (m.startsWith('RT') || m.startsWith('RF') || m.startsWith('RS') || m.startsWith('RL')) return 'REF';
    if (m.startsWith('AR')) return 'RAC';
    if (m.startsWith('QN') || m.startsWith('UN') || m.startsWith('LH') || m.startsWith('LS')) return 'VD';
    
    return 'OUTROS';
};

const PartsReportPage = () => {
  // --- TEMA CLARO / ESCURO (Modo Impressão) ---
  const [isLightMode, setIsLightMode] = useState(false);

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

  // --- CONFIGURAÇÃO DOS GRÁFICOS DE PEÇAS ---
  const [chartsConfig, setChartsConfig] = useState([
    { id: 1, active: true, title: 'Top Peças (Geral)', category: 'TODOS', limit: 5, showOrders: false },
    { id: 2, active: false, title: 'Top Peças (VD)', category: 'VD', limit: 5, showOrders: false },
    { id: 3, active: false, title: 'Top Peças (Linha Branca)', category: 'WSM', limit: 5, showOrders: false },
    { id: 4, active: false, title: 'Top Peças (Refrigeradores)', category: 'REF', limit: 5, showOrders: false },
    { id: 5, active: false, title: 'Top Peças (Ar Condicionado)', category: 'RAC', limit: 5, showOrders: false },
  ]);

  // --- CONFIGURAÇÃO DOS RANKINGS DE MODELOS ---
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

    // PÓS-PROCESSAMENTO CORRIGIDO: Vincula a categoria da OS para a Peça
    if (processed.transactions) {
        processed.transactions.forEach(t => {
            t.category = getCategoryFromModel(t.model);
        });
    }

    if (processed.parts) {
        processed.parts.forEach(p => {
            // Busca qual OS usou essa peça para descobrir a categoria
            const relatedTx = processed.transactions.find(t => t.partsList && t.partsList.includes(p.code));
            if (relatedTx && relatedTx.category !== 'OUTROS') {
                p.category = relatedTx.category;
            } else {
                p.category = 'OUTROS';
            }
        });
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

  // --- Lógica de Filtros (Agora funciona porque a categoria está correta) ---
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
        .slice(0, 3); // Top 3 para o Layout de Pódio
  };

  // --- Geração de PDF Consistente ---
  const handleExportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    // Ajuste de layout grid antes do print
    const gridContainer = input.querySelector('.rankings-modern-grid');
    const originalGridDisplay = gridContainer ? gridContainer.style.display : '';
    
    if (gridContainer) {
        gridContainer.style.display = 'flex';
        gridContainer.style.flexWrap = 'wrap';
        gridContainer.style.gap = '15px'; 
    }

    const elementsToCheck = Array.from(input.querySelectorAll('.report-header-modern, .stat-row, .report-section, .pdf-chart-item, .styled-table-modern'));
    const originalMargins = [];

    const domWidth = input.offsetWidth;
    const pdfPageHeightPx = (domWidth * 297) / 210;
    let currentPageHeight = 0;
    let elementsOnCurrentPage = [];

    elementsToCheck.forEach((el) => {
        const style = window.getComputedStyle(el);
        const elHeight = el.offsetHeight + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
        
        if (currentPageHeight + elHeight > pdfPageHeightPx) {
            const remainingSpace = pdfPageHeightPx - currentPageHeight;
            if (elementsOnCurrentPage.length > 0 && remainingSpace > 0) {
                const spacePerElement = remainingSpace / elementsOnCurrentPage.length;
                elementsOnCurrentPage.forEach(pageEl => {
                    const currentMb = parseFloat(pageEl.style.marginBottom || window.getComputedStyle(pageEl).marginBottom || 0);
                    const newMb = currentMb + spacePerElement;
                    if (!originalMargins.find(m => m.el === pageEl)) {
                        originalMargins.push({ el: pageEl, margin: pageEl.style.marginBottom });
                    }
                    pageEl.style.marginBottom = `${newMb}px`;
                });
            }
            currentPageHeight = 56 + elHeight; 
            elementsOnCurrentPage = [el];
        } else {
            currentPageHeight += elHeight;
            elementsOnCurrentPage.push(el);
        }
    });

    try {
        const canvas = await html2canvas(input, { 
            scale: 2, 
            backgroundColor: isLightMode ? '#ffffff' : '#1a1a1a', 
            useCORS: true,
            height: input.scrollHeight, windowHeight: input.scrollHeight, scrollY: 0
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const paintBackground = () => {
            if (isLightMode) {
                pdf.setFillColor(255, 255, 255);
            } else {
                pdf.setFillColor(26, 26, 26);
            }
            pdf.rect(0, 0, pdfWidth, pageHeight, 'F');
        };

        paintBackground();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

        let heightLeft = pdfHeight - pageHeight;
        while (heightLeft > 0) {
          const position = -(pageHeight * (pdf.internal.getNumberOfPages()));
          pdf.addPage();
          paintBackground();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        const fileName = `${reportTitle}${reportSubtitle ? ' - ' + reportSubtitle : ''}.pdf`;
        pdf.save(fileName);
    } catch (err) { console.error(err); }
    finally {
        originalMargins.forEach(({ el, margin }) => {
            el.style.marginBottom = margin;
        });
        if (gridContainer) gridContainer.style.display = originalGridDisplay;
    }
  };

  const daysToUse = manualDays ? parseInt(manualDays) : (data?.days || 1);

  const getConsumptionValue = (totalCount) => {
      if (tableMetric === 'weekly') return (totalCount / (daysToUse / 7)).toFixed(2);
      if (tableMetric === 'monthly') return (totalCount / (daysToUse / 30)).toFixed(2);
      return (totalCount / daysToUse).toFixed(2);
  };

  const getConsumptionLabel = () => {
      if (tableMetric === 'weekly') return 'Média/Semana';
      if (tableMetric === 'monthly') return 'Média/Mês';
      return 'Média/Dia';
  };

  // Cores dinâmicas para o modo claro/escuro
  const titleColor = isLightMode ? '#333' : '#fff';
  const axisColor = isLightMode ? '#666' : '#ccc';
  const gridColor = isLightMode ? '#d1d1d1' : '#444';
  const tooltipBg = isLightMode ? '#ffffff' : '#333333';
  const tooltipBorder = isLightMode ? '1px solid #ccc' : 'none';
  const tooltipColor = isLightMode ? '#333' : '#fff';

  return (
    <div className="reports-page-container">
      
      {/* --- MENU LATERAL (CONFIGURAÇÃO) --- */}
      <div className="config-panel custom-scrollbar">
        <h2 className="config-title">Configuração</h2>

        <div className="toggle-item small" style={{ marginBottom: '20px', background: isLightMode ? '#e0e0e0' : '#333' }}>
            <div className="toggle-header">
                <span style={{ color: isLightMode ? '#333' : '#fff', fontWeight: 'bold' }}>
                    {isLightMode ? 'Modo de Impressão (Claro)' : 'Modo Padrão (Escuro)'}
                </span>
                <label className="switch">
                    <input type="checkbox" checked={isLightMode} onChange={() => setIsLightMode(!isLightMode)} />
                    <span className="slider round"></span>
                </label>
            </div>
        </div>
        
        <div className="config-group">
            <label>Cabeçalho do Relatório</label>
            <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={{marginBottom:'5px', width: '100%'}} />
            <input type="text" value={reportSubtitle} onChange={e => setReportSubtitle(e.target.value)} style={{width: '100%'}} />
        </div>

        <div className="config-group">
            <label>Entrada de Dados (Excel)</label>
            <textarea 
                rows="5" 
                placeholder="Cole o Excel aqui..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="input-textarea"
                style={{ width: '100%', marginBottom: '10px' }}
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

                <button className="btn-generate full-width" onClick={handleExportPDF} style={{marginTop: '20px'}}>
                    BAIXAR RELATÓRIO PDF
                </button>
            </>
        )}
      </div>

      {/* --- ÁREA DE PRÉ-VISUALIZAÇÃO --- */}
      <div className="preview-panel custom-scrollbar">
        {data ? (
            <div ref={reportRef} className="pdf-sheet" style={{ background: isLightMode ? '#ffffff' : '#1a1a1a', color: isLightMode ? '#333' : '#fff' }}>
                
                <div className="report-header-modern">
                    <div>
                        <h1 style={{ color: isLightMode ? '#000' : '#fff' }}>{reportTitle}</h1>
                        <p style={{ color: isLightMode ? '#666' : '#bbb' }}>{reportSubtitle}</p>
                    </div>
                    <div className="header-meta-tags">
                        <span className="meta-tag" style={{ background: isLightMode ? '#d1d1d1' : '#333', color: isLightMode ? '#333' : '#ccc' }}>📅 {data.dateRange.start} - {data.dateRange.end}</span>
                        <span className="meta-tag" style={{ background: isLightMode ? '#d1d1d1' : '#333', color: isLightMode ? '#333' : '#ccc' }}>⏱ {daysToUse} Dias</span>
                        <span className="meta-tag" style={{ background: isLightMode ? '#d1d1d1' : '#333', color: isLightMode ? '#333' : '#ccc' }}>📑 {data.transactions.length} OSs</span>
                    </div>
                </div>

                {/* --- CARDS DE INSIGHTS (ESTILO APP PADRÃO) --- */}
                <div className="stat-row" style={{ marginTop: '20px' }}>
                    {insightsConfig.totalParts && (
                        <div className="stat-card" style={{ background: isLightMode ? '#f0f0f0' : '#222', border: 'none', boxShadow: 'none' }}>
                            <div className="stat-value" style={{ color: isLightMode ? '#000' : '#00C49F' }}>{data.totalPartsUsed}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#555' : '#888' }}>Peças Totais</div>
                        </div>
                    )}
                    {insightsConfig.avgParts && (
                        <div className="stat-card" style={{ background: isLightMode ? '#f0f0f0' : '#222', border: 'none', boxShadow: 'none' }}>
                            <div className="stat-value" style={{ color: isLightMode ? '#000' : '#FFBB28' }}>{(data.totalPartsUsed / daysToUse).toFixed(1)}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#555' : '#888' }}>Média / Dia</div>
                        </div>
                    )}
                    {insightsConfig.topPart && (
                        <div className="stat-card" style={{ background: isLightMode ? '#f0f0f0' : '#222', border: 'none', boxShadow: 'none' }}>
                            <div className="stat-value" style={{ fontSize: '18px', color: isLightMode ? '#000' : '#FF8042' }}>{data.parts[0]?.code || '-'}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#555' : '#888' }}>Top Peça ({data.parts[0]?.count})</div>
                        </div>
                    )}
                    {insightsConfig.transactions && (
                        <div className="stat-card" style={{ background: isLightMode ? '#f0f0f0' : '#222', border: 'none', boxShadow: 'none' }}>
                            <div className="stat-value" style={{ color: isLightMode ? '#000' : '#0088FE' }}>{data.transactions.length}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#555' : '#888' }}>Transações</div>
                        </div>
                    )}
                </div>

                {/* --- RANKINGS DE MODELOS (ESTILO CARDS/PÓDIO) --- */}
                {modelRankings.some(r => r.active) && (
                   <div className="report-section">
                       <h3 className="section-title" style={{ color: titleColor }}>Rankings de Modelos</h3>
                       <div className="rankings-modern-grid" style={{ display: 'grid', gap: '15px' }}>
                           {modelRankings.filter(r => r.active).map(rank => {
                               const rankingData = getModelRankingData(rank);
                               // Cores das medalhas (Ouro, Prata, Bronze)
                               const medals = [
                                   { color: '#FFD700', label: '1º Lugar' },
                                   { color: '#C0C0C0', label: '2º Lugar' },
                                   { color: '#CD7F32', label: '3º Lugar' }
                               ];

                               return (
                                   <div key={rank.id} className="ranking-container" style={{ 
                                       background: isLightMode ? '#ffffff' : '#222', 
                                       border: isLightMode ? '0px' : '1px solid #333',
                                       boxShadow: 'none',
                                       padding: '15px',
                                       borderRadius: '8px'
                                   }}>
                                       <h4 style={{margin: '0 0 15px 0', fontSize: '14px', color: titleColor, textAlign: 'center'}}>{rank.title}</h4>
                                       {rankingData.length > 0 ? (
                                           <div className="ranking-grid" style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
                                               {rankingData.map((item, idx) => (
                                                   <div key={idx} className="rank-card" style={{ 
                                                       borderColor: medals[idx].color, 
                                                       background: isLightMode ? '#f9f9f9' : '#2a2a2a',
                                                       flex: 1, textAlign: 'center', padding: '10px', borderRadius: '6px',
                                                       borderTop: `4px solid ${medals[idx].color}`
                                                   }}>
                                                       <div className="rank-badge" style={{ backgroundColor: medals[idx].color, color: isLightMode ? '#000' : '#fff', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', marginBottom: '8px' }}>
                                                           {medals[idx].label}
                                                       </div>
                                                       <div className="rank-name" style={{ color: isLightMode ? '#000' : '#fff', fontWeight: 'bold', fontSize: '12px' }}>{item.name}</div>
                                                       <div className="rank-value" style={{ color: isLightMode ? '#555' : '#ccc', fontSize: '11px', marginTop: '4px' }}>{item.value} Aparelhos</div>
                                                   </div>
                                               ))}
                                           </div>
                                       ) : <p style={{fontSize:'12px', color:'#999', textAlign: 'center'}}>Sem dados para exibir.</p>}
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                )}

                {/* --- GRÁFICOS DE PEÇAS --- */}
                <div className="report-section">
                    {chartsConfig.filter(c => c.active).map((chart) => {
                        const chartData = getFilteredPartsData(chart);
                        return (
                            <div key={chart.id} style={{marginBottom: '40px', pageBreakInside: 'avoid'}}>
                                <h3 className="section-title" style={{ color: titleColor }}>{chart.title}</h3>
                                
                                <div className="pdf-chart-item" style={{ 
                                    background: isLightMode ? '#ffffff' : '#222', 
                                    border: isLightMode ? 'none' : '1px solid #333', 
                                    boxShadow: 'none', 
                                    outline: 'none',
                                    padding: '10px',
                                    borderRadius: '8px'
                                }}>
                                    <ResponsiveContainer width="100%" height={60 + (chartData.length * 40)}>
                                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="code" type="category" width={110} tick={{fontSize: 11, fill: axisColor, fontWeight: 600}} />
                                            <Tooltip cursor={{fill: isLightMode ? '#f0f0f0' : '#444'}} contentStyle={{ background: tooltipBg, border: tooltipBorder, color: tooltipColor, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} itemStyle={{ color: tooltipColor }} />
                                            <Bar dataKey="count" barSize={18} radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8A2BE2'][index % 5]} />
                                                ))}
                                                <LabelList dataKey="count" position="right" fill={axisColor} fontSize={11} fontWeight="bold" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {chart.showOrders && (
                                    <div style={{marginTop: '15px', paddingLeft: '10px', borderLeft: isLightMode ? '2px solid #e5e7eb' : '2px solid #4b5563'}}>
                                        {chartData.map((part, pIdx) => {
                                            const orders = data.transactions.filter(t => t.partsList && t.partsList.includes(part.code));
                                            if (orders.length === 0) return null;
                                            return (
                                                <div key={pIdx} style={{marginBottom: '10px'}}>
                                                    <h4 style={{fontSize: '12px', margin: '0 0 5px 0', color: titleColor}}>
                                                        <span style={{color: ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8A2BE2'][pIdx % 5]}}>●</span> {part.code} - {part.desc}
                                                    </h4>
                                                    <table className="styled-table-modern" style={{width: '100%', fontSize: '10px'}}>
                                                        <tbody style={{ color: isLightMode ? '#333' : '#ccc' }}>
                                                            {orders.map((os, oIdx) => (
                                                                <tr key={oIdx}>
                                                                    <td style={{width: '80px', borderBottom: isLightMode ? '1px solid #eee' : '1px solid #333'}}>{os.date ? os.date.toLocaleDateString('pt-BR') : '-'}</td>
                                                                    <td style={{width: '100px', borderBottom: isLightMode ? '1px solid #eee' : '1px solid #333'}}>{os.osNumber || 'N/A'}</td>
                                                                    <td style={{ borderBottom: isLightMode ? '1px solid #eee' : '1px solid #333' }}>{os.model}</td>
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

                {/* --- TABELA GERAL --- */}
                {showGeneralTable && (
                    <div className="report-section">
                        <h3 className="section-title" style={{ color: titleColor }}>Detalhamento de Peças</h3>
                        <table className="styled-table-modern">
                            <thead>
                                <tr style={{ borderBottom: isLightMode ? '2px solid #ddd' : '2px solid #444' }}>
                                    <th style={{width: '40px', color: axisColor}}>#</th>
                                    <th style={{width: '120px', color: axisColor}}>Código</th>
                                    <th style={{ color: axisColor }}>Descrição / Categoria</th>
                                    <th className="text-center" style={{width: '80px', color: axisColor}}>Qtd.</th>
                                    <th className="text-center" style={{width: '100px', color: axisColor}}>{getConsumptionLabel()}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.parts.slice(0, 50).map((item, index) => (
                                    <tr key={index} style={{ borderBottom: isLightMode ? '1px solid #eee' : '1px solid #333' }}>
                                        <td style={{fontWeight: 'bold', color: isLightMode ? '#9ca3af' : '#6b7280'}}>{index + 1}</td>
                                        <td style={{fontFamily: 'monospace', fontWeight: 600, color: titleColor}}>{item.code}</td>
                                        <td style={{ color: titleColor }}>
                                            <span className="badge-category" style={{ background: isLightMode ? '#f0f0f0' : '#333', color: isLightMode ? '#555' : '#ccc' }}>
                                                {item.category}
                                            </span>
                                            {item.desc}
                                        </td>
                                        <td style={{textAlign: 'center', fontWeight: 'bold', color: isLightMode ? '#0088FE' : '#60a5fa'}}>{item.count}</td>
                                        <td style={{textAlign: 'center', color: titleColor}}>{getConsumptionValue(item.count)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{marginTop: '10px', fontSize: '10px', color: isLightMode ? '#6b7280' : '#9ca3af', fontStyle: 'italic'}}>
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

// Componente Toggle (Slider)
const Toggle = ({ active, onToggle }) => (
    <label className="switch">
        <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} />
        <span className="slider round"></span>
    </label>
);

export default PartsReportPage;