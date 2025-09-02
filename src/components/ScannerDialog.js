import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isFlashAvailable, setFlashAvailable] = useState(false);
    const scannerInstance = useRef(null);

    useEffect(() => {
        if (!scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            scannerRef.current.id,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false // verbose
        );
        scannerInstance.current = scanner;

        const handleSuccess = (decodedText, decodedResult) => {
            scanner.clear().then(() => {
                onScanSuccess(decodedText);
            }).catch(error => {
                console.error("Falha ao limpar o scanner.", error);
            });
        };

        const handleError = (error) => {
            // console.warn(`QR Code Scan Error: ${error}`);
        };

        scanner.render(handleSuccess, handleError);

        // Função para verificar a disponibilidade do flash
        const checkForFlash = () => {
            const videoElement = document.querySelector(`#${scannerRef.current.id} video`);

            if (videoElement && videoElement.srcObject) {
                const stream = videoElement.srcObject;
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const capabilities = track.getCapabilities();
                    if (capabilities.torch) {
                        setFlashAvailable(true);
                    }
                }
            } else {
                // Tenta novamente em 100ms se o vídeo ainda não estiver pronto
                setTimeout(checkForFlash, 100);
            }
        };

        checkForFlash();

        return () => {
            scanner.clear().catch(error => {
                console.error("Falha ao limpar o scanner na desmontagem.", error);
            });
        };
    }, [onScanSuccess]);

    const toggleFlash = () => {
        const videoElement = document.querySelector(`#${scannerRef.current.id} video`);
        if (videoElement && videoElement.srcObject) {
            const stream = videoElement.srcObject;
            const track = stream.getVideoTracks()[0];

            if (track) {
                track.applyConstraints({
                    advanced: [{ torch: !isFlashOn }]
                })
                .then(() => {
                    setIsFlashOn(!isFlashOn);
                })
                .catch(e => console.error(e));
            }
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
                    {isFlashAvailable && (
                        <button onClick={toggleFlash} className="flash-button">
                            {isFlashOn ? 'Desligar Flash' : 'Ligar Flash'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScannerDialog;