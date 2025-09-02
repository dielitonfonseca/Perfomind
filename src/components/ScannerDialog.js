import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const readerRef = useRef(null);
    const fileInputRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    useEffect(() => {
        if (!readerRef.current) return;
        // Limpa o container para evitar duplicatas ao reabrir
        readerRef.current.innerHTML = "";

        const html5QrCode = new Html5Qrcode(readerRef.current.id);
        html5QrCodeRef.current = html5QrCode;

        const successCallback = (decodedText, decodedResult) => {
            onScanSuccess(decodedText);
        };

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        const startScanner = (facingMode) => {
            return html5QrCode.start(
                { facingMode: facingMode },
                config,
                successCallback,
                (errorMessage) => { /* ignora erros de não detecção */ }
            );
        };

        // Tenta iniciar com a câmera traseira ("environment")
        startScanner("environment").catch((err) => {
            console.warn("Falha ao iniciar câmera traseira, tentando câmera frontal.", err);
            // Se falhar, tenta iniciar com a câmera frontal ("user")
            startScanner("user").catch((errUser) => {
                 console.error("Não foi possível iniciar nenhuma câmera.", errUser);
            });
        });


        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(err => console.error("Erro ao parar o scanner.", err));
            }
        };
    }, [onScanSuccess]);


    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file && html5QrCodeRef.current) {
            try {
                 // Pausa a câmera antes de escanear o arquivo para economizar recursos
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                const decodedText = await html5QrCodeRef.current.scanFile(file, true);
                onScanSuccess(decodedText);
            } catch (err) {
                 alert(`Erro ao escanear a imagem: ${err}`);
                 // Reinicia a câmera se a leitura do arquivo falhar
                 onClose();
            }
        }
    };

    const handleGalleryClick = () => {
        fileInputRef.current.click();
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
                <div className="dialog-header">
                    <h2>Escanear Código</h2>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="dialog-body">
                    <div id="qr-reader" ref={readerRef} style={{ width: '100%', border: '1px solid #eee', marginBottom: '10px' }}></div>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button onClick={handleGalleryClick} className="custom-button">
                        Carregar da Galeria
                    </button>
                    <button onClick={onClose} className="custom-button stop-scan-button">
                        Fechar Scanner
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScannerDialog;