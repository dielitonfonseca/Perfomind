import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isFlashAvailable, setFlashAvailable] = useState(false);

    useEffect(() => {
        if (!scannerRef.current) return;

        const scanner = new Html5QrcodeScanner(
            scannerRef.current.id,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                // Solicita a câmera traseira
                facingMode: "environment",
                // Desativa o botão de carregar arquivo padrão
                showOpenFileButton: false,
            },
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

        // Função robusta para verificar a disponibilidade do flash
        const checkForFlash = () => {
            const videoElement = document.querySelector(`#${scannerRef.current.id} video`);

            if (videoElement && videoElement.srcObject && videoElement.readyState === 4) {
                const stream = videoElement.srcObject;
                const track = stream.getVideoTracks()[0];
                if (track) {
                    const capabilities = track.getCapabilities();
                    if (capabilities.torch) {
                        setFlashAvailable(true);
                    }
                }
            } else {
                // Tenta novamente se o vídeo ainda não estiver pronto
                setTimeout(checkForFlash, 200);
            }
        };

        checkForFlash();

        // Limpa o scanner quando o componente é desmontado
        return () => {
            scanner.clear().catch(error => {
                console.error("Falha ao limpar o scanner na desmontagem.", error);
            });
        };
    }, [onScanSuccess]);

    const toggleFlash = () => {
        const videoElement = document.querySelector(`#${scannerRef.current.id} video`);
        if (videoElement && videoElement.srcObject) {
            const track = videoElement.srcObject.getVideoTracks()[0];
            if (track) {
                track.applyConstraints({
                    advanced: [{ torch: !isFlashOn }]
                })
                .then(() => setIsFlashOn(!isFlashOn))
                .catch(e => console.error("Erro ao controlar o flash:", e));
            }
        }
    };

    // Função para lidar com a seleção de arquivo da galeria
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Usamos Html5Qrcode aqui APENAS para escanear o arquivo
            const result = await new Html5Qrcode().scanFile(file, false);
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
                    {/* Input de arquivo escondido */}
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {/* Botões personalizados */}
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