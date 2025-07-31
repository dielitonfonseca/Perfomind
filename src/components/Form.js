// src/components/Form.js
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import SignatureCanvas from 'react-signature-canvas';

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

  // Novos estados para o PDF
  const [modelo, setModelo] = useState('');
  const [serial, setSerial] = useState('');
  const [dataVisita, setDataVisita] = useState('');
  const [tipoAparelho, setTipoAparelho] = useState('VD');
  const [tipoChecklist, setTipoChecklist] = useState('PREENCHIDO');
  const [naoLiga, setNaoLiga] = useState(false);
  const [somOk, setSomOk] = useState(false);
  const [standby, setStandby] = useState(false);

  const sigCanvas = useRef(null);

  useEffect(() => {
    const tecnicoSalvo = localStorage.getItem('tecnico');
    if (tecnicoSalvo) {
      if (
        ['Dieliton', 'Matheus', 'Daniel', 'Wallysson', 'João Pedro', 'Claudio Cris', 'Fernando'].includes(tecnicoSalvo)
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

  const validarNumero = (num, tipo) => {
    const padraoSamsung = /^417\d{7}$/;
    const padraoAssurant = /^\d{8}$/;
    if (tipo === 'samsung') return padraoSamsung.test(num);
    if (tipo === 'assurant') return padraoSamsung.test(num); // Alterado para validar Assurant com o mesmo padrão Samsung
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

      // 1. Criar ou obter o documento do técnico na coleção principal 'ordensDeServico'
      const tecnicoDocRef = doc(db, 'ordensDeServico', tecnicoFinal);
      await setDoc(tecnicoDocRef, { nome: tecnicoFinal }, { merge: true });

      // 2. Adicionar a OS na subcoleção 'osPorData' -> '{data_documento}'
      const osPorDataCollectionRef = collection(tecnicoDocRef, 'osPorData');
      const dataDocRef = doc(osPorDataCollectionRef, dateString);
      await setDoc(dataDocRef, { data: dateString }, { merge: true });

      // 3. Adicionar a OS na subcoleção 'Samsung' ou 'Assurant' dentro da data, usando numeroOS como ID
      const targetCollectionName = isSamsung ? 'Samsung' : 'Assurant';
      const targetCollectionRef = collection(dataDocRef, targetCollectionName);
      const osDocRef = doc(targetCollectionRef, numeroOS); // Usando numeroOS como ID do documento

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

      console.log('Ordem de serviço cadastrada no Firebase com sucesso!');
    } catch (e) {
      console.error("Erro ao adicionar documento: ", e);
      alert('Erro ao cadastrar ordem de serviço no Firebase. Verifique o console para mais detalhes.');
    }

    // Limpa o formulário após o envio, exceto o técnico
    setNumero('');
    setCliente('');
    setDefeitoSelect('');
    setDefeitoManual('');
    setReparoSelect('');
    setReparoManual('');
    setPeca('');
    setObservacoes('');
    // Limpar os novos campos do PDF também
    setModelo('');
    setSerial('');
    setDataVisita('');
    setNaoLiga(false);
    setSomOk(false);
    setStandby(false);
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  const preencherPDF = async () => {
    let baseFileName = '';

    switch (tipoAparelho) {
      case 'VD':
        baseFileName = `/Checklist DTV_IH41_${tipoChecklist}.pdf`;
        break;
      case 'WSM':
        baseFileName = `/checklist_WSM_${tipoChecklist}.pdf`;
        break;
      case 'REF':
        baseFileName = `/checklist_REF_${tipoChecklist}.pdf`;
        break;
      case 'RAC':
        baseFileName = `/checklist_RAC_${tipoChecklist}.pdf`;
        break;
      default:
        alert('Tipo de aparelho inválido.');
        return;
    }

    try {
      const existingPdfBytes = await fetch(baseFileName).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const drawText = (text, x, y, size = 10) => {
        page.drawText(String(text), { // Ensure text is string
          x,
          y,
          size,
          font,
          color: rgb(0, 0, 0)
        });
      };

      let pngImage = null;
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        const assinaturaDataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
        pngImage = await pdfDoc.embedPng(assinaturaDataUrl);
      } else {
        console.log("Canvas de assinatura vazio. Assinatura não será adicionada ao PDF.");
      }

      // Reutilizando campos existentes do Perfomind
      const tecnicoFinal = (tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect).trim();

      if (tipoAparelho === 'VD') {
        drawText("FERNANDES E MESQUITA", 119, height - 72);
        drawText(cliente, 90, height - 85);
        drawText(modelo, 90, height - 100);
        drawText(serial, 420, height - 87);
        drawText(numero, 420, height - 72); // Usando o campo 'numero' do Perfomind
        drawText(dataVisita, 450, height - 100);
        drawText(tecnicoFinal, 120, height - 800); // Usando o campo 'tecnico' do Perfomind

        drawText(observacoes, 70, height - 750); // Usando o campo 'observacoes' do Perfomind

        if (pngImage) {
          page.drawImage(pngImage, {
            x: 390,
            y: height - 820,
            width: 150,
            height: 40
          });
        }

      } else if (tipoAparelho === 'WSM') {
        drawText("FERNANDES COMUNICAÇÕES", 100, height - 0);
        drawText(`${cliente}`, 77, height - 125);
        drawText(`${modelo}`, 77, height - 137);
        drawText(`${serial}`, 590, height - 125);
        drawText(`${numero}`, 590, height - 110); // Usando o campo 'numero' do Perfomind
        drawText(`${dataVisita}`, 605, height - 137);
        drawText(`${tecnicoFinal}`, 110, height - 534); // Usando o campo 'tecnico' do Perfomind
        drawText(`${observacoes}`, 65, height - 470); // Usando o campo 'observacoes' do Perfomind

        drawText(`Obs: ${observacoes}`, 50, height - 700); // Usando o campo 'observacoes' do Perfomind

        if (pngImage) {
          page.drawImage(pngImage, {
            x: 550,
            y: height - 550,
            width: 150,
            height: 40
          });
        }

      } else if (tipoAparelho === 'REF') {
        drawText("FERNANDES COMUNICAÇÕES", 100, height - 0);
        drawText(`${cliente}`, 87, height - 130);
        drawText(`${modelo}`, 87, height - 147);
        drawText(`${serial}`, 660, height - 132);
        drawText(`${numero}`, 660, height - 115); // Usando o campo 'numero' do Perfomind
        drawText(`${dataVisita}`, 665, height - 147);
        drawText(`${tecnicoFinal}`, 114, height - 538); // Usando o campo 'tecnico' do Perfomind
        drawText(`${observacoes}`, 65, height - 465); // Usando o campo 'observacoes' do Perfomind

        drawText(`Obs: ${observacoes}`, 50, height - 700); // Usando o campo 'observacoes' do Perfomind

        if (pngImage) {
          page.drawImage(pngImage, {
            x: 600,
            y: height - 550,
            width: 150,
            height: 40
          });
        }

      } else if (tipoAparelho === 'RAC') {
        drawText("FERNANDES COMUNICAÇÕES", 140, height - 0);
        drawText(`${cliente}`, 87, height - 116);
        drawText(`${modelo}`, 87, height - 127);
        drawText(`${serial}`, 532, height - 116);
        drawText(`${numero}`, 537, height - 105); // Usando o campo 'numero' do Perfomind
        drawText(`${dataVisita}`, 552, height - 128);
        drawText(`${tecnicoFinal}`, 114, height - 533); // Usando o campo 'tecnico' do Perfomind
        drawText(`${observacoes}`, 65, height - 470); // Usando o campo 'observacoes' do Perfomind

        drawText(`Obs: ${observacoes}`, 50, height - 710); // Usando o campo 'observacoes' do Perfomind

        if (pngImage) {
          page.drawImage(pngImage, {
            x: 540,
            y: height - 550,
            width: 150,
            height: 40
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const nomeArquivo = numero?.trim() || 'Checklist'; // Usando o campo 'numero' do Perfomind
      saveAs(blob, `${nomeArquivo}.pdf`);
      alert("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao carregar ou preencher o PDF:", error);
      alert("Erro ao gerar o PDF. Verifique se o arquivo base está disponível para o tipo de aparelho e checklist selecionados.");
    }
  };

  return (
    <>
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
          <option value="Dieliton">Dieliton 😎</option>
          <option value="Matheus">Matheus</option>
          <option value="Claudio Cris">Claudio Cris</option>
          <option value="Wallysson">Wallysson</option>
          <option value="Joao">João Pedro</option>
          <option value="Fernando">Fernando</option>
          <option value="Daniel">Daniel</option>
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

        {/* Campos SAMSUNG */}
        {isSamsung && (
          <>
            <label htmlFor="defeitoSelect">Código de Defeito:</label>
            <select
              id="defeitoSelect"
              value={defeitoSelect}
              onChange={(e) => setDefeitoSelect(e.target.value)}
            >
              <option value="">Selecione o defeito</option>
              <option value="AXP">AXP - Uso inadequado do consumidor (VD)</option>
              <option value="HXX">HXX - Uso inadequado do consumidor (DA)</option>
              <option value="AXX">AXX - Outro problema</option>
              <option value="CMK">CMK - Tela danificada pelo consumidor</option>
              <option value="AA1">AA1 - Não Liga</option>
              <option value="AA2">AA2 - Desliga sozinho</option>
              <option value="AA3">AA3 - Liga/Desliga aleatoriamente</option>
              <option value="AA4">AA4 - Desliga intermitente</option>
              <option value="AA5">AA5 - Fonte de alimentação instável</option>
              <option value="AB1">AB1 - Não indica funções no painel</option>
              <option value="AB8">AB8 - Lampada/LED não funciona</option>
              <option value="AM3">AM3 - Controle remoto não funciona</option>
              <option value="AN4">AN4 - Wi-Fi não funciona</option>
              <option value="AB2">AB2 - Display intermitente</option>
              <option value="AB3">AB3 - Sujeira no display</option>
              <option value="AE1">AE1 - Sem imagem</option>
              <option value="AE2">AE2 - Imagem intermitente</option>
              <option value="AE3">AE3 - Linhas horizontais</option>
              <option value="AE4">AE4 - Linhas verticais</option>
              <option value="AEN">AEN - Imagem distorcida</option>
              <option value="AG1">AG1 - Sem som</option>
              <option value="AG2">AG2 - Som intermitente</option>
              <option value="AG4">AG4 - Som distorcido</option>
              <option value="AM3">AM3 - Controle remoto não funciona</option>
              <option value="TLA">AG2 - WiFi não funciona</option>
              <option value="HE1">HE1 - Não Refrigera</option>
              <option value="HE3">HE3 - Refrigeração excessiva</option>
              <option value="HE7">HE7 - Dreno bloqueado</option>
              <option value="HE9">HE9 - Vazamento de fluido refrigerante</option>
              <option value="HF3">HF3 - Não sai água do dispenser</option>
              <option value="HF6">HF6 - Não produz gelo</option>
              <option value="HG2">HG2 - Não entra água</option>
              <option value="HG4">HG4 - Não centrifuga</option>
              <option value="HG5">HG4 - Não seca</option>
              <option value="HG6">HG6 - Transborda água</option>
              <option value="HG7">HG7 - Fornecimento de sabão/amaciante com defeito</option>
              <option value="HKF">HKF - Ruído mecânico</option>
              <option value="HK9">HK9 - Barulho excessivo</option>
              <option value="HK2">HK2 - Barulho no ventilador</option>
              <option value="HK3">HK3 - Barulho no compressor</option>
              <option value="HK4">HK4 - Barulho nos tubos</option>
              <option value="HLC">HLC - Compressor não funciona</option>
              <option value="HLN">HLN - Porta não abre</option>
              <option value="HA1">HA1 - Não Liga (DA)</option>
              <option value="HG1">HG1 - Não Lava</option>
              <option value="nao_achei">Não achei a opção certa</option>
            </select>

            <label htmlFor="reparoSelect">Código de Reparo:</label>
            <select
              id="reparoSelect"
              value={reparoSelect}
              onChange={(e) => setReparoSelect(e.target.value)}
            >
              <option value="">Selecione o reparo</option>
              <option value="X09">X09 - Orçamento recusado!</option>
              <option value="A04">A04 - Troca de PCB</option>
              <option value="A10">A10 - Troca do LCD</option>
              <option value="A01">A01 - Componente Elétrico</option>
              <option value="A02">A02 - Componente Mecânico</option>
              <option value="A03">A03 - Substituição de item cosmético</option>
              <option value="A17">A17 - Substituição do sensor</option>
              <option value="X01">X01 - NDF Nenhum defeito encontrado</option>
              <option value="A15">A15 - Troca de compressor</option>
              <option value="A17">A17 - Troca do sensor</option>
              <option value="A20">A20 - Troca de acessório (ex. controle)</option>
              <option value="nao_achei">Não achei a opção certa</option>
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

        {/* Campos ASSURANT */}
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

        {/* Novos Campos para o PDF */}
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
        <input name="serial" placeholder="Número de Série" onChange={(e) => setSerial(e.target.value)} value={serial} />

        <label htmlFor="dataVisita">Data da Visita:</label>
        <input name="dataVisita" type="date" onChange={(e) => setDataVisita(e.target.value)} value={dataVisita} />

        {/* Contêiner para centralizar a assinatura e o botão */}
        <div className="signature-section-container">
          <p className="signature-label">Assinatura do Cliente:</p>
          <SignatureCanvas
            penColor="black"
            canvasProps={{ 
              height: 100, // Altura pode ser mantida aqui ou no CSS
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

        <button type="submit">Gerar Resumo da OS!</button>
        <button type="button" onClick={preencherPDF} style={{ marginTop: '10px' }}>Gerar Checklist PDF!</button>
      </form>
    </>
  );
}

export default Form;