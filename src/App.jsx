import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { getInvestors, STAGES, getDaysSinceContact } from './data/store';
import { exportCSV } from './utils/export';
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

  const handleExport = async () => {
    const raw = await getInvestors();
    let list = raw.map(inv => ({
      ...inv,
      daysSince: getDaysSinceContact(inv)
    }));

    // Apply basic search/filter for export (match table logic)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(inv =>
        inv.name.toLowerCase().includes(q) ||
        (inv.primary_contact || '').toLowerCase().includes(q)
      );
    }
    if (filters.entity) list = list.filter(i => i.entity === filters.entity);
    if (filters.stage) list = list.filter(i => i.stage === filters.stage);

    exportCSV(list);
  };

  return (
    <div className="app">
      {/* Linear-style Slim Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="brand" onClick={() => setActiveTab('table')}>
            <div className="brand-text">
              <span className="brand-name">APEX</span>
              <span className="brand-divider">/</span>
              <span className="brand-context">INVESTOR TRACKER</span>
            </div>
          </div>

          <nav className="header-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              + Add Investor
            </button>
          </div>
        </div>
      </header>

      {/* Stage pills bar */}
      {activeTab === 'table' && <StagePillsBar refreshKey={refreshKey} />}

      {/* Unified Toolbar (Search & Filter) */}
      {(activeTab === 'table' || activeTab === 'kanban') && (
        <SearchFilter
          filters={filters}
          onFilterChange={setFilters}
          onImport={activeTab === 'table' ? () => setShowInvestorModal(true) : null}
          onExport={activeTab === 'table' ? handleExport : null}
        />
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
            setShowExcelModal={setShowExcelModal}
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
