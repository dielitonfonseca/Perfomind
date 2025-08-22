import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const Dialog = ({ children, open, onClose }) => {
  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const ScannerDialog = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef(null);
  const scannerContainerId = "qr-reader";

  useEffect(() => {
    scannerRef.current = new Html5Qrcode(scannerContainerId);
    const scanner = scannerRef.current;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Can be ignored
          }
        );
      } catch (err) {
        console.error("Error starting scanner:", err);
        alert("Could not start scanner. Please check camera permissions.");
        onClose();
      }
    };

    startScanner();

    return () => {
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(err => {
          console.error("Failed to stop scanner.", err);
        });
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <Dialog open={true} onClose={onClose}>
      <div className="dialog-header">
        <h2>Escanear Código</h2>
        <p>Aponte a câmera para o código de barras ou QR code.</p>
      </div>
      <div id={scannerContainerId} style={{ width: '100%', minHeight: '300px' }} />
      <div className="dialog-footer">
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Dialog>
  );
};

export default ScannerDialog;