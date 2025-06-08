// src/components/KpisForm.js
import React, { useState } from 'react';
import { db } from '../firebaseConfig'; // Importa a instância do Firestore
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Importa as funções necessárias do Firestore

function KpisForm() {
  const [week, setWeek] = useState('');
  const [ltpvdPercent, setLtpvdPercent] = useState('');
  const [ltpvdQtd, setLtpvdQtd] = useState('');
  const [ltpdaPercent, setLtpdaPercent] = useState('');
  const [ltpdaQtd, setLtpdaQtd] = useState('');
  const [exltpvdPercent, setExltpvdPercent] = useState('');
  const [exltpvdQtd, setExltpvdQtd] = useState('');
  const [exlptdaPercent, setExlptdaPercent] = useState('');
  const [exlrpdaQtd, setExlrpdaQtd] = useState('');
  const [ftcHappyCall, setFtcHappyCall] = useState('');
  const [ftcVd, setFtcVd] = useState('');
  const [ftcDa, setFtcDa] = useState('');
  const [firstVisitVd, setFirstVisitVd] = useState('');
  const [inHomeD1, setInHomeD1] = useState('');
  const [rrrVdPercent, setRrrVdPercent] = useState('');
  const [rrrVdQtd, setRrrVdQtd] = useState('');
  const [rrrDaPercent, setRrrDaPercent] = useState('');
  const [rrrDaQtd, setRrrDaQtd] = useState('');
  const [ssrVd, setSsrVd] = useState('');
  const [ssrDa, setSsrDa] = useState('');
  const [rnpsVd, setRnpsVd] = useState('');
  const [rnpsDa, setRnpsDa] = useState('');
  const [ecoRepairVd, setEcoRepairVd] = useState('');
  const [vendasStorePlus, setVendasStorePlus] = useState('');
  const [poInHomeD1, setPoInHomeD1] = useState('');
  const [treinamentos, setTreinamentos] = useState(''); // Novo estado para Treinamentos
  const [orcamento, setOrcamento] = useState('');     // Novo estado para Orçamento


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!week) {
      alert('Por favor, preencha o campo WEEK.');
      return;
    }

    try {
      const kpiDocRef = doc(db, 'kpis', String(week));

      await setDoc(kpiDocRef, {
        week: week,
        'LTP VD %': ltpvdPercent,
        'LTP VD QTD': ltpvdQtd,
        'LTP DA %': ltpdaPercent,
        'LTP DA QTD': ltpdaQtd,
        'EX LTP VD %': exltpvdPercent,
        'EX LTP VD QTD': exltpvdQtd,
        'EX LPT DA %': exlptdaPercent,
        'EX LRP DA QTD': exlrpdaQtd,
        'FTC HAPPY CALL': ftcHappyCall,
        'FTC VD': ftcVd,
        'FTC DA': ftcDa,
        '1ST VISIT VD': firstVisitVd,
        'IN HOME D+1': inHomeD1,
        'RRR VD %': rrrVdPercent,
        'RRR VD QTD': rrrVdQtd,
        'RRR DA %': rrrDaPercent,
        'RRR DA QTD': rrrDaQtd,
        'SSR VD': ssrVd,
        'SSR DA': ssrDa,
        'R-NPS VD': rnpsVd,
        'R-NPS DA': rnpsDa,
        'ECO REPAIR VD': ecoRepairVd,
        'VENDAS STORE+': vendasStorePlus,
        'PO IN HOME D+1': poInHomeD1,
        'Treinamentos': treinamentos, // Salva o novo campo Treinamentos
        'Orçamento': orcamento,     // Salva o novo campo Orçamento
        timestamp: serverTimestamp(),
      }, { merge: true });

      alert('Dados de KPI salvos com sucesso no Firebase!');

      // Limpar formulário após o envio
      setWeek('');
      setLtpvdPercent('');
      setLtpvdQtd('');
      setLtpdaPercent('');
      setLtpdaQtd('');
      setExltpvdPercent('');
      setExltpvdQtd('');
      setExlptdaPercent('');
      setExlrpdaQtd('');
      setFtcHappyCall('');
      setFtcVd('');
      setFtcDa('');
      setFirstVisitVd('');
      setInHomeD1('');
      setRrrVdPercent('');
      setRrrVdQtd('');
      setRrrDaPercent('');
      setRrrDaQtd('');
      setSsrVd('');
      setSsrDa('');
      setRnpsVd('');
      setRnpsDa('');
      setEcoRepairVd('');
      setVendasStorePlus('');
      setPoInHomeD1('');
      setTreinamentos(''); // Limpa novo campo
      setOrcamento('');     // Limpa novo campo

    } catch (e) {
      console.error("Erro ao adicionar documento de KPI: ", e);
      alert('Erro ao salvar dados de KPI no Firebase. Verifique o console para mais detalhes.');
    }
  };

  return (
    <div className="form-container">
      <h3>Registro de KPIs</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="week">WEEK:</label>
        <input
          type="number"
          id="week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          min="0"
          onWheel={(e) => e.target.blur()}
          required
        />

        {/* LTP */}
        <label htmlFor="ltpvdPercent">LTP VD %:</label>
        <input type="text" id="ltpvdPercent" value={ltpvdPercent} onChange={(e) => setLtpvdPercent(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="ltpvdQtd">LTP VD QTD:</label>
        <input type="number" id="ltpvdQtd" value={ltpvdQtd} onChange={(e) => setLtpvdQtd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="ltpdaPercent">LTP DA %:</label>
        <input type="text" id="ltpdaPercent" value={ltpdaPercent} onChange={(e) => setLtpdaPercent(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="ltpdaQtd">LTP DA QTD:</label>
        <input type="number" id="ltpdaQtd" value={ltpdaQtd} onChange={(e) => setLtpdaQtd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* EX LTP */}
        <label htmlFor="exltpvdPercent">EX LTP VD %:</label>
        <input type="text" id="exltpvdPercent" value={exltpvdPercent} onChange={(e) => setExltpvdPercent(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="exltpvdQtd">EX LTP VD QTD:</label>
        <input type="number" id="exltpvdQtd" value={exltpvdQtd} onChange={(e) => setExltpvdQtd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="exlptdaPercent">EX LPT DA %:</label>
        <input type="text" id="exlptdaPercent" value={exlptdaPercent} onChange={(e) => setExlptdaPercent(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="exlrpdaQtd">EX LRP DA QTD:</label>
        <input type="number" id="exlrpdaQtd" value={exlrpdaQtd} onChange={(e) => setExlrpdaQtd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* FTC HAPPY CALL (Novo campo unificado) */}
        <label htmlFor="ftcHappyCall">FTC HAPPY CALL:</label>
        <input type="number" id="ftcHappyCall" value={ftcHappyCall} onChange={(e) => setFtcHappyCall(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* FTC VD/DA (mantidos) */}
        <label htmlFor="ftcVd">FTC VD:</label>
        <input type="number" id="ftcVd" value={ftcVd} onChange={(e) => setFtcVd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="ftcDa">FTC DA:</label>
        <input type="number" id="ftcDa" value={ftcDa} onChange={(e) => setFtcDa(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* ECO REPAIR VD (Novo Campo) */}
        <label htmlFor="ecoRepairVd">ECO REPAIR VD:</label>
        <input type="text" id="ecoRepairVd" value={ecoRepairVd} onChange={(e) => setEcoRepairVd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* PO IN HOME D+1 (Novo Campo) */}
        <label htmlFor="poInHomeD1">PO IN HOME D+1:</label>
        <input type="text" id="poInHomeD1" value={poInHomeD1} onChange={(e) => setPoInHomeD1(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* Visitas */}
        <label htmlFor="firstVisitVd">1ST VISIT VD:</label>
        <input type="number" id="firstVisitVd" value={firstVisitVd} onChange={(e) => setFirstVisitVd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="inHomeD1">IN HOME D+1:</label>
        <input type="number" id="inHomeD1" value={inHomeD1} onChange={(e) => setInHomeD1(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* RRR */}
        <label htmlFor="rrrVdPercent">RRR VD %:</label>
        <input type="text" id="rrrVdPercent" value={rrrVdPercent} onChange={(e) => setRrrVdPercent(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="rrrVdQtd">RRR VD QTD:</label>
        <input type="number" id="rrrVdQtd" value={rrrVdQtd} onChange={(e) => setRrrVdQtd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="rrrDaPercent">RRR DA %:</label>
        <input type="text" id="rrrDaPercent" value={rrrDaPercent} onChange={(e) => setRrrDaPercent(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="rrrDaQtd">RRR DA QTD:</label>
        <input type="number" id="rrrDaQtd" value={rrrDaQtd} onChange={(e) => setRrrDaQtd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* SSR */}
        <label htmlFor="ssrVd">SSR VD:</label>
        <input type="number" id="ssrVd" value={ssrVd} onChange={(e) => setSsrVd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="ssrDa">SSR DA:</label>
        <input type="number" id="ssrDa" value={ssrDa} onChange={(e) => setSsrDa(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* R-NPS */}
        <label htmlFor="rnpsVd">R-NPS VD:</label>
        <input type="text" id="rnpsVd" value={rnpsVd} onChange={(e) => setRnpsVd(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <label htmlFor="rnpsDa">R-NPS DA:</label>
        <input type="text" id="rnpsDa" value={rnpsDa} onChange={(e) => setRnpsDa(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* VENDAS STORE+ (Novo Campo) */}
        <label htmlFor="vendasStorePlus">VENDAS STORE+:</label>
        <input type="number" id="vendasStorePlus" value={vendasStorePlus} onChange={(e) => setVendasStorePlus(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* Treinamentos (Novo Campo) */}
        <label htmlFor="treinamentos">TREINAMENTOS:</label>
        <input type="number" id="treinamentos" value={treinamentos} onChange={(e) => setTreinamentos(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        {/* Orçamento (Novo Campo) */}
        <label htmlFor="orcamento">ORÇAMENTO    IH:</label>
        <input type="number" id="orcamento" value={orcamento} onChange={(e) => setOrcamento(e.target.value)} min="0" onWheel={(e) => e.target.blur()} />

        <button type="submit">Enviar KPIs</button>
      </form>
    </div>
  );
}

export default KpisForm;