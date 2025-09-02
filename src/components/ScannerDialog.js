import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const ScannerDialog = ({ onScanSuccess, onClose }) => {
    const readerRef = useRef(null);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [isFlashAvailable, setFlashAvailable] = useState(false);
    const qrCodeScannerRef = useRef(null);

    useEffect(() => {
        if (!readerRef.current) {
          return;
        }
        // Garante que o elemento 'qr-reader' está vazio antes de instanciar.
        readerRef.current.innerHTML = "";
        const qrCodeScanner = new Html5Qrcode(readerRef.current.id);
        qrCodeScannerRef.current = qrCodeScanner;

        const successCallback = (decodedText, decodedResult) => {
            onScanSuccess(decodedText);
            if (qrCodeScannerRef.current && qrCodeScannerRef.current.isScanning) {
                qrCodeScannerRef.current.stop();
            }
        };

        const errorCallback = (errorMessage) => {
            // ignore
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        Html5Qrcode.getCameras()
            .then(cameras => {
                if (cameras && cameras.length) {
                    const cameraId = cameras[0].id;
                    qrCodeScanner.start(cameraId, config, successCallback, errorCallback)
                        .then(() => {
                            const capabilities = qrCodeScanner.getRunningTrackCameraCapabilities();
                            if (capabilities.torch) {
                                setFlashAvailable(true);
                            }
                        })
                        .catch(err => console.error(err));
                }
            })
            .catch(err => {
                console.error(err);
            });

        return () => {
            if (qrCodeScannerRef.current && qrCodeScannerRef.current.isScanning) {
                qrCodeScannerRef.current.stop();
            }
        };
    }, [onScanSuccess]);


    const toggleFlash = () => {
        if (qrCodeScannerRef.current) {
            const track = qrCodeScannerRef.current.getRunningTrackCameraCapabilities();

            qrCodeScannerRef.current.applyVideoConstraints({
                torch: !isFlashOn,
                advanced: [{torch: !isFlashOn}]
            }).then(() => {
                setIsFlashOn(!isFlashOn)
            }).catch((err) => {
                console.log(err);
            });
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
                    <div id="qr-reader" ref={readerRef} />
                     { isFlashAvailable &&
                        <button onClick={toggleFlash} className="flash-button">
                            {isFlashOn ? 'Desligar Flash' : 'Ligar Flash'}
                        </button>
                     }
                </div>
            </div>
        </div>
    );
};

export default ScannerDialog;