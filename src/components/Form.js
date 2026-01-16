import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, doc, setDoc, serverTimestamp, updateDoc, increment, arrayUnion, addDoc, getDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { ScanLine, MapPin, CheckCircle, Save, Trash2, PenTool, FileText, User, Wrench, Sparkles, DollarSign, FileDown, AlertTriangle, AlertCircle } from 'lucide-react';
import ScannerDialog from './ScannerDialog';
import SignatureDialog from './SignatureDialog';
import formOptions from '../data/formOptions.json';
import '../App.css';

function Form({ setFormData }) {
    // --- HOOKS ---
    const locationRouter = useLocation();
    const routeData = locationRouter.state?.routeData;

    // --- ESTADOS ---
    const [numero, setNumero] = useState('');
    const [cliente, setCliente] = useState('');
    
    // Técnico
    const [tecnicoSelect, setTecnicoSelect] = useState('');
    const [tecnicoManual, setTecnicoManual] = useState('');
    
    // Diagnóstico
    const [defeitoSelect, setDefeitoSelect] = useState('');
    const [defeitoManual, setDefeitoManual] = useState('');
    const [reparoSelect, setReparoSelect] = useState('');
    const [reparoManual, setReparoManual] = useState('');
    
    // Peças
    const [peca, setPeca] = useState(''); 
    const [pecasDaRota, setPecasDaRota] = useState([]); 
    const [pecasSelecionadas, setPecasSelecionadas] = useState([]); 
    const [ppidPecaUsada, setPpidPecaUsada] = useState('');
    const [ppidPecaNova, setPpidPecaNova] = useState('');

    // Dados Gerais
    const [observacoes, setObservacoes] = useState('');
    const [isSamsung, setIsSamsung] = useState(true);
    const [modelo, setModelo] = useState('');
    const [serial, setSerial] = useState('');
    const [dataVisita, setDataVisita] = useState(new Date().toISOString().split("T")[0]); 
    
    // Checklist
    const [tipoAparelho, setTipoAparelho] = useState('VD');
    const [tipoChecklist, setTipoChecklist] = useState('PREENCHIDO'); 
    
    // UI
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [scannerTarget, setScannerTarget] = useState('');
    const [isSignatureDialogOpen, setSignatureDialogOpen] = useState(false);
    const [signature, setSignature] = useState(null);

    // Faturamento
    const [orcamentoAprovado, setOrcamentoAprovado] = useState(false);
    const [orcamentoValor, setOrcamentoValor] = useState('');
    const [limpezaAprovada, setLimpezaAprovada] = useState(false);

    // Localização
    const [userLocation, setUserLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('idle'); 
    const [locationMsg, setLocationMsg] = useState('Obter Localização'); 

    // --- 1. PREENCHIMENTO AUTOMÁTICO (ROTA) ---
    useEffect(() => {
        if (routeData) {
            if(routeData.cliente) setCliente(routeData.cliente);
            if(routeData.os) setNumero(routeData.osOriginal || routeData.os);
            if(routeData.modelo) setModelo(routeData.modelo);
            if (routeData.tecnico && formOptions.technicians.includes(routeData.tecnico)) {
                setTecnicoSelect(routeData.tecnico);
            }
            if (routeData.pecas && routeData.pecas.length > 0) {
                setPecasDaRota(routeData.pecas);
            }
        }
    }, [routeData]);

    // --- 2. LOCALIZAÇÃO ---
    const getCityFromCoords = async (lat, lng) => {
        if (!lat || !lng) return 'Local não ident.';
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
            const data = await response.json();
            return data.address ? (data.address.city || data.address.town || 'Desconhecido') : 'N/A';
        } catch (error) { return 'Erro API'; }
    };

    const requestLocation = () => {
        if (!("geolocation" in navigator)) { setLocationStatus('error'); setLocationMsg('Não suportado'); return; }
        setLocationStatus('loading'); setLocationMsg('Buscando...');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const city = await getCityFromCoords(position.coords.latitude, position.coords.longitude);
                const newLocation = { 
                    latitude: position.coords.latitude, 
                    longitude: position.coords.longitude, 
                    accuracy: position.coords.accuracy, 
                    city, 
                    timestamp: new Date().toISOString() 
                };
                setUserLocation(newLocation); 
                setLocationStatus('success'); 
                setLocationMsg("Localização OK");
            },
            (error) => { console.error("Erro GPS:", error); setLocationStatus('error'); setLocationMsg('Erro GPS'); },
            { enableHighAccuracy: true, timeout: 30000, maximumAge: 600000 }
        );
    };

    useEffect(() => { requestLocation(); }, []);

    // --- 3. PERSISTÊNCIA TÉCNICO ---
    useEffect(() => {
        const tecnicoSalvo = localStorage.getItem('tecnico');
        if (tecnicoSalvo) {
            if (formOptions.technicians.includes(tecnicoSalvo)) setTecnicoSelect(tecnicoSalvo);
            else { setTecnicoSelect('nao_achei'); setTecnicoManual(tecnicoSalvo); }
        }
    }, []);

    useEffect(() => {
        const nomeFinal = tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect;
        if(nomeFinal) { localStorage.setItem('tecnico', nomeFinal); localStorage.setItem('savedTechName', nomeFinal); }
    }, [tecnicoSelect, tecnicoManual]);

    // --- 4. FUNÇÕES DE UTILIDADE ---
    const handlePecaCheckbox = (p) => {
        if (pecasSelecionadas.includes(p)) setPecasSelecionadas(prev => prev.filter(item => item !== p));
        else setPecasSelecionadas(prev => [...prev, p]);
    };

    const getISOWeek = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    const limparFormulario = () => {
        setNumero(''); setCliente(''); setDefeitoSelect(''); setDefeitoManual(''); setReparoSelect(''); setReparoManual('');
        setPeca(''); setPecasSelecionadas([]); setPecasDaRota([]); setObservacoes(''); setModelo(''); setSerial('');
        setTipoAparelho('VD'); setSignature(null); setPpidPecaNova(''); setPpidPecaUsada(''); 
        setOrcamentoAprovado(false); setOrcamentoValor(''); setLimpezaAprovada(false); setTipoChecklist('PREENCHIDO');
    };

    const sanitizeForPdf = (text) => {
        if (!text) return '';
        return String(text).replace(/[^\x00-\xFF]/g, '').trim();
    };

    // --- 5. GERAÇÃO DE PDF ---
    const preencherPDF = async () => {
        let baseFileName = '';
        switch (tipoAparelho) {
            case 'VD': baseFileName = `/Checklist DTV_IH41_${tipoChecklist}.pdf`; break;
            case 'WSM': baseFileName = `/checklist_WSM_${tipoChecklist}.pdf`; break;
            case 'REF': baseFileName = `/checklist_REF_${tipoChecklist}.pdf`; break;
            case 'RAC': baseFileName = `/checklist_RAC_${tipoChecklist}.pdf`; break;
            default: alert('Selecione um tipo de aparelho.'); return;
        }

        try {
            const existingPdfBytes = await fetch(baseFileName).then(res => {
                if (!res.ok) throw new Error(`Modelo ${baseFileName} não encontrado na pasta public.`);
                return res.arrayBuffer();
            });

            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const page = pdfDoc.getPages()[0];
            const { height } = page.getSize();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            const drawText = (text, x, y, size = 10) => {
                page.drawText(sanitizeForPdf(text), { x, y, size, font, color: rgb(0, 0, 0) });
            };

            const tecnicoFinal = (tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect).trim();
            
            let defeitoFinalText = defeitoManual;
            let reparoFinalText = reparoManual;
            if(isSamsung) {
                const defeitoElement = document.getElementById('defeitoSelect');
                if (defeitoElement && defeitoElement.selectedIndex > 0) defeitoFinalText = defeitoElement.options[defeitoElement.selectedIndex].text;
                const reparoElement = document.getElementById('reparoSelect');
                if(reparoElement && reparoElement.selectedIndex > 0) reparoFinalText = reparoElement.options[reparoElement.selectedIndex].text;
            }

            const textoObservacoes = `Observações: ${observacoes}`;
            const textoDefeito = isSamsung ? `Código de Defeito: ${defeitoFinalText}` : `Defeito: ${defeitoFinalText}`;
            const textoReparo = isSamsung ? `Código de Reparo: ${reparoFinalText}` : `Peça necessária: ${reparoFinalText}`;

            let dataFormatada = '';
            if (dataVisita) {
                const [ano, mes, dia] = dataVisita.split('-');
                dataFormatada = `${dia}/${mes}/${ano}`;
            }

            const offset = 10;

            let pngImage = null;
            if (signature) {
                pngImage = await pdfDoc.embedPng(signature);
            }

            if (tipoAparelho === 'VD') {
                drawText("FERNANDES COMUNICAÇÕES", 119, height - 72);
                drawText(cliente, 90, height - 85);
                drawText(modelo, 90, height - 100);
                drawText(serial, 420, height - 87);
                drawText(numero, 420, height - 72);
                drawText(dataFormatada, 450, height - 100);
                drawText(tecnicoFinal, 120, height - 800);
                drawText(textoDefeito, 70, height - 750);
                drawText(textoReparo, 70, height - 750 - offset);
                drawText(textoObservacoes, 70, height - 750 - (offset * 2));

                if (pngImage) page.drawImage(pngImage, { x: 390, y: height - 820, width: 165, height: 55 });
            
            } else if (tipoAparelho === 'WSM') {
                drawText("FERNANDES COMUNICAÇÕES", 100, height - 0); 
                drawText(cliente, 77, height - 125);
                drawText(modelo, 77, height - 137);
                drawText(serial, 590, height - 125);
                drawText(numero, 590, height - 110);
                drawText(dataFormatada, 605, height - 137);
                drawText(tecnicoFinal, 110, height - 534);
                drawText(textoDefeito, 65, height - 470);
                drawText(textoReparo, 65, height - 470 - offset);
                drawText(textoObservacoes, 65, height - 470 - (offset * 2));

                if (pngImage) page.drawImage(pngImage, { x: 550, y: height - 550, width: 150, height: 40 });
            
            } else if (tipoAparelho === 'REF') {
                drawText("FERNANDES COMUNICAÇÕES", 100, height - 0);
                drawText(cliente, 87, height - 130);
                drawText(modelo, 87, height - 147);
                drawText(serial, 660, height - 132);
                drawText(numero, 660, height - 115);
                drawText(dataFormatada, 665, height - 147);
                drawText(tecnicoFinal, 114, height - 538);
                drawText(textoDefeito, 65, height - 465);
                drawText(textoReparo, 65, height - 465 - offset);
                drawText(textoObservacoes, 65, height - 465 - (offset * 2));

                if (pngImage) page.drawImage(pngImage, { x: 600, y: height - 550, width: 150, height: 40 });
            
            } else if (tipoAparelho === 'RAC') {
                drawText("FERNANDES COMUNICAÇÕES", 140, height - 0);
                drawText(cliente, 87, height - 116);
                drawText(modelo, 87, height - 127);
                drawText(serial, 532, height - 116);
                drawText(numero, 537, height - 105);
                drawText(dataFormatada, 552, height - 128);
                drawText(tecnicoFinal, 114, height - 533);
                drawText(textoDefeito, 65, height - 470);
                drawText(textoReparo, 65, height - 470 - offset);
                drawText(textoObservacoes, 65, height - 470 - (offset * 2));

                if (pngImage) page.drawImage(pngImage, { x: 540, y: height - 550, width: 150, height: 40 });
            }

            const pdfBytes = await pdfDoc.save();
            saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), `Checklist_${numero}_${tipoChecklist}.pdf`);
            alert("PDF gerado com sucesso! 📄");

        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert(`Erro ao gerar PDF: ${error.message}`);
        }
    };

    const gerarTextoResultado = (data) => {
        const { numero, cliente, tecnico, defeito, reparo, peca, ppidPecaNova, ppidPecaUsada, observacoes, tipo, orcamentoAprovado, orcamentoValor, limpezaAprovada } = data;
        const linhaDefeito = tipo === 'samsung' ? `Código de defeito: ${defeito}` : `Defeito: ${defeito}`;
        const linhaReparo = tipo === 'samsung' ? `Código de reparo: ${reparo}` : `Solicitação de peça: ${reparo}`;
        const linhaPecaUsada = peca ? `Peça usada: ${peca}` : '';
        const detalhes = [linhaPecaUsada, ppidPecaNova ? `PPID NOVA: ${ppidPecaNova}` : '', ppidPecaUsada ? `PPID USADA: ${ppidPecaUsada}` : ''].filter(Boolean).join('\n');
        let obsText = '';
        if (orcamentoAprovado && orcamentoValor) obsText += `Orçamento aprovado: R$ ${orcamentoValor}\n`;
        if (limpezaAprovada) obsText += 'Limpeza realizada\n';
        obsText += observacoes;
        return `OS: ${numero}\nCliente: ${cliente}\nTécnico: ${tecnico}\n${linhaDefeito}\n${linhaReparo}\n${detalhes}\nObservações:\n${obsText}\n. . . . .`;
    };

    // --- 6. SUBMIT ---
    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!userLocation) { alert("ATENÇÃO: A localização não foi capturada."); return; }
        const tipoOS = isSamsung ? 'samsung' : 'assurant';
        const tecnicoFinal = (tecnicoSelect === 'nao_achei' ? tecnicoManual : tecnicoSelect).trim();
        const numeroOS = numero.trim();
        const clienteNome = cliente.trim();

        if (!clienteNome || !tecnicoFinal) { alert("Preencha Cliente e Técnico."); return; }

        let defeitoFinal, reparoFinal;
        if (isSamsung) {
            const dSelect = document.getElementById('defeitoSelect');
            defeitoFinal = dSelect ? dSelect.options[dSelect.selectedIndex].text : '';
            const rSelect = document.getElementById('reparoSelect');
            reparoFinal = rSelect ? rSelect.options[rSelect.selectedIndex].text : '';
        } else {
            defeitoFinal = defeitoManual;
            reparoFinal = reparoManual;
        }

        const pecaFinal = isSamsung ? peca : '';

        const resultadoTexto = gerarTextoResultado({
            numero: numeroOS, cliente: clienteNome, tecnico: tecnicoFinal,
            defeito: defeitoFinal, reparo: reparoFinal, peca: pecaFinal,
            ppidPecaNova, ppidPecaUsada, observacoes, tipo: tipoOS,
            orcamentoAprovado, orcamentoValor, limpezaAprovada
        });

        try {
            const today = new Date();
            const weekNumber = getISOWeek(today);
            const dateString = today.toISOString().split('T')[0];
            const dataHoraFormatada = today.toLocaleString('pt-BR');
            const valorNumerico = (orcamentoAprovado && orcamentoValor) ? parseFloat(orcamentoValor) : 0;
            const targetCollectionName = isSamsung ? 'Samsung' : 'Assurant';

            const payloadDoc = {
                numeroOS, cliente: clienteNome, tecnico: tecnicoFinal, tipoOS,
                defeito: defeitoFinal, reparo: reparoFinal, pecaSubstituida: pecaFinal,
                ppidPecaNova, ppidPecaUsada, observacoes,
                semana: weekNumber, ano: today.getFullYear(), valorOrcamento: valorNumerico, isLimpeza: limpezaAprovada,
                dataHoraCriacao: dataHoraFormatada, localizacao: userLocation, dataGeracaoLocal: new Date().toISOString()
            };

            const tecnicoDocRef = doc(db, 'ordensDeServico', tecnicoFinal);
            await setDoc(tecnicoDocRef, { nome: tecnicoFinal }, { merge: true });
            const dataDocRef = doc(collection(tecnicoDocRef, 'osPorData'), dateString);
            await setDoc(dataDocRef, { data: dateString }, { merge: true });
            await setDoc(doc(collection(dataDocRef, targetCollectionName), numeroOS), { ...payloadDoc, dataGeracao: serverTimestamp() });

            const statsDocRef = doc(db, 'technicianStats', tecnicoFinal);
            const statsUpdate = {
                totalOS: increment(1), lastUpdate: serverTimestamp(),
                samsungOS: increment(tipoOS === 'samsung' ? 1 : 0),
                assurantOS: increment(tipoOS === 'assurant' ? 1 : 0),
            };
            if(valorNumerico > 0) {
                statsUpdate.orc_aprovado = increment(valorNumerico);
                statsUpdate.lista_orcamentos_aprovados = arrayUnion(numeroOS);
            }
            if(limpezaAprovada) {
                statsUpdate.limpezas_realizadas = increment(1);
                statsUpdate.lista_limpezas = arrayUnion(numeroOS);
            }
            await updateDoc(statsDocRef, statsUpdate).catch(async () => {
                await setDoc(statsDocRef, { totalOS: 1, lastUpdate: serverTimestamp() });
            });

            const rastroData = { ...userLocation, timestamp: serverTimestamp(), dataLocal: new Date().toISOString(), origem: 'geracao_os', osVinculada: numeroOS };
            await addDoc(collection(db, 'rastreamento', tecnicoFinal, 'historico'), rastroData);
            await setDoc(doc(db, 'rastreamento', tecnicoFinal), { lastLocation: rastroData, updatedAt: serverTimestamp(), nome: tecnicoFinal }, { merge: true });

            if (routeData && routeData.docId) {
                const rotaRef = doc(db, 'rotas', routeData.docId);
                const rotaSnap = await getDoc(rotaRef);
                if (rotaSnap.exists()) {
                    const dataRota = rotaSnap.data();
                    const novosItens = [...dataRota.itens];
                    if (novosItens[routeData.idx]) {
                        novosItens[routeData.idx].status = 'concluido';
                        novosItens[routeData.idx].osGeradaEm = new Date().toISOString();
                        await updateDoc(rotaRef, { itens: novosItens });
                    }
                }
            }

            setFormData(resultadoTexto);
            alert(`OS ${numeroOS} registrada com sucesso! ✅`);

        } catch (e) {
            console.error("Erro no submit:", e);
            alert('Erro ao salvar os dados.');
        }
    };

    const handleScanSuccess = useCallback((decodedText) => {
        if (scannerTarget === 'serial') setSerial(decodedText);
        else if (scannerTarget === 'ppidNova') setPpidPecaNova(decodedText);
        else if (scannerTarget === 'ppidUsada') setPpidPecaUsada(decodedText);
        setScannerOpen(false);
    }, [scannerTarget]);

    const openScanner = (target) => { setScannerTarget(target); setScannerOpen(true); };
    const handleSaveSignature = (s) => { setSignature(s); setSignatureDialogOpen(false); };

    return (
        <div className="page-container" style={{padding: '10px', maxWidth: '100%'}}>
            {isScannerOpen && <ScannerDialog onScanSuccess={handleScanSuccess} onClose={() => setScannerOpen(false)} />}
            {isSignatureDialogOpen && <SignatureDialog onSave={handleSaveSignature} onClose={() => setSignatureDialogOpen(false)} />}
            
            <form id="osForm" onSubmit={handleSubmit}>
                
                {/* 1. SELEÇÃO DE MARCA */}
                <div className="toggle-container" style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                    <div className={`toggle-option ${isSamsung ? 'active' : ''}`} onClick={() => setIsSamsung(true)} style={{flex:1, textAlign:'center', padding:'12px', background: isSamsung ? '#00C49F' : '#333', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', transition:'0.2s', color:'#fff'}}>Samsung</div>
                    <div className={`toggle-option ${!isSamsung ? 'active-assurant' : ''}`} onClick={() => setIsSamsung(false)} style={{flex:1, textAlign:'center', padding:'12px', background: !isSamsung ? '#2196F3' : '#333', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', transition:'0.2s', color:'#fff'}}>Assurant</div>
                </div>

                {/* 2. DADOS PRINCIPAIS */}
                <div className="cool-card">
                    <div className="cool-card-header"><FileText size={20} color="#00C49F"/> <span style={{marginLeft:'5px'}}>Dados Principais</span></div>
                    <label className="label-modern">Número da OS:</label>
                    <input type="tel" className="app-input" placeholder={isSamsung ? 'Ex: 4174909090' : 'Ex: 45009090'} value={numero} onChange={(e) => setNumero(e.target.value)} required />
                    <label className="label-modern mt-3">Nome do Cliente:</label>
                    <input type="text" className="app-input" placeholder="Ex: Fulano de tal" value={cliente} onChange={(e) => setCliente(e.target.value)} required />
                </div>

                {/* 3. TÉCNICO E LOCAL */}
                <div className="cool-card">
                    <div className="cool-card-header"><User size={20} color="#FF9800"/> <span style={{marginLeft:'5px'}}>Técnico & Local</span></div>
                    <label className="label-modern">Técnico:</label>
                    <select className="app-select" value={tecnicoSelect} onChange={(e) => setTecnicoSelect(e.target.value)}>
                        <option value="">Selecione...</option>
                        {formOptions.technicians.map((t, i) => <option key={i} value={t}>{t}</option>)}
                        <option value="nao_achei">Outro...</option>
                    </select>
                    {tecnicoSelect === 'nao_achei' && <input className="app-input mt-2" placeholder="Digite o nome" value={tecnicoManual} onChange={(e) => setTecnicoManual(e.target.value)} />}
                    
                    <label className="label-modern mt-3">Localização:</label>
                    <button type="button" onClick={requestLocation} className={`btn-pill full-width ${locationStatus === 'success' ? 'btn-finish' : 'btn-go'}`} style={{justifyContent:'center'}} disabled={locationStatus === 'loading'}>
                        {locationStatus === 'loading' ? 'Buscando...' : (locationStatus === 'success' ? <><CheckCircle size={16}/> Localização OK</> : <><MapPin size={16}/> {locationMsg}</>)}
                    </button>
                </div>

                {/* 4. DIAGNÓSTICO E PEÇAS */}
                <div className="cool-card">
                    <div className="cool-card-header"><Wrench size={20} color="#d32f2f"/> <span style={{marginLeft:'5px'}}>Diagnóstico</span></div>
                    
                    {isSamsung ? (
                        <>
                            <label className="label-modern">Defeito:</label>
                            <select id="defeitoSelect" className="app-select" value={defeitoSelect} onChange={(e) => setDefeitoSelect(e.target.value)}>
                                <option value="">Selecione...</option>
                                {formOptions.samsungDefects.map((d, i) => <option key={i} value={d.code}>{d.label}</option>)}
                            </select>

                            <label className="label-modern mt-3">Reparo:</label>
                            <select id="reparoSelect" className="app-select" value={reparoSelect} onChange={(e) => setReparoSelect(e.target.value)}>
                                <option value="">Selecione...</option>
                                {formOptions.samsungRepairs.map((r, i) => <option key={i} value={r.code}>{r.label}</option>)}
                            </select>

                            <label className="label-modern mt-3">Peça Substituída:</label>
                            <input className="app-input" placeholder="Ex: Placa main" value={peca} onChange={(e) => setPeca(e.target.value)} />

                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'15px'}}>
                                <div>
                                    <label className="label-modern" style={{fontSize:'0.8em'}}>PPID Nova:</label>
                                    <div className="input-group" style={{display:'flex', gap:'5px'}}>
                                        <input className="app-input" style={{padding:'5px'}} value={ppidPecaNova} onChange={(e)=>setPpidPecaNova(e.target.value)} />
                                        <button type="button" className="btn-icon" onClick={() => openScanner('ppidNova')} style={{background:'#333', border:'1px solid #555', color:'#fff'}}><ScanLine size={18}/></button>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-modern" style={{fontSize:'0.8em'}}>PPID Usada:</label>
                                    <div className="input-group" style={{display:'flex', gap:'5px'}}>
                                        <input className="app-input" style={{padding:'5px'}} value={ppidPecaUsada} onChange={(e)=>setPpidPecaUsada(e.target.value)} />
                                        <button type="button" className="btn-icon" onClick={() => openScanner('ppidUsada')} style={{background:'#333', border:'1px solid #555', color:'#fff'}}><ScanLine size={18}/></button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <label className="label-modern">Defeito:</label>
                            <input className="app-input" placeholder="Ex: Não liga" value={defeitoManual} onChange={(e)=>setDefeitoManual(e.target.value)} />
                            
                            <label className="label-modern mt-3">Peças Necessárias:</label>
                            <input className="app-input" placeholder="Ex: Placa main" value={reparoManual} onChange={(e)=>setReparoManual(e.target.value)} />
                        </>
                    )}
                </div>

                {/* 5. FATURAMENTO E CHECKLIST */}
                {isSamsung && (
                    <div className="cool-card">
                        <div className="cool-card-header">
                            <DollarSign size={20} color="#FFD700"/> 
                            <span style={{marginLeft:'5px'}}>Faturamento & Checklist</span>
                        </div>
                        
                        <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                            <div className={`toggle-btn ${orcamentoAprovado ? 'active-green' : ''}`} onClick={() => setOrcamentoAprovado(!orcamentoAprovado)}>
                                <DollarSign size={18} /> Orçamento
                            </div>
                            <div className={`toggle-btn ${limpezaAprovada ? 'active-blue' : ''}`} onClick={() => setLimpezaAprovada(!limpezaAprovada)}>
                                <Sparkles size={18} /> Higienização
                            </div>
                        </div>
                        
                        {orcamentoAprovado && (
                            <div className="input-group-animation">
                                <label className="label-modern">Valor (R$):</label>
                                <input type="number" className="app-input" value={orcamentoValor} onChange={(e) => setOrcamentoValor(e.target.value)} placeholder="Ex: 450.00" />
                            </div>
                        )}

                        <div style={{marginTop:'15px', borderTop:'1px solid #444', paddingTop:'15px'}}>
                             <label className="label-modern">Tipo Aparelho:</label>
                             <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px', marginBottom:'15px'}}>
                                 {['VD', 'WSM', 'REF', 'RAC'].map(t => (
                                     <div key={t} onClick={()=>setTipoAparelho(t)} className={`toggle-small ${tipoAparelho === t ? 'active-teal' : ''}`}>{t}</div>
                                 ))}
                             </div>

                             <label className="label-modern">Status do Atendimento:</label>
                             <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px', marginBottom:'15px'}}>
                                 {[
                                     { id: 'PREENCHIDO', label: 'Concluído' },
                                     { id: 'EXCLUSAO', label: 'Exclusão' },
                                     { id: 'NDF', label: 'Sem Defeito' }
                                 ].map(type => (
                                     <div 
                                        key={type.id} 
                                        onClick={()=>setTipoChecklist(type.id)} 
                                        className={`toggle-small ${tipoChecklist === type.id ? (type.id === 'EXCLUSAO' ? 'active-red' : 'active-teal') : ''}`}
                                        style={tipoChecklist === type.id && type.id === 'EXCLUSAO' ? {background:'#d32f2f', borderColor:'#d32f2f'} : {}}
                                     >
                                         {type.label}
                                     </div>
                                 ))}
                             </div>

                             <label className="label-modern">Modelo:</label>
                             <input className="app-input" placeholder="Ex: UN50TU8000GXZD" value={modelo} onChange={(e) => setModelo(e.target.value)} />

                             <label className="label-modern mt-3">Serial:</label>
                             <input className="app-input" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="Digite ou escaneie..." />

                             <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                                 <button type="button" className="btn-pill btn-secondary full-width" onClick={() => openScanner('serial')} style={{justifyContent:'center'}}>
                                    <ScanLine size={16}/> Escanear Serial
                                 </button>
                                 <button type="button" className="btn-pill btn-secondary full-width" onClick={() => setSignatureDialogOpen(true)} style={{justifyContent:'center'}}>
                                    <PenTool size={16}/> Assinar
                                 </button>
                             </div>
                             
                             {signature && <div style={{textAlign:'center', marginTop:'8px', color:'#00C49F', fontSize:'0.85em', fontWeight:'bold'}}>Assinatura Coletada ✅</div>}

                             <label className="label-modern mt-4">Observações do Checklist:</label>
                             <textarea className="app-textarea" rows="2" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Irão para o PDF..."></textarea>

                             <button 
                                type="button" 
                                className="btn-pill btn-finish full-width" 
                                style={{marginTop:'15px', minHeight:'45px', justifyContent:'center'}} 
                                onClick={preencherPDF}
                             >
                                <FileDown size={20} /> Gerar Checklist PDF
                             </button>
                        </div>
                    </div>
                )}

                {/* OBSERVACÕES GERAIS (SE NÃO FOR SAMSUNG) */}
                {!isSamsung && (
                    <div className="cool-card">
                        <label className="label-modern">Observações Gerais:</label>
                        <textarea className="app-textarea" rows="3" value={observacoes} onChange={(e) => setObservacoes(e.target.value)}></textarea>
                    </div>
                )}

                <div style={{display:'flex', gap:'10px', marginBottom:'30px'}}>
                    <button type="button" className="btn-pill btn-cancel" style={{flex:1, justifyContent:'center'}} onClick={limparFormulario}>
                        <Trash2 size={18}/> Limpar
                    </button>
                    <button type="submit" className="btn-pill btn-finish" style={{flex:2, minHeight:'50px', fontSize:'1.1em', justifyContent:'center'}}>
                        <Save size={20}/> Gerar Resumo da OS
                    </button>
                </div>

            </form>
        </div>
    );
}

export default Form;