import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquarePlus, Download, ArrowUpDown, FileSpreadsheet } from 'lucide-react';
import { getInvestors, getAllInteractions, getAllTodos, getDaysSinceContact, updateInvestor, STAGES, NDA_STATUSES, INFO_SHARED_STATUSES, ENTITIES } from '../data/store';
import { exportCSV } from '../utils/export';
import ExcelUploadModal from '../components/ExcelUploadModal';
import './TableView.css';

// Stage color pill config
const STAGE_PILL_COLORS = {
    'Lead': { bg: '#FEF3C7', text: '#92400E' },
    'Reached out': { bg: '#FEF3C7', text: '#92400E' },
    'Initial call': { bg: '#FEF3C7', text: '#92400E' },
    'Follow up': { bg: '#DBEAFE', text: '#1E40AF' },
    'NDA signed': { bg: '#DBEAFE', text: '#1E40AF' },
    'Shared Info': { bg: '#D1FAE5', text: '#065F46' },
    'Reviewing': { bg: '#D1FAE5', text: '#065F46' },
    'Passed': { bg: '#FEE2E2', text: '#991B1B' },
    'Hold': { bg: '#F3F4F6', text: '#6B7280' },
};

function StagePill({ value, options, onChange }) {
    const [open, setOpen] = useState(false);
    const colors = STAGE_PILL_COLORS[value] || { bg: '#F3F4F6', text: '#6B7280' };

    return (
        <div className="stage-pill-cell" style={{ position: 'relative' }}>
            <span
                className="stage-pill-badge"
                style={{ background: colors.bg, color: colors.text }}
                onClick={() => setOpen(o => !o)}
            >
                {value || '—'}
            </span>
            {open && (
                <div className="stage-pill-dropdown">
                    {options.map(opt => {
                        const c = STAGE_PILL_COLORS[opt] || { bg: '#F3F4F6', text: '#6B7280' };
                        return (
                            <div
                                key={opt}
                                className="stage-pill-option"
                                onClick={() => { onChange(opt); setOpen(false); }}
                            >
                                <div className="stage-pill-option-dot" style={{ backgroundColor: c.text }}></div>
                                <span className="stage-pill-option-text">{opt}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function EditableCell({ value, type = 'text', options = [], onChange }) {
    const [val, setVal] = useState(value || '');

    useEffect(() => {
        setVal(value || '');
    }, [value]);

    const handleBlur = () => {
        if (val !== (value || '')) onChange(val);
    };

    if (type === 'select') {
        let colorClass = '';
        if (val === 'Executed' || val === 'Yes') colorClass = 'select-green';
        if (val === 'Not Sent' || val === 'No') colorClass = 'select-red';

        return (
            <select
                value={val}
                onChange={(e) => { setVal(e.target.value); onChange(e.target.value); }}
                className={`inline-select ${colorClass}`}
            >
                <option value="">—</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }

    if (type === 'date') {
        return (
            <input
                type="date"
                value={val}
                onChange={(e) => { setVal(e.target.value); onChange(e.target.value); }}
                className="inline-input"
            />
        );
    }

    return (
        <input
            type="text"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            className={`inline-input ${val ? '' : 'empty-cell'}`}
            placeholder="—"
        />
    );
}

export default function TableView({ filters, onOpenDrawer, onOpenModal, onQuickLog, refreshKey, onUpdate }) {
    const [sortCol, setSortCol] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [rawInvestors, setRawInvestors] = useState([]);
    const [rawInteractions, setRawInteractions] = useState([]);
    const [rawTodos, setRawTodos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showExcelModal, setShowExcelModal] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [invs, ixs, tds] = await Promise.all([
                    getInvestors(),
                    getAllInteractions(),
                    getAllTodos()
                ]);
                setRawInvestors(invs);
                setRawInteractions(ixs);
                setRawTodos(tds);
            } catch (err) {
                console.error('Failed to load table data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [refreshKey]);

    const investors = useMemo(() => {
        let list = rawInvestors.map((inv) => {
            const ixs = rawInteractions.filter((i) => i.investor_id === inv.id);
            const pendingTodos = rawTodos.filter((t) => t.investor_id === inv.id && !t.done);
            return {
                ...inv,
                daysSince: getDaysSinceContact(inv),
                interactionCount: ixs.length,
                _pendingTodosCount: pendingTodos.length,
                _pendingTodosText: pendingTodos.map(t => t.text).join(', '),
            };
        });

        // Filters
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(inv =>
                inv.name.toLowerCase().includes(q) ||
                (inv.primary_contact || '').toLowerCase().includes(q) ||
                (inv.key_discussion_point || '').toLowerCase().includes(q)
            );
        }
        if (filters.entity) list = list.filter(i => i.entity === filters.entity);
        if (filters.stage) list = list.filter(i => i.stage === filters.stage);
        if (filters.ndaStatus) list = list.filter(i => i.nda_status === filters.ndaStatus);
        if (filters.infoShared) list = list.filter(i => i.info_shared === filters.infoShared);

        // Sort
        list.sort((a, b) => {
            let va = a[sortCol] ?? '';
            let vb = b[sortCol] ?? '';
            if (sortCol === 'daysSince') { va = a.daysSince; vb = b.daysSince; }
            if (typeof va === 'string') va = va.toLowerCase();
            if (typeof vb === 'string') vb = vb.toLowerCase();
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });

        return list;
    }, [rawInvestors, rawInteractions, rawTodos, filters, sortCol, sortDir]);

    const handleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('asc'); }
    };

    const handleUpdateField = async (id, field, value) => {
        await updateInvestor(id, { [field]: value });
        if (onUpdate) onUpdate();
    };

    const columns = [
        { key: 'name', label: 'Investor', type: 'text', minWidth: 150 },
        { key: 'primary_contact', label: 'Primary Contact', type: 'text', minWidth: 140 },
        { key: 'contact_designation', label: 'Designation', type: 'text', minWidth: 140 },
        { key: 'entity', label: 'Reached By', type: 'select', options: ENTITIES, minWidth: 110 },
        { key: 'first_outreach_date', label: 'First Outreach', type: 'date', minWidth: 130 },
        { key: 'stage', label: 'Current Status', type: 'stage', options: STAGES, minWidth: 160 },
        { key: 'nda_status', label: 'NDA Status', type: 'select', options: NDA_STATUSES, minWidth: 135 },
        { key: 'info_shared', label: 'Info Shared', type: 'select', options: INFO_SHARED_STATUSES, minWidth: 125 },
        { key: 'last_interaction_date', label: 'Last Interaction', type: 'date', minWidth: 130 },
        { key: 'daysSince', label: 'Days Since', type: 'readonly', minWidth: 100 },
        { key: 'key_discussion_point', label: 'Key Discussion Point', type: 'text', minWidth: 200 },
        { key: 'pending_to_dos', label: 'Pending To Dos', type: 'todos', minWidth: 180 },
        { key: 'action_owner', label: 'Action Owner', type: 'text', minWidth: 130 },
        { key: 'next_follow_up_date', label: 'Next Follow-up', type: 'date', minWidth: 130 },
        { key: 'follow_up_status', label: 'Follow-up Status', type: 'text', minWidth: 140 },
        { key: 'remarks', label: 'Remarks', type: 'text', minWidth: 180 },
        { key: 'actions', label: '', type: 'actions', minWidth: 50 },
    ];

    const staleClass = (days) => {
        if (days >= 14) return 'row-stale-danger';
        if (days >= 7) return 'row-stale-warning';
        return '';
    };

    if (loading && rawInvestors.length === 0) {
        return <div className="loading-state">Loading data from Supabase...</div>;
    }

    return (
        <div className="table-view">
            <div className="table-actions">
                <button className="btn btn-secondary" onClick={() => setShowExcelModal(true)}>
                    <FileSpreadsheet size={14} /> Import Excel
                </button>
                <button className="btn btn-secondary" onClick={() => exportCSV(investors)}>
                    <Download size={14} /> Export CSV
                </button>
                <span className="table-count">{investors.length} investor{investors.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="table-wrapper">
                <table className="data-table spreadsheet-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ minWidth: col.minWidth }}
                                    onClick={() => col.key !== 'actions' && handleSort(col.key)}
                                >
                                    <span className="th-content">
                                        {col.label}
                                        {sortCol === col.key && (
                                            <ArrowUpDown size={12} className={`sort-icon ${sortDir}`} />
                                        )}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {investors.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="table-empty">
                                        {loading ? 'Refreshing...' : 'No investors found. Add your first one!'}
                                    </td>
                                </tr>
                            ) : (
                                investors.map((inv, idx) => (
                                    <motion.tr
                                        key={inv.id}
                                        className={`data-row ${staleClass(inv.daysSince)}`}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ delay: idx * 0.02 }}
                                        layout
                                    >
                                        {columns.map((col) => {
                                            // Actions column
                                            if (col.key === 'actions') {
                                                return (
                                                    <td key={col.key} className="col-actions">
                                                        <button className="btn btn-ghost btn-icon btn-sm" title="Quick log"
                                                            onClick={(e) => { e.stopPropagation(); onQuickLog(inv.id, inv.name); }}>
                                                            <MessageSquarePlus size={14} />
                                                        </button>
                                                    </td>
                                                );
                                            }

                                            // Days since — readonly
                                            if (col.key === 'daysSince') {
                                                return (
                                                    <td key={col.key} className="col-readonly">
                                                        {inv.daysSince < 999 ? inv.daysSince + 'd' : '—'}
                                                    </td>
                                                );
                                            }

                                            // Investor name — clickable link
                                            if (col.key === 'name') {
                                                return (
                                                    <td key={col.key} className="cell-flex" style={{ padding: 0 }}>
                                                        <div
                                                            className="investor-link-wrapper"
                                                            onClick={() => onOpenDrawer(inv.id)}
                                                            title="Open full details"
                                                        >
                                                            <span className="investor-name-link">{inv[col.key] || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            // Pending To Dos — computed from actual todos
                                            if (col.key === 'pending_to_dos') {
                                                const hasTodos = inv._pendingTodosCount > 0;
                                                return (
                                                    <td key={col.key}>
                                                        {hasTodos ? (
                                                            <div
                                                                className="todo-link-cell"
                                                                onClick={(e) => { e.stopPropagation(); onOpenDrawer(inv.id, 'todos'); }}
                                                                title="Click to view/edit in drawer"
                                                            >
                                                                <span className="todo-count-badge">{inv._pendingTodosCount}</span>
                                                                <span className="todo-preview-text">{inv._pendingTodosText}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="empty-todo-cell" onClick={(e) => { e.stopPropagation(); onOpenDrawer(inv.id, 'todos'); }}>
                                                                <span className="empty-cell" style={{ cursor: 'pointer' }}>Add to-do...</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            }

                                            // Stage — colored pill
                                            if (col.key === 'stage') {
                                                return (
                                                    <td key={col.key} className="stage-pill-td">
                                                        <StagePill
                                                            value={inv.stage}
                                                            options={col.options}
                                                            onChange={(v) => handleUpdateField(inv.id, 'stage', v)}
                                                        />
                                                    </td>
                                                );
                                            }

                                            // Default editable cell
                                            return (
                                                <td key={col.key}>
                                                    <EditableCell
                                                        value={inv[col.key]}
                                                        type={col.type}
                                                        options={col.options}
                                                        onChange={(v) => handleUpdateField(inv.id, col.key, v)}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {showExcelModal && (
                    <ExcelUploadModal
                        onClose={() => setShowExcelModal(false)}
                        onSave={onUpdate}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
