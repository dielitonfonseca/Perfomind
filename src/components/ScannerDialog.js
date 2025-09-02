import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const readerRef = useRef(null);
    const fileInputRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isFlashAvailable, setFlashAvailable] = useState(false);

    useEffect(() => {
        if (!readerRef.current) return;
        readerRef.current.innerHTML = "";

        const html5QrCode = new Html5Qrcode(readerRef.current.id);
        html5QrCodeRef.current = html5QrCode;

        const successCallback = (decodedText, decodedResult) => {
            onScanSuccess(decodedText);
        };

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        const startScannerWithCapabilities = (facingMode) => {
            return html5QrCode.start(
                { facingMode: facingMode },
                config,
                successCallback,
                (errorMessage) => { /* ignore */ }
            ).then(() => {
                // Após a câmera iniciar, verificamos o suporte ao flash
                const capabilities = html5QrCode.getRunningTrackCameraCapabilities();
                if (capabilities.torch) {
                    setFlashAvailable(true);
                }
            });
        };

        // Tenta iniciar com a câmera traseira ("environment")
        startScannerWithCapabilities("environment").catch((err) => {
            console.warn("Falha ao iniciar câmera traseira, tentando câmera frontal.", err);
            // Se falhar, tenta iniciar com a câmera frontal ("user")
            startScannerWithCapabilities("user").catch((errUser) => {
                 console.error("Não foi possível iniciar nenhuma câmera.", errUser);
            });
        });

        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(err => console.error("Erro ao parar o scanner.", err));
            }
        };
    }, [onScanSuccess]);

    const toggleFlash = () => {
        if (html5QrCodeRef.current && isFlashAvailable) {
            const newFlashState = !isFlashOn;
            html5QrCodeRef.current.applyVideoConstraints({
                torch: newFlashState,
                advanced: [{torch: newFlashState}]
            }).then(() => {
                setIsFlashOn(newFlashState);
            }).catch((err) => {
                console.error("Erro ao tentar controlar o flash.", err);
            });
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file && html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                const decodedText = await html5QrCodeRef.current.scanFile(file, true);
                onScanSuccess(decodedText);
            } catch (err) {
                 alert(`Erro ao escanear a imagem: ${err}`);
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
                    {isFlashAvailable && (
                        <button onClick={toggleFlash} className="custom-button flash-button">
                            {isFlashOn ? 'Desligar Flash' : 'Ligar Flash'}
                        </button>
                    )}
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