import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { db } from './firebaseConfig';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'; 
import './App.css';
import Form from './components/Form';
import Output from './components/Output';
import DashboardPage from './pages/DashboardPage';
import KpisPage from './pages/KpisPage';
import RastreamentoTecPage from './pages/RastreamentoTecPage';

function App() {
  const [formData, setFormData] = useState(null);
  const [showDashboardPopup, setShowDashboardPopup] = useState(false);
  const [dashboardClickCount, setDashboardClickCount] = useState(0);
  const [lastDashboardClickTime, setLastDashboardClickTime] = useState(0);

  // --- LÓGICA DE RASTREAMENTO AUTOMÁTICO (30 SEGUNDOS) ---
  useEffect(() => {
    const trackLocation = async () => {
      // Tenta recuperar o técnico salvo
      const techName = localStorage.getItem('savedTechName') || localStorage.getItem('tecnico');

      if (!techName) return;

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            const timestamp = serverTimestamp();
            
            // Flag diferente para monitoramento de rotina
            const docData = {
              latitude,
              longitude,
              accuracy,
              timestamp,
              dataLocal: new Date().toISOString(),
              userAgent: navigator.userAgent,
              origem: 'monitoramento', // Flag de rotina
              osVinculada: null        // Nenhuma OS vinculada aqui
            };
            
            // 1. Salva no HISTÓRICO
            await addDoc(collection(db, 'rastreamento', techName, 'historico'), docData);

            // 2. Atualiza a ÚLTIMA LOCALIZAÇÃO (Pai)
            await setDoc(doc(db, 'rastreamento', techName), {
              lastLocation: docData,
              updatedAt: timestamp,
              nome: techName
            }, { merge: true });

            console.log(`[Auto 30s] Localização de ${techName} atualizada.`);
            
          } catch (error) {
            console.error("Erro ao salvar localização automática:", error);
          }
        }, (error) => {
          console.warn("Erro geo (auto):", error);
        }, { enableHighAccuracy: true, timeout: 10000 });
      }
    };

    // Executa imediatamente ao carregar
    trackLocation();

    // Configura o intervalo de 30 segundos (30000 ms)
    const intervalId = setInterval(trackLocation, 30000);

    // Limpa o intervalo se o componente desmontar
    return () => clearInterval(intervalId);
  }, []);

  const handleDashboardClick = () => {
    const now = Date.now();
    if (now - lastDashboardClickTime < 5000) {
      const newCount = dashboardClickCount + 1;
      setDashboardClickCount(newCount);
      if (newCount === 3) {
        setShowDashboardPopup(true);
        setDashboardClickCount(0);
      }
    } else {
      setDashboardClickCount(1);
    }
    setLastDashboardClickTime(now);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Date.now() - lastDashboardClickTime > 5000) {
        setDashboardClickCount(0);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [lastDashboardClickTime]);


  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1 className="app-title">Perfomind</h1>
          <nav className="main-nav">
            <ul>
              <li><Link to="/">Início</Link></li>
              <li><Link to="/dashboard" onClick={handleDashboardClick}>Dashboard</Link></li>
            </ul>
          </nav>
        </header>

        <div className="main-content">
          <Routes>
            <Route path="/" element={
              <>
                <Form setFormData={setFormData} />
                {formData && <Output data={formData} />}
              </>
            } />
            <Route path="/dashboard" element={<DashboardPage showPopup={showDashboardPopup} setShowPopup={setShowDashboardPopup} />} />
            <Route path="/kpis" element={<KpisPage />} />
            <Route path="/tec" element={<RastreamentoTecPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;