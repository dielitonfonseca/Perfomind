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
        style.innerHTML = `
            /* Oculta elementos desnecessários */
            #html5-qrcode-button-camera-stop, 
            #html5-qrcode-anchor-scan-type-change,
            #html5-qrcode-select-camera,
            #html5-qrcode-section-header {
                display: none !important;
            }

            /* Altera o texto do TÍTULO do diálogo de permissão */
            #html5-qrcode-permission-dialog-title {
                font-size: 0 !important; /* Esconde o texto original */
            }

            #html5-qrcode-permission-dialog-title::before {
                content: "Permita o uso da câmera"; /* Adiciona o novo texto */
                font-size: 1rem; /* Define um tamanho de fonte legível para o novo texto */
                color: #000; /* Garante que o texto seja visível */
            }

            /* Altera o texto do BOTÃO de permissão */
            #html5-qrcode-permission-button {
                font-size: 0 !important; /* Esconde o texto original do botão */
            }

            #html5-qrcode-permission-button::before {
                content: "Solicitar permissão de uso da câmera"; /* Adiciona o novo texto */
                font-size: 1rem; /* Ajuste o tamanho da fonte conforme necessário */
            }
        `;
        document.head.appendChild(style);

        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.addedNodes.length) {
                    const permissionDialog = document.getElementById('html5-qrcode-permission-dialog');
                    if (permissionDialog) {
                       // O CSS já está aplicado, não precisamos fazer mais nada aqui
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            document.head.removeChild(style);
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