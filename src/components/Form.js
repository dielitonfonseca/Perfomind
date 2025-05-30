import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Importe doc e setDoc, remova addDoc

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

    // Limpa o formulário após o envio
    setNumero('');
    setCliente('');
    setTecnicoSelect(localStorage.getItem('tecnico') || '');
    setTecnicoManual('');
    setDefeitoSelect('');
    setDefeitoManual('');
    setReparoSelect('');
    setReparoManual('');
    setPeca('');
    setObservacoes('');
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

        <label
          htmlFor="tecnicoSelect"
        >Nome do técnico:</label>
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

        <button type="submit">Gerar Resultado!</button>
      </form>
    </>
  );
}

export default Form;