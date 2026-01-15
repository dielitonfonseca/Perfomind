// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; 
import './App.css';
import Form from './components/Form';
import Output from './components/Output';
import DashboardPage from './pages/DashboardPage';
import KpisPage from './pages/KpisPage';
import RastreamentoTecPage from './pages/RastreamentoTecPage'; // Importe a nova página

function App() {
  const [formData, setFormData] = useState(null);
  const [showDashboardPopup, setShowDashboardPopup] = useState(false);
  const [dashboardClickCount, setDashboardClickCount] = useState(0);
  const [lastDashboardClickTime, setLastDashboardClickTime] = useState(0);

  // --- LÓGICA DE RASTREAMENTO AUTOMÁTICO ---
  useEffect(() => {
    const trackLocation = async () => {
      // Recupera o nome do técnico salvo pelo Form.js no localStorage
      const techName = localStorage.getItem('savedTechName');

      // Se não houver técnico salvo, não rastreia (ou usa um padrão se preferir)
      if (!techName) return;

      const lastTrackTime = localStorage.getItem('lastLocationTime');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Verifica se já passou 5 minutos ou se nunca foi coletado
      if (!lastTrackTime || (now - parseInt(lastTrackTime)) > fiveMinutes) {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            try {
              const { latitude, longitude, accuracy } = position.coords;
              
              // Salva na coleção: rastreamento -> {nome_tecnico} -> historico -> {doc}
              await addDoc(collection(db, 'rastreamento', techName, 'historico'), {
                latitude,
                longitude,
                accuracy,
                timestamp: serverTimestamp(), // Data do servidor
                dataLocal: new Date().toISOString(),
                userAgent: navigator.userAgent
              });

              console.log(`Localização de ${techName} salva.`);
              localStorage.setItem('lastLocationTime', now.toString());
              
            } catch (error) {
              console.error("Erro ao salvar localização:", error);
            }
          }, (error) => {
            console.warn("Permissão de localização negada ou erro:", error);
          });
        }
      }
    };

    trackLocation();
  }, []); // Executa ao abrir o App

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
              <li>
                <Link to="/">Início</Link>
              </li>
              <li>
                <Link to="/dashboard" onClick={handleDashboardClick}>Dashboard</Link>
              </li>
              {/* OBS: O link para /rastreamentotec NÃO está aqui, conforme solicitado */}
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
            
            {/* Rota acessível apenas via URL direta */}
            <Route path="/rastreamentotec" element={<RastreamentoTecPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;