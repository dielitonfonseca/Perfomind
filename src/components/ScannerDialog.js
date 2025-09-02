import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);

    useEffect(() => {
        if (!scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            scannerRef.current.id,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false // verbose
        );

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

        // Função de limpeza para parar o scanner quando o componente for desmontado
        return () => {
            scanner.clear().catch(error => {
                console.error("Falha ao limpar o scanner na desmontagem.", error);
            });
        };
    }, [onScanSuccess]);

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>Escanear Código</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="dialog-body">
                    <div id="qr-reader" ref={scannerRef}></div>
                </div>
            </div>
        </div>
    );
};

export default ScannerDialog;