import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc, increment } from 'firebase/firestore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import SignatureCanvas from 'react-signature-canvas';
import { ScanLine } from 'lucide-react';
import ScannerDialog from './ScannerDialog';

function Form({ setFormData }) {
  const [numero, setNumero] = useState('');
  const [cliente, setCliente] = useState('');
  const [tecnicoSelect, setTecnicoSelect] = useState('');
  const [tecnicoManual, setTecnicoManual] = useState('');
  const [defeitoSelect, setDefeitoSelect] = useState('');
  const [defeitoManual, setDefeitoManual] = useState('');
  const [reparoSelect, setReparoSelect] = useState('');
  const [reparoManual, setReparoManual] = useState('');
  const [peca, setPeca] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSamsung, setIsSamsung] = useState(true);
  const [modelo, setModelo] = useState('');
  const [serial, setSerial] = useState('');
  const [dataVisita, setDataVisita] = useState('');
  const [tipoAparelho, setTipoAparelho] = useState('VD');
  const [tipoChecklist, setTipoChecklist] = useState('PREENCHIDO');
  const [isScannerOpen, setScannerOpen] = useState(false);

  const sigCanvas = useRef(null);
  const sigContainer = useRef(null);

  useEffect(() => {
    const tecnicoSalvo = localStorage.getItem('tecnico');
    if (tecnicoSalvo) {
      if (
        ['Dieliton Fonseca', 'Matheus Lindoso', 'Daniel Moraes', 'Yago Giordanni', 'Pablo Henrique', 'Wallysson Cesar', 'João Pedro', 'Claudio Cris', 'Matheus Henrique'].includes(tecnicoSalvo)
      ) {
        setTecnicoSelect(tecnicoSalvo);
        setTecnicoManual('');
      } else {
        setTecnicoSelect('nao_achei');
        setTecnicoManual(tecnicoSalvo);
      }
    }
  }, []);

  useEffect(() => {
    if (tecnicoSelect === 'nao_achei') {
      localStorage.setItem('tecnico', tecnicoManual);
    } else {
      localStorage.setItem('tecnico', tecnicoSelect);
    }
  }, [tecnicoSelect, tecnicoManual]);

  useEffect(() => {
    function resizeCanvas() {
      if (sigCanvas.current && sigContainer.current) {
        const canvas = sigCanvas.current.getCanvas();
        const containerWidth = sigContainer.current.offsetWidth;
        canvas.width = containerWidth;
        canvas.height = 100;
        sigCanvas.current.clear();
      }
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const validarNumero = (num, tipo) => {
    const padraoSamsung = /^417\d{7}$/;
    const padraoAssurant = /^\d{8}$/;
    if (tipo === 'samsung') return padraoSamsung.test(num);
    if (tipo === 'assurant') return padraoAssurant.test(num);
    return false;
  };

  const gerarTextoResultado = (data) => {
    const { numero, cliente, tecnico, defeito, reparo, peca, observacoes, tipo } = data;
    const linhaDefeito = tipo === 'samsung' ? `Código de defeito: ${defeito}` : `Defeito: ${defeito}`;
    const linhaReparo = tipo === 'samsung' ? `Código de reparo: ${reparo}` : `Solicitação de peça: ${reparo}`;
    return `
OS: ${numero}
Cliente: ${cliente}
Técnico: ${tecnico}
${linhaDefeito}
${linhaReparo}
${peca ? `Peça usada: ${peca}` : ''}
Observações: ${observacoes}
. . . . .`;
  };

  const limparFormulario = () => {
    setNumero('');
    setCliente('');
    setDefeitoSelect('');
    setDefeitoManual('');
    setReparoSelect('');
    setReparoManual('');
    setPeca('');
    setObservacoes('');
    setModelo('');
    setSerial('');
    setDataVisita('');
    setTipoAparelho('VD');
    setTipoChecklist('PREENCHIDO');
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const updateTechnicianStats = async (tecnicoNome, tipoOS) => {
    const statsDocRef = doc(db, 'technicianStats', tecnicoNome);
    const statsDoc = await getDoc(statsDocRef);

    if (statsDoc.exists()) {
      const updateData = {
        totalOS: increment(1),
        lastUpdate: serverTimestamp(),
      };
      if (tipoOS === 'samsung') {
        updateData.samsungOS = increment(1);
      } else if (tipoOS === 'assurant') {
        updateData.assurantOS = increment(1);
      }
      await updateDoc(statsDocRef, updateData);
    } else {
      const initialData = {
        totalOS: 1,
        samsungOS: tipoOS === 'samsung' ? 1 : 0,
        assurantOS: tipoOS === 'assurant' ? 1 : 0,
        lastUpdate: serverTimestamp(),
      };
      await setDoc(statsDocRef, initialData);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const tipoOS = isSamsung ? 'samsung' : 'assurant';
    const tecnicoFinal = (tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect).trim();
    const numeroOS = numero.trim();
    const clienteNome = cliente.trim();

    if (!validarNumero(numeroOS, tipoOS)) {
      alert(`Número inválido. Para OS ${tipoOS === 'samsung' ? 'Samsung (417XXXXXXX)' : 'Assurant (8 dígitos)'}.`);
      return;
    }

    if (!clienteNome || !tecnicoFinal) {
      alert("Preencha os campos obrigatórios: Cliente e Técnico.");
      return;
    }

    const defeitoFinal = isSamsung ? defeitoSelect : defeitoManual;
    const reparoFinal = isSamsung ? reparoSelect : reparoManual;
    const pecaFinal = isSamsung ? peca : '';

    const resultadoTexto = gerarTextoResultado({
      numero: numeroOS,
      cliente: clienteNome,
      tecnico: tecnicoFinal,
      defeito: defeitoFinal,
      reparo: reparoFinal,
      peca: pecaFinal,
      observacoes,
      tipo: tipoOS,
    });

    setFormData(resultadoTexto);

    try {
      const today = new Date();
      const dateString = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      const tecnicoDocRef = doc(db, 'ordensDeServico', tecnicoFinal);
      await setDoc(tecnicoDocRef, { nome: tecnicoFinal }, { merge: true });

      const osPorDataCollectionRef = collection(tecnicoDocRef, 'osPorData');
      const dataDocRef = doc(osPorDataCollectionRef, dateString);
      await setDoc(dataDocRef, { data: dateString }, { merge: true });

      const targetCollectionName = isSamsung ? 'Samsung' : 'Assurant';
      const targetCollectionRef = collection(dataDocRef, targetCollectionName);
      const osDocRef = doc(targetCollectionRef, numeroOS);

      await setDoc(osDocRef, {
        numeroOS: numeroOS,
        cliente: clienteNome,
        tecnico: tecnicoFinal,
        tipoOS: tipoOS,
        defeito: defeitoFinal,
        reparo: reparoFinal,
        pecaSubstituida: pecaFinal,
        observacoes: observacoes,
        dataGeracao: serverTimestamp(),
        dataGeracaoLocal: new Date().toISOString()
      });

      await updateTechnicianStats(tecnicoFinal, tipoOS);

      console.log('Ordem de serviço cadastrada no Firebase com sucesso!');
    } catch (e) {
      console.error("Erro ao adicionar documento: ", e);
      alert('Erro ao cadastrar ordem de serviço no Firebase. Verifique o console para mais detalhes.');
    }
  };

  const preencherPDF = async () => {
    // ...
  };
  
  const handleScanSuccess = useCallback((decodedText) => {
    setSerial(decodedText);
    setScannerOpen(false);
    alert(`Código escaneado: ${decodedText}`);
  }, []);

  return (
    <>
      {isScannerOpen && (
        <ScannerDialog
          onScanSuccess={handleScanSuccess}
          onClose={() => setScannerOpen(false)}
        />
      )}
      <div className="checkbox-container">
        <label>
          <input
            type="checkbox"
            id="samsungCheckbox"
            checked={isSamsung}
            onChange={() => setIsSamsung(true)}
          />{' '}
          Reparo Samsung
        </label>
        <label>
          <input
            type="checkbox"
            id="assurantCheckbox"
            checked={!isSamsung}
            onChange={() => setIsSamsung(false)}
          />{' '}
          Visita Assurant
        </label>
      </div>

      <form id="osForm" onSubmit={handleSubmit}>
        <label htmlFor="numero">Número de Ordem de Serviço:</label>
        <input
          type="text"
          id="numero"
          placeholder={isSamsung ? 'Ex: 4171234567' : 'Ex: 45111729'}
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          required
        />

        <label htmlFor="cliente">Nome do cliente:</label>
        <input
          type="text"
          id="cliente"
          placeholder="Ex: Fulano de tal"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
          required
        />

        <label htmlFor="tecnicoSelect">Nome do técnico:</label>
        <select
          id="tecnicoSelect"
          value={tecnicoSelect}
          onChange={(e) => setTecnicoSelect(e.target.value)}
        >
          <option value="">Selecione um técnico</option>
          <option value="Dieliton Fonseca">Dieliton 😎</option>
          <option value="Matheus Lindoso">Matheus Lindoso</option>
          <option value="Claudio Cris">Claudio Cris</option>
          <option value="Wallysson Cesar ">Wallysson Cesar</option>
          <option value="João Pedro">João Pedro</option>
          <option value="Pablo Henrique">Pablo Henrique</option>
          <option value="Matheus Henrique">Matheus Henrique</option>
          <option value="Daniel Moraes">Daniel</option>
          <option value="Yago Giordanni">Yago Giordanni</option>
          <option value="nao_achei">Não achei a opção certa</option>
        </select>

        <label
          htmlFor="tecnicoManual"
          className={tecnicoSelect === 'nao_achei' ? '' : 'hidden'}
        >
          Ou digite o nome do técnico:
        </label>
        <input
          type="text"
          id="tecnicoManual"
          placeholder="Ex: Fulano de Tal"
          className={tecnicoSelect === 'nao_achei' ? '' : 'hidden'}
          value={tecnicoManual}
          onChange={(e) => setTecnicoManual(e.target.value)}
        />

        {isSamsung && (
          <>
            <label htmlFor="defeitoSelect">Código de Defeito:</label>
            <select
              id="defeitoSelect"
              value={defeitoSelect}
              onChange={(e) => setDefeitoSelect(e.target.value)}
            >
              <option value="">Selecione o defeito</option>
              {/* ... (opções de defeito) ... */}
            </select>

            <label htmlFor="reparoSelect">Código de Reparo:</label>
            <select
              id="reparoSelect"
              value={reparoSelect}
              onChange={(e) => setReparoSelect(e.target.value)}
            >
              <option value="">Selecione o reparo</option>
             {/* ... (opções de reparo) ... */}
            </select>

            <label htmlFor="peca">Peça substituída:</label>
            <input
              type="text"
              id="peca"
              placeholder="Ex: Placa principal"
              value={peca}
              onChange={(e) => setPeca(e.target.value)}
            />
          </>
        )}

        {!isSamsung && (
          <>
            <label htmlFor="defeitoManual">Qual o defeito do aparelho?</label>
            <input
              type="text"
              id="defeitoManual"
              placeholder="Descreva o defeito"
              value={defeitoManual}
              onChange={(e) => setDefeitoManual(e.target.value)}
            />

            <label htmlFor="reparoManual">Quais as peças necessárias?</label>
            <input
              type="text"
              id="reparoManual"
              placeholder="Liste as peças"
              value={reparoManual}
              onChange={(e) => setReparoManual(e.target.value)}
            />
          </>
        )}

        <label htmlFor="observacoes">Observações:</label>
        <textarea
          id="observacoes"
          rows="4"
          placeholder="Ex: Pagamento pendente, Cliente aguarda nota fiscal, etc"
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        ></textarea>

        {isSamsung && (
          <>
            <h2>Dados para o Checklist</h2>
            <label htmlFor="tipoAparelho">Tipo de Aparelho:</label>
            <select name="tipoAparelho" onChange={(e) => setTipoAparelho(e.target.value)} value={tipoAparelho}>
              <option value="VD">VD</option>
              <option value="WSM">WSM</option>
              <option value="REF">REF</option>
              <option value="RAC">RAC</option>
            </select>

            <label htmlFor="tipoChecklist">Tipo de Checklist:</label>
            <select name="tipoChecklist" onChange={(e) => setTipoChecklist(e.target.value)} value={tipoChecklist}>
              <option value="PREENCHIDO">Reparo Normal</option>
              <option value="EXCLUSAO">Exclusão de Garantia</option>
              <option value="NDF">Sem Defeito (NDF)</option>
            </select>

            <label htmlFor="modelo">Modelo:</label>
            <input name="modelo" placeholder="Modelo do Aparelho" onChange={(e) => setModelo(e.target.value)} value={modelo} />

            <label htmlFor="serial">Serial:</label>
            <div className="input-with-button">
              <input
                name="serial"
                placeholder="Número de Série"
                onChange={(e) => setSerial(e.target.value)}
                value={serial}
              />
              <button type="button" className="scan-button" onClick={() => setScannerOpen(true)}>
                <ScanLine size={20} />
              </button>
            </div>

            <label htmlFor="dataVisita">Data da Visita:</label>
            <input name="dataVisita" type="date" onChange={(e) => setDataVisita(e.target.value)} value={dataVisita} />

            <div className="signature-section-container" ref={sigContainer}>
              <p className="signature-label">Assinatura do Cliente:</p>
              <SignatureCanvas
                penColor="black"
                canvasProps={{
                  height: 100,
                  className: 'sigCanvas',
                  style: {
                    backgroundColor: 'white',
                    border: '1px solid #444',
                    borderRadius: '4px'
                  }
                }}
                ref={sigCanvas}
              />
              <button type="button" onClick={() => sigCanvas.current.clear()} className="clear-signature-button">
                Limpar Assinatura
              </button>
            </div>
            <button type="button" onClick={preencherPDF} style={{ marginTop: '10px' }}>Gerar Checklist PDF!</button>
          </>
        )}

        <button type="submit">Gerar Resumo da OS!</button>
        <button type="button" onClick={limparFormulario} style={{ marginTop: '10px' }}>Limpar Formulário</button>
      </form>
    </>
  );
}

export default Form;