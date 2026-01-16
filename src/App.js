import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import Form from './components/Form';
import Output from './components/Output';
import KpisPage from './pages/KpisPage';
import DashboardPage from './pages/DashboardPage';
import RastreamentoTecPage from './pages/RastreamentoTecPage';
import ReportsConfigPage from './pages/ReportsConfigPage';
import ImportRoutesPage from './pages/ImportRoutesPage';
import MyRoutePage from './pages/MyRoutePage';
import './App.css';
import { Home, LayoutDashboard, Truck, Upload, BarChart3, FileText, Menu } from 'lucide-react';

// Menu Inferior Dinâmico
function BottomNav({ showEasterEgg }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'nav-item active' : 'nav-item';

  return (
    <nav className="bottom-nav">
      {/* MODO NORMAL: Início, Rota, Dash */}
      {!showEasterEgg && (
        <>
          <Link to="/" className={isActive('/')}>
            <Home size={22} />
            <span>Início</span>
          </Link>
          <Link to="/minha-rota" className={isActive('/minha-rota')}>
            <Truck size={22} />
            <span>Rota</span>
          </Link>
          <Link to="/dashboard" className={isActive('/dashboard')}>
            <LayoutDashboard size={22} />
            <span>Dash</span>
          </Link>
        </>
      )}

      {/* MODO EASTER EGG (Completo) */}
      {showEasterEgg && (
        <>
           <Link to="/minha-rota" className={isActive('/minha-rota')}>
            <Truck size={20} />
            <span>Rota</span>
          </Link>
          <Link to="/cadastrar" className={isActive('/cadastrar')}>
            <Upload size={20} />
            <span>Importar</span>
          </Link>
          <Link to="/kpis" className={isActive('/kpis')}>
            <BarChart3 size={20} />
            <span>KPIs</span>
          </Link>
          <Link to="/" className={isActive('/')}>
            <Home size={20} />
            <span>Início</span>
          </Link>
          <Link to="/dashboard" className={isActive('/dashboard')}>
            <LayoutDashboard size={20} />
            <span>Dash</span>
          </Link>
          <Link to="/config" className={isActive('/config')}>
            <FileText size={20} />
            <span>Relatório</span>
          </Link>
        </>
      )}
    </nav>
  );
}

function App() {
  const [formData, setFormData] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  // Lógica de 3 cliques
  const handleTitleClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount === 3) {
      setShowEasterEgg(prev => !prev);
      setClickCount(0);
      alert(!showEasterEgg ? "Modo Avançado Ativado 🔓" : "Modo Simplificado 🔒");
    }
  };

  return (
    <Router>
      <div className="App">
        {/* Header Limpo */}
        <header className="App-header">
          <div className="header-center">
            <h1 onClick={handleTitleClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
              Perfomind 🚀
            </h1>
          </div>
        </header>

        <main className="App-main" style={{ paddingBottom: '80px' }}>
          <Routes>
            <Route path="/" element={
              <div className="content-container">
                <div className="form-section">
                  <Form setFormData={setFormData} />
                </div>
                <div className="output-section">
                  <Output data={formData} />
                </div>
              </div>
            } />
            <Route path="/kpis" element={<KpisPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/rastreamento" element={<RastreamentoTecPage />} />
            <Route path="/config" element={<ReportsConfigPage />} />
            <Route path="/cadastrar" element={<ImportRoutesPage />} />
            <Route path="/minha-rota" element={<MyRoutePage />} />
          </Routes>
        </main>
        
        <BottomNav showEasterEgg={showEasterEgg} />
      </div>
    </Router>
  );
}

export default App;