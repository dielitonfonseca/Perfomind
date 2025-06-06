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
  const [ftcHappyCallVd, setFtcHappyCallVd] = useState('');
  const [ftcHappyCallDa, setFtcHappyCallDa] = useState('');
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!week) {
      alert('Por favor, preencha o campo WEEK.');
      return;
    }

    try {
      // Cria uma referência para o documento da semana dentro da coleção 'kpis'
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
        'FTC HAPPY CALL VD': ftcHappyCallVd,
        'FTC HAPPY CALL DA': ftcHappyCallDa,
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
        timestamp: serverTimestamp(), // Adiciona um timestamp do servidor
      }, { merge: true }); // Use merge: true para atualizar ou criar o documento

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
      setFtcHappyCallVd('');
      setFtcHappyCallDa('');
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

    } catch (e) {
      console.error("Erro ao adicionar documento de KPI: ", e);
      alert('Erro ao salvar dados de KPI no Firebase. Verifique o console para mais detalhes.');
    }
  };

  return (
    <div className="form-container"> {/* Reutiliza a classe form-container para estilização */}
      <h3>Registro de KPIs</h3>
      <form onSubmit={handleSubmit}>
        <label htmlFor="week">WEEK:</label>
        <input
          type="number"
          id="week"
          value={week}
          onChange={(e) => setWeek(e.target.value)}
          required
        />

        {/* LTP */}
        <label htmlFor="ltpvdPercent">LTP VD %:</label>
        <input type="text" id="ltpvdPercent" value={ltpvdPercent} onChange={(e) => setLtpvdPercent(e.target.value)} />

        <label htmlFor="ltpvdQtd">LTP VD QTD:</label>
        <input type="number" id="ltpvdQtd" value={ltpvdQtd} onChange={(e) => setLtpvdQtd(e.target.value)} />

        <label htmlFor="ltpdaPercent">LTP DA %:</label>
        <input type="text" id="ltpdaPercent" value={ltpdaPercent} onChange={(e) => setLtpdaPercent(e.target.value)} />

        <label htmlFor="ltpdaQtd">LTP DA QTD:</label>
        <input type="number" id="ltpdaQtd" value={ltpdaQtd} onChange={(e) => setLtpdaQtd(e.target.value)} />

        {/* EX LTP */}
        <label htmlFor="exltpvdPercent">EX LTP VD %:</label>
        <input type="text" id="exltpvdPercent" value={exltpvdPercent} onChange={(e) => setExltpvdPercent(e.target.value)} />

        <label htmlFor="exltpvdQtd">EX LTP VD QTD:</label>
        <input type="number" id="exltpvdQtd" value={exltpvdQtd} onChange={(e) => setExltpvdQtd(e.target.value)} />

        <label htmlFor="exlptdaPercent">EX LPT DA %:</label>
        <input type="text" id="exlptdaPercent" value={exlptdaPercent} onChange={(e) => setExlptdaPercent(e.target.value)} />

        <label htmlFor="exlrpdaQtd">EX LRP DA QTD:</label>
        <input type="number" id="exlrpdaQtd" value={exlrpdaQtd} onChange={(e) => setExlrpdaQtd(e.target.value)} />

        {/* FTC */}
        <label htmlFor="ftcHappyCallVd">FTC HAPPY CALL VD:</label>
        <input type="number" id="ftcHappyCallVd" value={ftcHappyCallVd} onChange={(e) => setFtcHappyCallVd(e.target.value)} />

        <label htmlFor="ftcHappyCallDa">FTC HAPPY CALL DA:</label>
        <input type="number" id="ftcHappyCallDa" value={ftcHappyCallDa} onChange={(e) => setFtcHappyCallDa(e.target.value)} />

        <label htmlFor="ftcVd">FTC VD:</label>
        <input type="number" id="ftcVd" value={ftcVd} onChange={(e) => setFtcVd(e.target.value)} />

        <label htmlFor="ftcDa">FTC DA:</label>
        <input type="number" id="ftcDa" value={ftcDa} onChange={(e) => setFtcDa(e.target.value)} />

        {/* Visitas */}
        <label htmlFor="firstVisitVd">1ST VISIT VD:</label>
        <input type="number" id="firstVisitVd" value={firstVisitVd} onChange={(e) => setFirstVisitVd(e.target.value)} />

        <label htmlFor="inHomeD1">IN HOME D+1:</label>
        <input type="number" id="inHomeD1" value={inHomeD1} onChange={(e) => setInHomeD1(e.target.value)} />

        {/* RRR */}
        <label htmlFor="rrrVdPercent">RRR VD %:</label>
        <input type="text" id="rrrVdPercent" value={rrrVdPercent} onChange={(e) => setRrrVdPercent(e.target.value)} />

        <label htmlFor="rrrVdQtd">RRR VD QTD:</label>
        <input type="number" id="rrrVdQtd" value={rrrVdQtd} onChange={(e) => setRrrVdQtd(e.target.value)} />

        <label htmlFor="rrrDaPercent">RRR DA %:</label>
        <input type="text" id="rrrDaPercent" value={rrrDaPercent} onChange={(e) => setRrrDaPercent(e.target.value)} />

        <label htmlFor="rrrDaQtd">RRR DA QTD:</label>
        <input type="number" id="rrrDaQtd" value={rrrDaQtd} onChange={(e) => setRrrDaQtd(e.target.value)} />

        {/* SSR */}
        <label htmlFor="ssrVd">SSR VD:</label>
        <input type="number" id="ssrVd" value={ssrVd} onChange={(e) => setSsrVd(e.target.value)} />

        <label htmlFor="ssrDa">SSR DA:</label>
        <input type="number" id="ssrDa" value={ssrDa} onChange={(e) => setSsrDa(e.target.value)} />

        {/* R-NPS */}
        <label htmlFor="rnpsVd">R-NPS VD:</label>
        <input type="text" id="rnpsVd" value={rnpsVd} onChange={(e) => setRnpsVd(e.target.value)} />

        <label htmlFor="rnpsDa">R-NPS DA:</label>
        <input type="text" id="rnpsDa" value={rnpsDa} onChange={(e) => setRnpsDa(e.target.value)} />

        <button type="submit">Subir KPIs para o Banco de Dados</button>
      </form>
    </div>
  );
}

export default KpisForm;