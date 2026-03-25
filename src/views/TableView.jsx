import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, MessageSquarePlus } from 'lucide-react';
import { getInvestors, getAllInteractions, getAllTodos, getDaysSinceContact, updateInvestor, STAGES, NDA_STATUSES, INFO_SHARED_STATUSES, ENTITIES, FOLLOW_UP_STATUSES } from '../data/store';
import { exportCSV } from '../utils/export';
import ExcelUploadModal from '../components/ExcelUploadModal';
import SearchFilter from '../components/SearchFilter';
import './TableView.css';

// Stage color mapping - Muted & Professional (Linear style)
const STAGE_COLORS = {
    'Not Contacted': '#71717A',
    'Contacted': '#3B82F6',
    'Intro Call': '#8B5CF6',
    'NDA Shared': '#D97706',
    'Deck Shared': '#52A06E',
    'Term Sheet': '#10B981',
    'Closed / Dropped': '#E11D48'
};

function Tooltip({ content, show, x, y }) {
    if (!show || !content) return null;
    return (
        <div className="custom-tooltip" style={{ top: y, left: x }}>
            {content}
        </div>
    );
}

function StagePill({ value, options, onChange }) {
    const color = STAGE_COLORS[value] || '#71717A';

    return (
        <div className="status-pill-box" style={{ '--pill-color': color, '--pill-bg': `${color}14` }}>
            <div className="status-dot"></div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="status-select"
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

function EditableCell({ value, type = 'text', options = [], onChange, onTextMeasure }) {
    const [isEditing, setIsEditing] = useState(false);
    const [val, setVal] = useState(value || '');

    useEffect(() => {
        setVal(value || '');
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (val !== (value || '')) onChange(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleBlur();
        if (e.key === 'Escape') {
            setVal(value || '');
            setIsEditing(false);
        }
    };

    const handleMouseEnter = (e) => {
        const target = e.currentTarget;
        if (target.scrollWidth > target.clientWidth) {
            onTextMeasure(value, e.clientX, e.clientY);
        }
    };

    if (type === 'select') {
        const isAffirmative = val === 'Executed' || val === 'Yes';
        const isNegative = val === 'Not Sent' || val === 'No';
        const wrapperClass = isAffirmative ? 'bg-affirmative-box' : isNegative ? 'bg-negative-box' : '';

        return (
            <div className={wrapperClass}>
                <select
                    value={val}
                    onChange={(e) => { setVal(e.target.value); onChange(e.target.value); }}
                    className="status-select"
                >
                    <option value="">—</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        );
    }

    if (type === 'date') {
        const displayDate = val ? new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
        return (
            <div className="date-cell" onClick={(e) => e.currentTarget.querySelector('input').showPicker()}>
                <input
                    type="date"
                    value={val}
                    onChange={(e) => { setVal(e.target.value); onChange(e.target.value); }}
                    className="date-input-hidden"
                />
                <span className="date-display">{displayDate}</span>
            </div>
        );
    }

    if (isEditing) {
        return (
            <input
                autoFocus
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="inline-input"
            />
        );
    }

    return (
        <div
            className={`cell-display ${val ? '' : 'empty-cell'}`}
            onClick={() => setIsEditing(true)}
            onMouseEnter={handleMouseEnter}
        >
            {val || '—'}
        </div>
    );
}

const DEFAULT_COLUMNS = [
    { key: 'name', label: 'Investor', type: 'text', width: 200 },
    { key: 'primary_contact', label: 'Contact', type: 'text', width: 140 },
    { key: 'contact_designation', label: 'Designation', type: 'text', width: 140 },
    { key: 'entity', label: 'Reached By', type: 'select', options: ENTITIES, width: 110 },
    { key: 'stage', label: 'Status', type: 'stage', options: STAGES, width: 160 },
    { key: 'nda_status', label: 'NDA Status', type: 'select', options: NDA_STATUSES, width: 135 },
    { key: 'info_shared', label: 'Info Shared', type: 'select', options: INFO_SHARED_STATUSES, width: 125 },
    { key: 'first_outreach_date', label: 'First Outreach', type: 'date', width: 130 },
    { key: 'daysSince', label: 'Days Since', type: 'readonly', width: 90 },
    { key: 'last_interaction_date', label: 'Last Interaction', type: 'date', width: 130 },
    { key: 'key_discussion_point', label: 'Key Discussion Point', type: 'text', width: 220 },
    { key: 'pending_to_dos', label: 'Pending To Dos', type: 'todos', width: 220 },
    { key: 'action_owner', label: 'Action Owner', type: 'readonly', width: 130 },
    { key: 'action_pending_from', label: 'Action Pending From', type: 'text', width: 160 },
    { key: 'next_follow_up_date', label: 'Next Follow Up', type: 'date', width: 130 },
    { key: 'follow_up_status', label: 'Follow Up Status', type: 'followup', options: FOLLOW_UP_STATUSES, width: 140 },
    { key: 'remarks', label: 'Remarks', type: 'text', width: 200 },
];

// Bump this when adding/removing columns to force a localStorage reset
const COLUMN_SCHEMA_VERSION = '3';

export default function TableView({ filters, onOpenDrawer, onOpenModal, onQuickLog, refreshKey, onUpdate, setShowExcelModal, selectedIds, setSelectedIds }) {
    const [sortCol, setSortCol] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [rawInvestors, setRawInvestors] = useState([]);
    const [rawInteractions, setRawInteractions] = useState([]);
    const [rawTodos, setRawTodos] = useState([]);
    const [loading, setLoading] = useState(true);


    // Advanced Table States
    const [columnWidths, setColumnWidths] = useState(() => {
        if (localStorage.getItem('apex_col_version') !== COLUMN_SCHEMA_VERSION) {
            localStorage.removeItem('apex_table_widths');
            localStorage.removeItem('apex_table_order');
            localStorage.setItem('apex_col_version', COLUMN_SCHEMA_VERSION);
        }
        const saved = localStorage.getItem('apex_table_widths');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: col.width }), {});
    });
    const [columnOrder, setColumnOrder] = useState(() => {
        const defaultKeys = DEFAULT_COLUMNS.map(c => c.key);
        const saved = localStorage.getItem('apex_table_order');
        if (!saved) return defaultKeys;
        const savedOrder = JSON.parse(saved);
        const newCols = defaultKeys.filter(k => !savedOrder.includes(k));
        return [...savedOrder, ...newCols];
    });
    const [tooltip, setTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

    useEffect(() => {
        localStorage.setItem('apex_table_widths', JSON.stringify(columnWidths));
    }, [columnWidths]);

    useEffect(() => {
        localStorage.setItem('apex_table_order', JSON.stringify(columnOrder));
    }, [columnOrder]);

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

    // Auto-compute follow_up_status from next_follow_up_date if not manually set
    const computeFollowUpStatus = (inv) => {
        if (inv.follow_up_status) return inv.follow_up_status; // manual override wins
        if (!inv.next_follow_up_date) return 'Pending';
        const today = new Date().toISOString().split('T')[0];
        return today > inv.next_follow_up_date ? 'Follow Up' : 'Pending';
    };

    const investors = useMemo(() => {
        let list = rawInvestors.map((inv) => {
            const ixs = rawInteractions.filter((i) => i.investor_id === inv.id);
            const pendingTodos = rawTodos.filter((t) => t.investor_id === inv.id && !t.done);
            const owners = [...new Set(pendingTodos.map((t) => t.action_owner).filter(Boolean))].join(', ');
            return {
                ...inv,
                daysSince: getDaysSinceContact(inv),
                interactionCount: ixs.length,
                _pendingTodosCount: pendingTodos.length,
                _pendingTodosText: pendingTodos.map(t => t.text).join(', '),
                _computedFollowUp: computeFollowUpStatus(inv),
                action_owner: owners, // Auto-computed from open todos
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

    const handleResize = (key, startX) => {
        const onMouseMove = (moveEvent) => {
            const diff = moveEvent.clientX - startX;
            setColumnWidths(prev => ({
                ...prev,
                [key]: Math.max(80, (prev[key] || 150) + diff)
            }));
            startX = moveEvent.clientX; // Update startX for smoother movement
        };
        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === investors.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(investors.map(i => i.id)));
        }
    };

    const toggleSelectOne = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleDragStart = (e, key) => {
        e.dataTransfer.setData('colKey', key);
    };

    const handleDrop = (e, targetKey) => {
        const draggedKey = e.dataTransfer.getData('colKey');
        if (draggedKey === targetKey) return;

        const newOrder = [...columnOrder];
        const draggedIdx = newOrder.indexOf(draggedKey);
        const targetIdx = newOrder.indexOf(targetKey);
        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedKey);
        setColumnOrder(newOrder);
    };

    const staleClass = (days) => {
        if (days >= 16) return 'stale-critical';
        if (days >= 11) return 'stale-orange';
        if (days >= 6) return 'stale-yellow';
        return 'stale-none'; // < 6 days = green
    };

    const orderedColumns = columnOrder.map(key => DEFAULT_COLUMNS.find(c => c.key === key)).filter(Boolean);

    if (loading && rawInvestors.length === 0) {
        return <div className="loading-state">Loading data from Supabase...</div>;
    }

    return (
        <div className="table-view">

            <div className="table-wrapper" onMouseLeave={() => setTooltip({ show: false })}>
                <table className="spreadsheet-table" style={{ width: 'max-content' }}>
                    <thead>
                        <tr>
                            <th style={{ width: 40, padding: '0 10px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size > 0 && selectedIds.size === investors.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            {orderedColumns.map((col) => (
                                <th
                                    key={col.key}
                                    style={{ width: columnWidths[col.key] || col.width }}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, col.key)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => handleDrop(e, col.key)}
                                >
                                    <div className="th-content" onClick={() => handleSort(col.key)}>
                                        <span className="th-label">{col.label}</span>
                                        {sortCol === col.key && (
                                            <ArrowUpDown size={10} className={`sort-icon ${sortDir}`} />
                                        )}
                                    </div>
                                    <div
                                        className="resizer"
                                        onMouseDown={(e) => { e.stopPropagation(); handleResize(col.key, e.clientX); }}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <AnimatePresence>
                            {investors.map((inv, idx) => (
                                <motion.tr
                                    key={inv.id}
                                    className={`data-row ${selectedIds.has(inv.id) ? 'row-selected' : ''}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: idx * 0.01 }}
                                >
                                    <td style={{ textAlign: 'center', padding: '0 10px' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(inv.id)}
                                            onChange={() => toggleSelectOne(inv.id)}
                                        />
                                    </td>
                                    {orderedColumns.map((col) => {
                                        // Days since — color coded thresholds
                                        if (col.key === 'daysSince') {
                                            const days = inv.daysSince;
                                            return (
                                                <td key={col.key} className={`col-readonly ${staleClass(days)}`}>
                                                    {days < 999 ? days + 'd' : '—'}
                                                </td>
                                            );
                                        }

                                        // Investor name — clickable link
                                        if (col.key === 'name') {
                                            return (
                                                <td key={col.key} className="col-name">
                                                    <span
                                                        className="investor-name-link"
                                                        onClick={() => onOpenDrawer(inv.id)}
                                                    >
                                                        {inv[col.key] || 'Unknown'}
                                                    </span>
                                                </td>
                                            );
                                        }

                                        // Pending To Dos
                                        if (col.key === 'pending_to_dos') {
                                            const hasTodos = inv._pendingTodosCount > 0;
                                            return (
                                                <td key={col.key}>
                                                    {hasTodos ? (
                                                        <div className="todo-cell" onClick={() => onOpenDrawer(inv.id, 'todos')}>
                                                            <span className="todo-count-badge">{inv._pendingTodosCount}</span>
                                                            <span className="todo-preview-text">{inv._pendingTodosText}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="empty-cell" onClick={() => onOpenDrawer(inv.id, 'todos')}>Add...</span>
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

                                        // Follow Up Status — auto-computed, overridable
                                        if (col.key === 'follow_up_status') {
                                            const displayVal = inv._computedFollowUp;
                                            const isFollowUp = displayVal === 'Follow Up';
                                            return (
                                                <td key={col.key} className={isFollowUp ? 'followup-overdue' : 'followup-pending'}>
                                                    <select
                                                        value={displayVal}
                                                        onChange={(e) => handleUpdateField(inv.id, 'follow_up_status', e.target.value)}
                                                        className="status-select"
                                                        style={{ color: isFollowUp ? '#C2410C' : '#15803D', fontWeight: 500 }}
                                                    >
                                                        {col.options.map(o => <option key={o} value={o}>{o}</option>)}
                                                    </select>
                                                </td>
                                            );
                                        }


                                        // Default editable cell
                                        const isAffirmative = (col.key === 'nda_status' && inv[col.key] === 'Executed') ||
                                            (col.key === 'info_shared' && inv[col.key] === 'Yes');

                                        return (
                                            <td key={col.key}>
                                                <EditableCell
                                                    value={inv[col.key]}
                                                    type={col.type}
                                                    options={col.options}
                                                    onChange={(v) => handleUpdateField(inv.id, col.key, v)}
                                                    onTextMeasure={(content, x, y) => setTooltip({ show: true, content, x: x + 10, y: y + 10 })}
                                                />
                                            </td>
                                        );
                                    })}
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            <Tooltip {...tooltip} />

        </div>
    );
}


