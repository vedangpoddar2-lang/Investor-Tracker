import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import SearchFilter from './components/SearchFilter';
import InvestorModal from './components/InvestorModal';
import QuickLogModal from './components/QuickLogModal';
import InvestorDrawer from './components/InvestorDrawer';
import TableView from './views/TableView';
import KanbanView from './views/KanbanView';
import TodoView from './views/TodoView';
import StagePillsBar from './components/StagePillsBar';
import './App.css';

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'kanban', label: 'Pipeline' },
  { id: 'todos', label: 'To-dos' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('table');
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({
    search: '',
    entity: '',
    stage: '',
    ndaStatus: '',
    infoShared: '',
  });

  // Modals
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [editingInvestor, setEditingInvestor] = useState(null);
  const [quickLogTarget, setQuickLogTarget] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [drawerTab, setDrawerTab] = useState('details');

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleOpenDrawer = (id, tab = 'details') => {
    setDrawerId(id);
    setDrawerTab(tab);
  };
  const handleCloseDrawer = () => setDrawerId(null);

  const handleOpenModal = (investor = null) => {
    setEditingInvestor(investor);
    setShowInvestorModal(true);
  };

  const handleQuickLog = (investorId, investorName) => {
    setQuickLogTarget({ id: investorId, name: investorName });
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header-titles">
          <h1 className="app-title">Investor Outreach</h1>
          <p className="app-subtitle">Apex Data Centers &amp; FluidCore — outreach tracker</p>
        </div>
        <nav className="app-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`app-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Stage pills bar */}
      {activeTab === 'table' && <StagePillsBar refreshKey={refreshKey} />}

      {/* Search & Filter */}
      {activeTab === 'table' && (
        <SearchFilter filters={filters} onFilterChange={setFilters} />
      )}

      {/* Active View */}
      <main className="app-main">
        {activeTab === 'table' && (
          <TableView
            filters={filters}
            onOpenDrawer={handleOpenDrawer}
            onOpenModal={() => handleOpenModal()}
            onQuickLog={handleQuickLog}
            refreshKey={refreshKey}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'kanban' && (
          <KanbanView
            filters={filters}
            onOpenDrawer={handleOpenDrawer}
            refreshKey={refreshKey}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'todos' && (
          <TodoView
            onOpenDrawer={handleOpenDrawer}
            refreshKey={refreshKey}
            onUpdate={refresh}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      <AnimatePresence>
        {showInvestorModal && (
          <InvestorModal
            investor={editingInvestor}
            onClose={() => { setShowInvestorModal(false); setEditingInvestor(null); }}
            onSave={refresh}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickLogTarget && (
          <QuickLogModal
            investorId={quickLogTarget.id}
            investorName={quickLogTarget.name}
            onClose={() => setQuickLogTarget(null)}
            onSave={refresh}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {drawerId && (
          <InvestorDrawer
            investorId={drawerId}
            initialTab={drawerTab}
            onClose={handleCloseDrawer}
            onUpdate={refresh}
            onDelete={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
