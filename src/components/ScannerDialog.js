import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isFlashAvailable, setFlashAvailable] = useState(false);
    const scannerInstanceRef = useRef(null);

    // Efeito para injetar CSS e customizar a UI do scanner
    useEffect(() => {
        const style = document.createElement('style');
        // ATUALIZAÇÃO: Adicionado #html5-qrcode-section-camera-selection para remover toda a seção.
        style.innerHTML = `
            #html5-qrcode-button-camera-stop, 
            #html5-qrcode-anchor-scan-type-change,
            #html5-qrcode-section-camera-selection {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);


    useEffect(() => {
        if (!scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            scannerRef.current.id,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                facingMode: "environment", // Prioriza a câmera traseira
                showOpenFileButton: false, // Oculta o botão de arquivo padrão
            },
            false // verbose
        );
        scannerInstanceRef.current = scanner;

        const handleSuccess = (decodedText, decodedResult) => {
            if(scannerInstanceRef.current){
                 scannerInstanceRef.current.clear().then(() => {
                    onScanSuccess(decodedText);
                }).catch(error => {
                    console.error("Falha ao limpar o scanner.", error);
                });
            }
        };

        const handleError = (error) => { /* console.warn(`QR Code Scan Error: ${error}`); */ };

        scanner.render(handleSuccess, handleError);

        const checkForFlash = () => {
            const videoElement = document.querySelector(`#${scannerRef.current.id} video`);
            if (videoElement && videoElement.srcObject && videoElement.readyState === 4) {
                const track = videoElement.srcObject.getVideoTracks()[0];
                if (track && track.getCapabilities().torch) {
                    setFlashAvailable(true);
                }
            } else {
                setTimeout(checkForFlash, 200);
            }
        };

        checkForFlash();

        return () => {
             if(scannerInstanceRef.current){
                scannerInstanceRef.current.clear().catch(error => {
                    console.error("Falha ao limpar o scanner na desmontagem.", error);
                });
            }
        };
    }, [onScanSuccess]);

    const toggleFlash = () => {
        const videoElement = document.querySelector(`#${scannerRef.current.id} video`);
        if (videoElement && videoElement.srcObject) {
            const track = videoElement.srcObject.getVideoTracks()[0];
            if (track) {
                track.applyConstraints({ advanced: [{ torch: !isFlashOn }] })
                    .then(() => setIsFlashOn(!isFlashOn))
                    .catch(e => console.error("Erro ao controlar o flash:", e));
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // CORREÇÃO: Passa o ID do elemento para o construtor do Html5Qrcode
            const fileScanner = new Html5Qrcode(scannerRef.current.id);
            const result = await fileScanner.scanFile(file, false);
            onScanSuccess(result);
        } catch (err) {
            alert(`Não foi possível ler o QR Code da imagem. Erro: ${err}`);
        }
    };


    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>Escanear Código</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="dialog-body">
                    <div id="qr-reader" ref={scannerRef}></div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button onClick={() => fileInputRef.current.click()} className="custom-button">
                        Carregar da Galeria
                    </button>
                    <button onClick={onClose} className="custom-button stop-scan-button">
                        Fechar Scanner
                    </button>
                    {isFlashAvailable && (
                        <button onClick={toggleFlash} className="custom-button flash-button">
                            {isFlashOn ? 'Desligar Flash' : 'Ligar Flash'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScannerDialog;