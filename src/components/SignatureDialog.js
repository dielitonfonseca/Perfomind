import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const Dialog = ({ children, open, onClose }) => {
  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content signature-dialog" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

const SignatureDialog = ({ onSave, onClose }) => {
  const sigCanvas = useRef(null);

  // Função para redimensionar o canvas para preencher seu contêiner
  const resizeCanvas = () => {
    if (sigCanvas.current) {
      const canvas = sigCanvas.current.getCanvas();
      const container = canvas.parentElement;
      if (container) {
        // Ajusta as dimensões do canvas para as do contêiner
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        sigCanvas.current.clear(); // Limpa o canvas após redimensionar
      }
    }
  };

  useEffect(() => {
    // Redimensiona o canvas quando o componente é montado e quando a janela muda de tamanho
    setTimeout(resizeCanvas, 0); // Pequeno delay para garantir que o DOM está pronto
    window.addEventListener('resize', resizeCanvas);

    // Limpa o event listener quando o componente é desmontado
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signature = sigCanvas.current.toDataURL();
      onSave(signature);
    } else {
      alert("Por favor, colete a assinatura antes de salvar.");
    }
  };

  const clearCanvas = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
    }
  };

  return (
    <Dialog open={true} onClose={onClose}>
      <div className="dialog-header">
        <h2>Coletar Assinatura</h2>
        <p>Peça ao cliente para assinar na horizontal no campo abaixo.</p>
      </div>
      <div className="signature-dialog-canvas-container">
        <SignatureCanvas
          ref={sigCanvas}
          penColor="black"
          canvasProps={{ className: 'sigCanvas-popup' }}
        />
      </div>
      <div className="dialog-footer">
        <button type="button" onClick={clearCanvas}>
          Limpar
        </button>
        <button type="button" onClick={handleSave}>
          Salvar Assinatura
        </button>
        <button type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Dialog>
  );
};

export default SignatureDialog;