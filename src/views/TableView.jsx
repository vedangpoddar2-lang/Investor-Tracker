import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquarePlus, Download, ArrowUpDown, Check, X as XIcon, Share2, Shield } from 'lucide-react';
import { getInvestors, getInteractions, getTodos, getDaysSinceContact, getAllInteractions, getAllTodos } from '../data/store';
import { exportCSV } from '../utils/export';
import './TableView.css';

export default function TableView({ filters, onOpenDrawer, onOpenModal, onQuickLog, refreshKey }) {
    const [sortCol, setSortCol] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const investors = useMemo(() => {
        let list = getInvestors();
        const allInteractions = getAllInteractions();
        const allTodos = getAllTodos();

        // Attach derived data
        list = list.map((inv) => {
            const ixs = allInteractions.filter((i) => i.investorId === inv.id).sort((a, b) => new Date(b.date) - new Date(a.date));
            const tds = allTodos.filter((t) => t.investorId === inv.id);
            return {
                ...inv,
                lastContact: ixs[0]?.date || null,
                lastNote: ixs[0]?.notes || '',
                nextTodo: tds.find((t) => !t.done)?.text || '',
                daysSince: getDaysSinceContact(inv.id),
                interactionCount: ixs.length,
            };
        });

        // Filter
        if (filters.search) {
            const q = filters.search.toLowerCase();
            list = list.filter(
                (inv) =>
                    inv.name.toLowerCase().includes(q) ||
                    inv.fund.toLowerCase().includes(q) ||
                    inv.lastNote.toLowerCase().includes(q) ||
                    inv.nextTodo.toLowerCase().includes(q) ||
                    (inv.tags || []).some((t) => t.toLowerCase().includes(q))
            );
        }
        if (filters.entity) list = list.filter((i) => i.entity === filters.entity);
        if (filters.stage) list = list.filter((i) => i.stage === filters.stage);
        if (filters.nda === 'true') list = list.filter((i) => i.ndaSigned);
        if (filters.nda === 'false') list = list.filter((i) => !i.ndaSigned);
        if (filters.tag) list = list.filter((i) => (i.tags || []).includes(filters.tag));

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
    }, [filters, sortCol, sortDir, refreshKey]);

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    const columns = [
        { key: 'name', label: 'Investor' },
        { key: 'fund', label: 'Fund' },
        { key: 'entity', label: 'Entity' },
        { key: 'investorType', label: 'Type' },
        { key: 'stage', label: 'Stage' },
        { key: 'daysSince', label: 'Last Contact' },
        { key: 'ndaSigned', label: 'NDA' },
        { key: 'infoShared', label: 'Info' },
        { key: 'lastNote', label: 'Last Note' },
        { key: 'nextTodo', label: 'Next To-Do' },
        { key: 'actions', label: '' },
    ];

    const staleClass = (days) => {
        if (days >= 14) return 'row-stale-danger';
        if (days >= 7) return 'row-stale-warning';
        return '';
    };

    return (
        <div className="table-view">
            <div className="table-actions">
                <button className="btn btn-primary" onClick={onOpenModal}>
                    <Plus size={16} /> Add Investor
                </button>
                <button className="btn btn-secondary" onClick={() => exportCSV(investors)}>
                    <Download size={14} /> Export CSV
                </button>
                <span className="table-count">{investors.length} investor{investors.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={col.key === 'actions' ? 'col-actions' : `col-${col.key}`}
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
                                        No investors found. Add your first one!
                                    </td>
                                </tr>
                            ) : (
                                investors.map((inv, idx) => {
                                    const stageClass = inv.stage.toLowerCase().replace(/\s+/g, '-');
                                    const entityClass = inv.entity.toLowerCase();
                                    return (
                                        <motion.tr
                                            key={inv.id}
                                            className={`data-row ${staleClass(inv.daysSince)}`}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ delay: idx * 0.02 }}
                                            layout
                                        >
                                            <td className="col-name" onClick={() => onOpenDrawer(inv.id)}>
                                                <span className="investor-name">{inv.name}</span>
                                                {inv.interactionCount > 0 && (
                                                    <span className="interaction-count">{inv.interactionCount} notes</span>
                                                )}
                                            </td>
                                            <td className="col-fund">{inv.fund || '—'}</td>
                                            <td><span className={`badge badge-${entityClass}`}>{inv.entity}</span></td>
                                            <td className="col-type">{inv.investorType || '—'}</td>
                                            <td><span className={`badge badge-stage badge-${stageClass}`}>{inv.stage}</span></td>
                                            <td className="col-contact">
                                                {inv.lastContact ? (
                                                    <span>{new Date(inv.lastContact).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        <span className="days-ago">{inv.daysSince}d</span>
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td className="col-bool">
                                                {inv.ndaSigned ?
                                                    <Check size={16} className="bool-yes" /> :
                                                    <XIcon size={14} className="bool-no" />}
                                            </td>
                                            <td className="col-bool">
                                                {inv.infoShared ?
                                                    <Check size={16} className="bool-yes" /> :
                                                    <XIcon size={14} className="bool-no" />}
                                            </td>
                                            <td className="col-note">
                                                <span className="note-snippet">{inv.lastNote ? inv.lastNote.slice(0, 60) + (inv.lastNote.length > 60 ? '…' : '') : '—'}</span>
                                            </td>
                                            <td className="col-todo">
                                                <span className="todo-snippet">{inv.nextTodo || '—'}</span>
                                            </td>
                                            <td className="col-actions">
                                                <button className="btn btn-ghost btn-icon btn-sm" title="Quick log"
                                                    onClick={(e) => { e.stopPropagation(); onQuickLog(inv.id, inv.name); }}>
                                                    <MessageSquarePlus size={14} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
