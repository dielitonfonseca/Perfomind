import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isFlashAvailable, setFlashAvailable] = useState(false);
    const scannerInstanceRef = useRef(null);

    // Efeito para observar e modificar a UI do scanner assim que ela for renderizada
    useEffect(() => {
        const container = scannerRef.current;
        if (!container) return;

        const observer = new MutationObserver((mutations, obs) => {
            // Procura o botão de parar e o de trocar a câmera
            const stopButton = document.getElementById('html5-qrcode-button-camera-stop');
            const cameraSelection = document.getElementById('html5-qrcode-anchor-scan-type-change');

            // Se ambos existirem, oculta-os e para de observar
            if (stopButton && cameraSelection) {
                stopButton.style.display = 'none';
                cameraSelection.style.display = 'none';
                obs.disconnect(); // Para de observar após a modificação
            }
        });

        // Inicia a observação no container do scanner
        observer.observe(container, {
            childList: true,
            subtree: true
        });

        // Limpa o observador quando o componente é desmontado
        return () => {
            observer.disconnect();
        };
    }, []);


    useEffect(() => {
        if (!scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            scannerRef.current.id,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                facingMode: "environment",
                showOpenFileButton: false,
            },
            false
        );
        scannerInstanceRef.current = scanner;

        const handleSuccess = (decodedText) => {
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.clear().then(() => onScanSuccess(decodedText));
            }
        };

        const handleError = () => { /* Ignora erros */ };

        scanner.render(handleSuccess, handleError);

        const checkForFlash = () => {
            const videoElement = document.querySelector(`#${scannerRef.current.id} video`);
            if (videoElement && videoElement.readyState === 4) {
                const track = videoElement.srcObject?.getVideoTracks()[0];
                if (track && track.getCapabilities().torch) {
                    setFlashAvailable(true);
                }
            } else {
                setTimeout(checkForFlash, 200);
            }
        };

        checkForFlash();

        return () => {
            if (scannerInstanceRef.current) {
                scannerInstanceRef.current.clear().catch(() => {});
            }
        };
    }, [onScanSuccess]);

    const toggleFlash = () => {
        const videoElement = document.querySelector(`#${scannerRef.current.id} video`);
        const track = videoElement?.srcObject?.getVideoTracks()[0];
        if (track) {
            track.applyConstraints({ advanced: [{ torch: !isFlashOn }] })
                .then(() => setIsFlashOn(!isFlashOn))
                .catch(e => console.error("Erro ao controlar o flash:", e));
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
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
                    <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                    
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