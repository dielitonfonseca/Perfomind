import React, { useState, useRef } from 'react';
import { processPartsData } from '../utils/partsLogic';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import '../App.css'; 

const getCategoryFromModel = (model) => {
    if (!model) return 'OUTROS';
    const m = model.toUpperCase().trim();
    
    if (m.startsWith('WW') || m.startsWith('WD') || m.startsWith('WF')) return 'WSM';
    if (m.startsWith('RT') || m.startsWith('RF') || m.startsWith('RS') || m.startsWith('RL')) return 'REF';
    if (m.startsWith('AR')) return 'RAC';
    if (m.startsWith('QN') || m.startsWith('UN') || m.startsWith('LH') || m.startsWith('LS')) return 'VD';
    
    return 'OUTROS';
};

const PartsReportPage = () => {
  const [isLightMode, setIsLightMode] = useState(false);
  const [inputText, setInputText] = useState('');
  const [reportTitle, setReportTitle] = useState('Relatório Técnico de Peças');
  const [reportSubtitle, setReportSubtitle] = useState('Análise de Consumo e Modelos');
  const [manualDays, setManualDays] = useState('');

  const [showDateInHeader, setShowDateInHeader] = useState(true);
  const [headerDateFormat, setHeaderDateFormat] = useState('date');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customWeek, setCustomWeek] = useState('');

  const [insightsConfig, setInsightsConfig] = useState({
    totalParts: true,
    avgParts: true,
    topPart: true
  });

  const [showGeneralTable, setShowGeneralTable] = useState(true);
  const [tableMetric, setTableMetric] = useState('daily');
  const [tableRowLimit, setTableRowLimit] = useState(50); 

  const [chartsConfig, setChartsConfig] = useState([
    { id: 1, active: true, title: 'Top Peças VD', category: 'VD', limit: 5, showOrders: false },
    { id: 2, active: true, title: 'Top Peças WSM', category: 'WSM', limit: 5, showOrders: false },
    { id: 3, active: true, title: 'Top Peças REF', category: 'REF', limit: 5, showOrders: false },
    { id: 4, active: true, title: 'Top Peças RAC', category: 'RAC', limit: 5, showOrders: false },
    { id: 5, active: false, title: 'Top Peças (Geral)', category: 'TODOS', limit: 5, showOrders: false },
  ]);

  const [modelRankings, setModelRankings] = useState([
    { id: 1, active: true, title: 'Top Modelos (Geral)', category: 'TODOS', onlyWithParts: true },
    { id: 2, active: false, title: 'Top Modelos (VD)', category: 'VD', onlyWithParts: true },
    { id: 3, active: false, title: 'Top Modelos (Linha Branca)', category: 'WSM', onlyWithParts: true },
    { id: 4, active: false, title: 'Top Modelos (RAC)', category: 'RAC', onlyWithParts: true },
  ]);

  const [showLtpSection, setShowLtpSection] = useState(false);
  const [ltpTargetDA, setLtpTargetDA] = useState(5);
  const [ltpTargetVD, setLtpTargetVD] = useState(7);
  const [ltpTargetVDCi, setLtpTargetVDCi] = useState(3);

  const [ltpFilters, setLtpFilters] = useState({
      vdOw: true,
      vdLp: true,
      daOw: true,
      daLp: true,
      vdCiOw: true,
      vdCiLp: true,
  });

  const [data, setData] = useState(null);
  const reportRef = useRef();

  const handleProcess = () => {
    if (!inputText) return;
    const processed = processPartsData(inputText);
    if (processed.error) {
        alert(processed.error);
        return;
    }

    if (processed.transactions) {
        processed.transactions.forEach(t => {
            t.category = getCategoryFromModel(t.model);
        });
    }

    if (processed.parts) {
        processed.parts.forEach(p => {
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

  const updateChartConfig = (id, field, value) => {
    setChartsConfig(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateRankingConfig = (id, field, value) => {
    setModelRankings(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const toggleInsight = (key) => {
    setInsightsConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLtpFilter = (key) => {
      setLtpFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
        .slice(0, 3);
  };

  const getLtpOrders = (categoryGroup, warrantyStatus) => {
      if (!data || !data.transactions) return [];

      const result = [];

      data.transactions.forEach(t => {
          if (t.durationDays === null || !t.warrantyFlag) return;
          if (t.warrantyFlag !== warrantyStatus) return;

          if (t.serviceType && (t.serviceType.includes('RH') || t.serviceType.includes('II'))) return;

          let target = 0;
          let isMatchCategory = false;

          if (categoryGroup === 'VD_CI' && t.category === 'VD' && t.serviceType && t.serviceType.includes('CI')) {
              target = parseInt(ltpTargetVDCi, 10);
              isMatchCategory = true;
          } else if (categoryGroup === 'VD' && t.category === 'VD' && (!t.serviceType || !t.serviceType.includes('CI'))) {
              target = parseInt(ltpTargetVD, 10);
              isMatchCategory = true;
          } else if (categoryGroup === 'DA' && ['WSM', 'REF', 'RAC'].includes(t.category)) {
              target = parseInt(ltpTargetDA, 10);
              isMatchCategory = true;
          }

          if (isMatchCategory && t.durationDays > target) {
              result.push({
                  ...t,
                  overdueDays: t.durationDays - target 
              });
          }
      });

      return result.sort((a, b) => b.durationDays - a.durationDays);
  };

  const handleExportPDF = async () => {
    const input = reportRef.current;
    if (!input) return;

    try {
        const canvas = await html2canvas(input, { 
            scale: 2, 
            backgroundColor: isLightMode ? '#ffffff' : '#1a1a1a', 
            useCORS: true 
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight; 
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const fileName = `${reportTitle}${reportSubtitle ? ' - ' + reportSubtitle : ''}.pdf`;
        pdf.save(fileName);
    } catch (err) { console.error(err); }
  };

  const daysToUse = manualDays ? parseInt(manualDays) : 1;

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

  const titleColor = isLightMode ? '#333' : '#fff';
  const axisColor = isLightMode ? '#666' : '#ccc';
  const gridColor = isLightMode ? '#d1d1d1' : '#444';
  const tooltipBg = isLightMode ? '#ffffff' : '#333333';
  const tooltipColor = isLightMode ? '#333' : '#fff';

  return (
    <div className="reports-page-container">
      
      <div className="config-panel custom-scrollbar">
        <h2 className="config-title">Configuração</h2>

        <div className="toggle-item small" style={{ marginBottom: '20px', background: isLightMode ? '#e0e0e0' : '#333' }}>
            <div className="toggle-header">
                <span style={{ color: isLightMode ? '#333' : '#fff', fontWeight: 'bold' }}>
                    {isLightMode ? 'Modo de Impressão (Claro)' : 'Modo Padrão (Escuro)'}
                </span>
                <Toggle active={isLightMode} onToggle={() => setIsLightMode(!isLightMode)} />
            </div>
        </div>
        
        <div className="config-group">
            <label>Cabeçalho do Relatório</label>
            <input type="text" value={reportTitle} onChange={e => setReportTitle(e.target.value)} style={{marginBottom:'5px', width: '100%'}} />
            <input type="text" value={reportSubtitle} onChange={e => setReportSubtitle(e.target.value)} style={{width: '100%'}} />
        </div>

        <div className="config-group">
            <label>Entrada de Dados (Excel)</label>
            <textarea rows="5" placeholder="Cole o Excel aqui..." value={inputText} onChange={(e) => setInputText(e.target.value)} className="input-textarea" style={{ width: '100%', marginBottom: '10px' }} />
            <button className="btn-generate full-width" onClick={handleProcess}>PROCESSAR DADOS</button>
        </div>

        {data && (
            <>
                <div className="config-group">
                    <label>Período Considerado (Dias) *MANUAL*</label>
                    {/* --- USO DO NOVO COMPONENTE COUNTER INPUT --- */}
                    <CounterInput value={manualDays} onChange={setManualDays} placeholder="Ex: 30" isLightMode={isLightMode} />
                </div>

                <div className="config-divider">Data no Cabeçalho</div>
                <div className="toggle-item small" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div className="toggle-header" style={{ width: '100%' }}>
                        <span>Inserir Data no Header</span>
                        <Toggle active={showDateInHeader} onToggle={() => setShowDateInHeader(!showDateInHeader)} />
                    </div>
                    {showDateInHeader && (
                        <div className="toggle-content fade-in" style={{ width: '100%', marginTop: '10px' }}>
                            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', fontSize: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center' }}><input type="radio" checked={headerDateFormat === 'date'} onChange={() => setHeaderDateFormat('date')} style={{ marginRight: '5px' }} />DATA</label>
                                <label style={{ display: 'flex', alignItems: 'center' }}><input type="radio" checked={headerDateFormat === 'week'} onChange={() => setHeaderDateFormat('week')} style={{ marginRight: '5px' }} />WEEK</label>
                            </div>

                            {headerDateFormat === 'date' ? (
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <input type="text" placeholder="Início" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ width: '50%' }} />
                                    <input type="text" placeholder="Fim" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ width: '50%' }} />
                                </div>
                            ) : (
                                <input type="text" placeholder="Semana (ex: 42)" value={customWeek} onChange={e => setCustomWeek(e.target.value)} style={{ width: '100%' }} />
                            )}
                        </div>
                    )}
                </div>

                <div className="config-divider">Cartões de Insights</div>
                <div className="toggle-item small"><div className="toggle-header"><span>Total de Peças</span><Toggle active={insightsConfig.totalParts} onToggle={() => toggleInsight('totalParts')} /></div></div>
                <div className="toggle-item small"><div className="toggle-header"><span>Média Diária</span><Toggle active={insightsConfig.avgParts} onToggle={() => toggleInsight('avgParts')} /></div></div>
                <div className="toggle-item small"><div className="toggle-header"><span>Peça Mais Usada</span><Toggle active={insightsConfig.topPart} onToggle={() => toggleInsight('topPart')} /></div></div>

                <div className="config-divider">Detalhamento de Peças</div>
                <div className="toggle-item">
                    <div className="toggle-header">
                        <span>Exibir Detalhamento</span>
                        <Toggle active={showGeneralTable} onToggle={() => setShowGeneralTable(!showGeneralTable)} />
                    </div>
                    {showGeneralTable && (
                        <div className="toggle-content fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                                <label style={{fontSize: '12px', display: 'block'}}>Qtd. Linhas na Tabela:</label>
                                <input type="number" value={tableRowLimit} onChange={(e) => setTableRowLimit(e.target.value)} style={{width: '100%'}} />
                            </div>
                            <div>
                                <label style={{fontSize: '12px', display: 'block'}}>Métrica de Consumo:</label>
                                <select value={tableMetric} onChange={(e) => setTableMetric(e.target.value)} style={{width: '100%'}}>
                                    <option value="daily">Consumo Dia</option>
                                    <option value="weekly">Consumo Semana</option>
                                    <option value="monthly">Consumo Mês</option>
                                </select>
                            </div>
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

                <div className="config-divider">Sessão LTP (Ordens em Atraso)</div>
                <div className="toggle-item">
                    <div className="toggle-header">
                        <span>Exibir Sessão LTP</span>
                        <Toggle active={showLtpSection} onToggle={() => setShowLtpSection(!showLtpSection)} />
                    </div>
                    {showLtpSection && (
                        <div className="toggle-content fade-in">
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{fontSize: '10px', display: 'block', marginBottom: '4px'}}>Meta DA</label>
                                    {/* --- USO DO NOVO COMPONENTE COUNTER INPUT --- */}
                                    <CounterInput value={ltpTargetDA} onChange={setLtpTargetDA} isLightMode={isLightMode} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{fontSize: '10px', display: 'block', marginBottom: '4px'}}>Meta VD</label>
                                    {/* --- USO DO NOVO COMPONENTE COUNTER INPUT --- */}
                                    <CounterInput value={ltpTargetVD} onChange={setLtpTargetVD} isLightMode={isLightMode} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{fontSize: '10px', display: 'block', marginBottom: '4px'}}>Meta VD CI</label>
                                    {/* --- USO DO NOVO COMPONENTE COUNTER INPUT --- */}
                                    <CounterInput value={ltpTargetVDCi} onChange={setLtpTargetVDCi} isLightMode={isLightMode} />
                                </div>
                            </div>

                            <div className="sub-toggle" style={{marginBottom: '5px'}}><span>LTP VD (OW)</span><Toggle active={ltpFilters.vdOw} onToggle={() => toggleLtpFilter('vdOw')} /></div>
                            <div className="sub-toggle" style={{marginBottom: '5px'}}><span>LTP VD (LP)</span><Toggle active={ltpFilters.vdLp} onToggle={() => toggleLtpFilter('vdLp')} /></div>
                            <div className="sub-toggle" style={{marginBottom: '5px', marginLeft: '15px', color: '#888'}}><span>↳ LTP VD CI (OW)</span><Toggle active={ltpFilters.vdCiOw} onToggle={() => toggleLtpFilter('vdCiOw')} /></div>
                            <div className="sub-toggle" style={{marginBottom: '10px', marginLeft: '15px', color: '#888'}}><span>↳ LTP VD CI (LP)</span><Toggle active={ltpFilters.vdCiLp} onToggle={() => toggleLtpFilter('vdCiLp')} /></div>
                            <div className="sub-toggle" style={{marginBottom: '5px'}}><span>LTP DA (OW)</span><Toggle active={ltpFilters.daOw} onToggle={() => toggleLtpFilter('daOw')} /></div>
                            <div className="sub-toggle"><span>LTP DA (LP)</span><Toggle active={ltpFilters.daLp} onToggle={() => toggleLtpFilter('daLp')} /></div>
                        </div>
                    )}
                </div>

                <button className="btn-generate full-width" onClick={handleExportPDF} style={{marginTop: '20px'}}>
                    BAIXAR RELATÓRIO PDF
                </button>
            </>
        )}
      </div>

      <div className="preview-panel custom-scrollbar" style={{ display: 'flex', justifyContent: 'center' }}>
        {data ? (
            <div ref={reportRef} className="pdf-sheet" style={{ background: isLightMode ? '#ffffff' : '#1a1a1a', color: isLightMode ? '#333' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '900px' }}>
                
                <div className="report-header-modern" style={{ textAlign: 'center', width: '100%' }}>
                    <div>
                        <h1 style={{ color: isLightMode ? '#000' : '#fff' }}>{reportTitle}</h1>
                        <p style={{ color: isLightMode ? '#666' : '#bbb' }}>{reportSubtitle}</p>
                    </div>
                    <div className="header-meta-tags" style={{ justifyContent: 'center' }}>
                        {showDateInHeader && (
                            <span className="meta-tag" style={{ background: isLightMode ? '#d1d1d1' : '#333', color: isLightMode ? '#333' : '#ccc' }}>
                                📅 {headerDateFormat === 'date' 
                                    ? `${customStartDate || data.dateRange.start} - ${customEndDate || data.dateRange.end}` 
                                    : `Semana ${customWeek || '-'}`
                                }
                            </span>
                        )}
                        {!(showDateInHeader && headerDateFormat === 'week') && (
                            <span className="meta-tag" style={{ background: isLightMode ? '#d1d1d1' : '#333', color: isLightMode ? '#333' : '#ccc' }}>⏱ {daysToUse} Dias</span>
                        )}
                    </div>
                </div>

                <div className="stat-row" style={{ marginTop: '20px', display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                    {insightsConfig.totalParts && (
                        <div className="stat-card app-style-card" style={{ background: isLightMode ? '#fff' : '#222', border: `1px solid ${isLightMode ? '#eee' : '#333'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '16px', padding: '20px', minWidth: '150px', textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: '#00C49F', fontSize: '28px', fontWeight: 'bold' }}>{data.totalPartsUsed}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#777' : '#aaa', fontSize: '13px', marginTop: '5px', fontWeight: '500' }}>📦 Peças Totais</div>
                        </div>
                    )}
                    {insightsConfig.avgParts && (
                        <div className="stat-card app-style-card" style={{ background: isLightMode ? '#fff' : '#222', border: `1px solid ${isLightMode ? '#eee' : '#333'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '16px', padding: '20px', minWidth: '150px', textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: '#FFBB28', fontSize: '28px', fontWeight: 'bold' }}>{(data.totalPartsUsed / daysToUse).toFixed(1)}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#777' : '#aaa', fontSize: '13px', marginTop: '5px', fontWeight: '500' }}>📈 Média / Dia</div>
                        </div>
                    )}
                    {insightsConfig.topPart && (
                        <div className="stat-card app-style-card" style={{ background: isLightMode ? '#fff' : '#222', border: `1px solid ${isLightMode ? '#eee' : '#333'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '16px', padding: '20px', minWidth: '150px', textAlign: 'center' }}>
                            <div className="stat-value" style={{ color: '#FF8042', fontSize: '18px', fontWeight: 'bold', wordBreak: 'break-all' }}>{data.parts[0]?.code || '-'}</div>
                            <div className="stat-label" style={{ color: isLightMode ? '#777' : '#aaa', fontSize: '13px', marginTop: '5px', fontWeight: '500' }}>👑 Top Peça ({data.parts[0]?.count})</div>
                        </div>
                    )}
                </div>

                {/* --- PÓDIO DE MODELOS (AGORA 100% EMPILHADO VERTICALMENTE E SEM O CONTAINER EM VOLTA) --- */}
                {modelRankings.some(r => r.active) && (
                    <div className="report-section" style={{ width: '100%', marginTop: '30px', textAlign: 'center' }}>
                        <h3 className="section-title" style={{ color: titleColor, marginBottom: '20px' }}>Rankings de Modelos</h3>
                        
                        {/* Removido o grid multi-colunas e forçado para 1fr (1 coluna) */}
                        <div className="rankings-modern-grid" style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr' }}>
                            {modelRankings.filter(r => r.active).map(rank => {
                                const rankingData = getModelRankingData(rank);
                                const medals = [{ color: '#FFD700', label: '1º Lugar' }, { color: '#C0C0C0', label: '2º Lugar' }, { color: '#CD7F32', label: '3º Lugar' }];

                                return (
                                    /* Removido as bordas/fundo que enclausuravam o pódio */
                                    <div key={rank.id} className="ranking-container" style={{ padding: '5px' }}>
                                        <h4 style={{margin: '0 0 10px 0', fontSize: '14px', color: titleColor, textAlign: 'center'}}>{rank.title}</h4>
                                        {rankingData.length > 0 ? (
                                            <div className="ranking-grid" style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
                                                {rankingData.map((item, idx) => (
                                                    <div key={idx} className="rank-card" style={{ borderColor: medals[idx].color, background: isLightMode ? '#f9f9f9' : '#2a2a2a', flex: 1, textAlign: 'center', padding: '10px', borderRadius: '6px', borderTop: `4px solid ${medals[idx].color}` }}>
                                                        <div className="rank-badge" style={{ backgroundColor: medals[idx].color, color: isLightMode ? '#000' : '#fff', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', marginBottom: '8px' }}>{medals[idx].label}</div>
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

                <div className="report-section" style={{ width: '100%', marginTop: '30px' }}>
                    {chartsConfig.filter(c => c.active).map((chart) => {
                        const chartData = getFilteredPartsData(chart);
                        return (
                            <div key={chart.id} style={{ marginBottom: '40px', pageBreakInside: 'avoid', textAlign: 'center' }}>
                                <h3 className="section-title" style={{ color: titleColor, marginBottom: '15px' }}>{chart.title}</h3>
                                <div className="pdf-chart-item" style={{ background: isLightMode ? '#ffffff' : '#222', border: isLightMode ? '1px solid #eee' : '1px solid #333', padding: '15px', borderRadius: '12px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height={60 + (chartData.length * 40)}>
                                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="code" type="category" width={110} tick={{fontSize: 11, fill: axisColor, fontWeight: 600}} />
                                            <Tooltip cursor={{fill: isLightMode ? '#f0f0f0' : '#444'}} contentStyle={{ background: tooltipBg, color: tooltipColor, borderRadius: '8px' }} />
                                            <Bar dataKey="count" barSize={18} radius={[0, 4, 4, 0]}>
                                                {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8A2BE2'][index % 5]} />)}
                                                <LabelList dataKey="count" position="right" fill={axisColor} fontSize={11} fontWeight="bold" />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {showGeneralTable && (
                    <div className="report-section" style={{ width: '100%', textAlign: 'center' }}>
                        <h3 className="section-title" style={{ color: titleColor }}>Detalhamento de Peças</h3>
                        <div style={{ overflowX: 'auto', width: '100%' }}>
                            <table className="styled-table-modern" style={{ width: '100%', textAlign: 'center' }}>
                                <thead>
                                    <tr style={{ borderBottom: isLightMode ? '2px solid #ddd' : '2px solid #444' }}>
                                        <th style={{width: '40px', color: axisColor, textAlign: 'center'}}>#</th>
                                        <th style={{width: '120px', color: axisColor, textAlign: 'center'}}>Código</th>
                                        <th style={{width: '100px', color: axisColor, textAlign: 'center'}}>Categoria</th>
                                        <th style={{ color: axisColor, textAlign: 'center' }}>Descrição</th>
                                        <th style={{width: '80px', color: axisColor, textAlign: 'center'}}>Qtd.</th>
                                        <th style={{width: '100px', color: axisColor, textAlign: 'center'}}>{getConsumptionLabel()}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.parts.slice(0, tableRowLimit).map((item, index) => (
                                        <tr key={index} style={{ borderBottom: isLightMode ? '1px solid #eee' : '1px solid #333' }}>
                                            <td style={{fontWeight: 'bold', color: isLightMode ? '#9ca3af' : '#6b7280'}}>{index + 1}</td>
                                            <td style={{fontFamily: 'monospace', fontWeight: 600, color: titleColor}}>{item.code}</td>
                                            <td><span className="badge-category" style={{ background: isLightMode ? '#f0f0f0' : '#333', color: isLightMode ? '#555' : '#ccc', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{item.category}</span></td>
                                            <td style={{ color: titleColor }} title={item.desc}>{item.desc.length > 24 ? `${item.desc.slice(0, 24)}...` : item.desc}</td>
                                            <td style={{fontWeight: 'bold', color: isLightMode ? '#0088FE' : '#60a5fa'}}>{item.count}</td>
                                            <td style={{color: titleColor}}>{getConsumptionValue(item.count)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {chartsConfig.some(c => c.active && c.showOrders) && (
                    <div className="report-section" style={{ width: '100%', marginTop: '40px', textAlign: 'center' }}>
                        <h3 className="section-title" style={{ color: titleColor, marginBottom: '20px' }}>Listagem de Ordens (Detalhe)</h3>
                        {chartsConfig.filter(c => c.active && c.showOrders).map(chart => {
                            const chartParts = getFilteredPartsData(chart);
                            return (
                                <div key={chart.id} style={{ marginBottom: '30px', textAlign: 'left', width: '100%', background: isLightMode ? '#f9f9f9' : '#222', padding: '20px', borderRadius: '12px' }}>
                                    <h4 style={{ color: titleColor, borderBottom: `2px solid ${gridColor}`, paddingBottom: '10px', marginBottom: '15px' }}>Ordens: {chart.title}</h4>
                                    {chartParts.map(part => {
                                        const relatedOrders = data.transactions.filter(t => t.partsList && t.partsList.includes(part.code));
                                        if (relatedOrders.length === 0) return null;
                                        return (
                                            <div key={part.code} style={{ marginTop: '20px' }}>
                                                <h5 style={{ color: isLightMode ? '#333' : '#fff', fontSize: '14px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{color: '#0088FE'}}>●</span> {part.code} - {part.desc} <span style={{fontSize: '11px', color: '#888'}}>({relatedOrders.length} ordens)</span>
                                                </h5>
                                                <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${isLightMode ? '#eee' : '#333'}` }}>
                                                    <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                        <thead>
                                                            <tr style={{ background: isLightMode ? '#eee' : '#333' }}>
                                                                <th style={{ color: axisColor, padding: '8px 12px' }}>Ordem de Serviço</th>
                                                                <th style={{ color: axisColor, padding: '8px 12px' }}>Modelo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {relatedOrders.map((order, idx) => (
                                                                <tr key={idx} style={{ borderTop: isLightMode ? '1px solid #eee' : '1px solid #444' }}>
                                                                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: isLightMode ? '#0088FE' : '#60a5fa' }}>{order.osNumber}</td>
                                                                    <td style={{ padding: '8px 12px', color: titleColor }}>{order.model}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                )}

                {showLtpSection && Object.values(ltpFilters).some(v => v) && (
                    <div className="report-section" style={{ width: '100%', marginTop: '40px', textAlign: 'center' }}>
                        <h3 className="section-title" style={{ color: titleColor, marginBottom: '20px' }}>Listagem de LTP</h3>

                        {Object.entries({
                            'LTP VD (OW)': { cat: 'VD', flag: 'OW', active: ltpFilters.vdOw },
                            'LTP VD (LP)': { cat: 'VD', flag: 'LP', active: ltpFilters.vdLp },
                            'LTP VD CI (OW)': { cat: 'VD_CI', flag: 'OW', active: ltpFilters.vdCiOw },
                            'LTP VD CI (LP)': { cat: 'VD_CI', flag: 'LP', active: ltpFilters.vdCiLp },
                            'LTP DA (OW)': { cat: 'DA', flag: 'OW', active: ltpFilters.daOw },
                            'LTP DA (LP)': { cat: 'DA', flag: 'LP', active: ltpFilters.daLp },
                        }).map(([title, config]) => {
                            if (!config.active) return null;
                            const ltpData = getLtpOrders(config.cat, config.flag);
                            if (ltpData.length === 0) return null;

                            const totalOverdue = ltpData.reduce((acc, order) => acc + order.overdueDays, 0);

                            return (
                                <div key={title} style={{ marginBottom: '30px', textAlign: 'left', width: '100%', background: isLightMode ? '#f9f9f9' : '#222', padding: '20px', borderRadius: '12px' }}>
                                    <h4 style={{ color: titleColor, borderBottom: `2px solid ${gridColor}`, paddingBottom: '10px', marginBottom: '15px' }}>
                                        {title} 
                                        <span style={{fontSize: '11px', color: '#888', marginLeft: '5px'}}>({ltpData.length} ordens)</span>
                                        <span style={{fontSize: '11px', color: '#FF8042', marginLeft: '10px', fontWeight: 'bold'}}>Total QTD: {totalOverdue} dias</span>
                                    </h4>

                                    <div style={{ overflowX: 'auto', borderRadius: '8px', border: `1px solid ${isLightMode ? '#eee' : '#333'}` }}>
                                        <table style={{ width: '100%', fontSize: '12px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: isLightMode ? '#eee' : '#333' }}>
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>Data Sol.</th>
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>Data Fim</th>
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>Dias</th>
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>QTD</th> 
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>OS</th>
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>Modelo</th>
                                                    <th style={{ color: axisColor, padding: '8px 12px' }}>Serviço</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ltpData.map((order, idx) => (
                                                    <tr key={idx} style={{ borderTop: isLightMode ? '1px solid #eee' : '1px solid #444' }}>
                                                        <td style={{ padding: '8px 12px', color: titleColor }}>{order.solDateObj ? order.solDateObj.toLocaleDateString('pt-BR') : 'N/A'}</td>
                                                        <td style={{ padding: '8px 12px', color: titleColor }}>{order.finishDateObj ? order.finishDateObj.toLocaleDateString('pt-BR') : 'N/A'}</td>
                                                        <td style={{ padding: '8px 12px', color: titleColor }}>{order.durationDays}</td>
                                                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#FF8042' }}>+{order.overdueDays}</td> 
                                                        <td style={{ padding: '8px 12px', fontWeight: 'bold', color: isLightMode ? '#0088FE' : '#60a5fa' }}>{order.osNumber}</td>
                                                        <td style={{ padding: '8px 12px', color: titleColor }}>{order.model}</td>
                                                        <td style={{ padding: '8px 12px', color: titleColor, fontStyle: 'italic' }}>{order.serviceType}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
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

// --- NOVO: COMPONENTE CUSTOMIZADO PARA INPUTS DE NÚMERO (Bloqueia Scroll e tem botões + e -) ---
const CounterInput = ({ value, onChange, placeholder = "0", isLightMode }) => {
    const btnStyle = {
        width: '30px', height: '30px', border: 'none', 
        background: isLightMode ? '#e5e7eb' : '#4b5563', 
        color: isLightMode ? '#333' : '#fff',
        cursor: 'pointer', fontWeight: 'bold', fontSize: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
    };

    const val = value === '' ? '' : parseInt(value, 10);

    const handleIncrement = () => {
        const current = val === '' ? 0 : val;
        onChange(current + 1);
    };

    const handleDecrement = () => {
        const current = val === '' ? 0 : val;
        if (current > 0) onChange(current - 1);
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', background: isLightMode ? '#fff' : '#333', border: isLightMode ? '1px solid #ccc' : '1px solid #555', borderRadius: '6px', overflow: 'hidden' }}>
            <button onClick={handleDecrement} style={btnStyle}>-</button>
            <input
                type="number"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                onWheel={(e) => e.target.blur()}
                style={{ 
                    flex: 1, border: 'none', textAlign: 'center', 
                    background: 'transparent', color: isLightMode ? '#333' : '#fff',
                    outline: 'none', fontSize: '14px' 
                }} 
            />
            <button onClick={handleIncrement} style={btnStyle}>+</button>
        </div>
    );
};

export default PartsReportPage;