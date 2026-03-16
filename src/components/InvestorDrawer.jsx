import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Clock, CheckSquare, Edit3, MessageSquare } from 'lucide-react';
import {
    getInvestor, updateInvestor, deleteInvestor,
    getInteractions, addInteraction, deleteInteraction,
    getTodos, addTodo, updateTodo, deleteTodo,
    STAGES, ENTITIES, INVESTOR_TYPES, getDaysSinceContact
} from '../data/store';
import TagInput from './TagInput';
import './InvestorDrawer.css';

export default function InvestorDrawer({ investorId, onClose, onUpdate, onDelete }) {
    const [investor, setInvestor] = useState(null);
    const [interactions, setInteractions] = useState([]);
    const [todos, setTodos] = useState([]);
    const [newNote, setNewNote] = useState('');
    const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);
    const [newTodoText, setNewTodoText] = useState('');
    const [newTodoDue, setNewTodoDue] = useState('');
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const drawerRef = useRef(null);

    const refresh = () => {
        const inv = getInvestor(investorId);
        if (!inv) { onClose(); return; }
        setInvestor(inv);
        setInteractions(getInteractions(investorId));
        setTodos(getTodos(investorId));
    };

    useEffect(() => { refresh(); }, [investorId]);

    const handleAddInteraction = (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        addInteraction(investorId, { date: newNoteDate, notes: newNote.trim() });
        setNewNote('');
        setNewNoteDate(new Date().toISOString().split('T')[0]);
        refresh();
        onUpdate();
    };

    const handleAddTodo = (e) => {
        e.preventDefault();
        if (!newTodoText.trim()) return;
        addTodo(investorId, { text: newTodoText.trim(), dueDate: newTodoDue });
        setNewTodoText('');
        setNewTodoDue('');
        refresh();
        onUpdate();
    };

    const handleToggleTodo = (id, done) => {
        updateTodo(id, { done: !done });
        refresh();
        onUpdate();
    };

    const handleDeleteInteraction = (id) => {
        deleteInteraction(id);
        refresh();
        onUpdate();
    };

    const handleDeleteTodo = (id) => {
        deleteTodo(id);
        refresh();
        onUpdate();
    };

    const handleDeleteInvestor = () => {
        deleteInvestor(investorId);
        onDelete();
        onClose();
    };

    const startEdit = () => {
        setEditForm({
            name: investor.name, fund: investor.fund, entity: investor.entity,
            stage: investor.stage, investorType: investor.investorType,
            checkSize: investor.checkSize, introSource: investor.introSource,
            tags: investor.tags || [], ndaSigned: investor.ndaSigned, infoShared: investor.infoShared,
        });
        setEditing(true);
    };

    const saveEdit = () => {
        updateInvestor(investorId, editForm);
        setEditing(false);
        refresh();
        onUpdate();
    };

    if (!investor) return null;

    const daysSince = getDaysSinceContact(investorId);
    const staleClass = daysSince >= 14 ? 'stale-danger' : daysSince >= 7 ? 'stale-warning' : '';
    const stageClass = investor.stage.toLowerCase().replace(/\s+/g, '-');
    const entityClass = investor.entity.toLowerCase();

    return (
        <>
            <motion.div
                className="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="drawer"
                ref={drawerRef}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
                {/* Header */}
                <div className="drawer-header">
                    <div className="drawer-header-info">
                        {editing ? (
                            <input className="input drawer-name-input" value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
                        ) : (
                            <h2 className="drawer-name">{investor.name}</h2>
                        )}
                        {editing ? (
                            <input className="input" value={editForm.fund} placeholder="Fund / Firm"
                                onChange={(e) => setEditForm({ ...editForm, fund: e.target.value })}
                                style={{ fontSize: 'var(--font-sm)', marginTop: '4px' }} />
                        ) : (
                            investor.fund && <p className="drawer-fund">{investor.fund}</p>
                        )}
                        <div className="drawer-badges">
                            <span className={`badge badge-${entityClass}`}>{investor.entity}</span>
                            <span className={`badge badge-stage badge-${stageClass}`}>{investor.stage}</span>
                            {staleClass && (
                                <span className={`badge badge-stale ${staleClass}`}>
                                    <Clock size={10} /> {daysSince}d ago
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="drawer-header-actions">
                        {editing ? (
                            <>
                                <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
                            </>
                        ) : (
                            <button className="btn btn-ghost btn-icon" onClick={startEdit}><Edit3 size={16} /></button>
                        )}
                        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                <div className="drawer-body">
                    {/* Edit details */}
                    {editing && (
                        <div className="drawer-section">
                            <div className="drawer-section-title">Details</div>
                            <div className="drawer-edit-grid">
                                <div className="form-group">
                                    <label className="form-label">Entity</label>
                                    <select className="select" value={editForm.entity}
                                        onChange={(e) => setEditForm({ ...editForm, entity: e.target.value })}>
                                        {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Stage</label>
                                    <select className="select" value={editForm.stage}
                                        onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}>
                                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select className="select" value={editForm.investorType}
                                        onChange={(e) => setEditForm({ ...editForm, investorType: e.target.value })}>
                                        <option value="">Select...</option>
                                        {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Check Size</label>
                                    <input className="input" value={editForm.checkSize}
                                        onChange={(e) => setEditForm({ ...editForm, checkSize: e.target.value })} />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                <label className="form-label">Intro Source</label>
                                <input className="input" value={editForm.introSource}
                                    onChange={(e) => setEditForm({ ...editForm, introSource: e.target.value })} />
                            </div>
                            <div className="form-group" style={{ marginTop: 'var(--space-3)' }}>
                                <label className="form-label">Tags</label>
                                <TagInput tags={editForm.tags}
                                    onChange={(tags) => setEditForm({ ...editForm, tags })} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)' }}>
                                <div className="checkbox-wrapper"
                                    onClick={() => setEditForm({ ...editForm, ndaSigned: !editForm.ndaSigned })}>
                                    <input type="checkbox" checked={editForm.ndaSigned} readOnly />
                                    <span style={{ fontSize: 'var(--font-sm)' }}>NDA Signed</span>
                                </div>
                                <div className="checkbox-wrapper"
                                    onClick={() => setEditForm({ ...editForm, infoShared: !editForm.infoShared })}>
                                    <input type="checkbox" checked={editForm.infoShared} readOnly />
                                    <span style={{ fontSize: 'var(--font-sm)' }}>Info Shared</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick info (view mode) */}
                    {!editing && (
                        <div className="drawer-section">
                            <div className="drawer-meta-grid">
                                {investor.investorType && <div className="meta-item"><span className="meta-label">Type</span><span>{investor.investorType}</span></div>}
                                {investor.checkSize && <div className="meta-item"><span className="meta-label">Check Size</span><span>{investor.checkSize}</span></div>}
                                {investor.introSource && <div className="meta-item"><span className="meta-label">Intro</span><span>{investor.introSource}</span></div>}
                                <div className="meta-item"><span className="meta-label">NDA</span><span>{investor.ndaSigned ? '✅ Signed' : '—'}</span></div>
                                <div className="meta-item"><span className="meta-label">Info</span><span>{investor.infoShared ? '✅ Shared' : '—'}</span></div>
                            </div>
                            {investor.tags?.length > 0 && (
                                <div className="drawer-tags">
                                    {investor.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* To-Dos */}
                    <div className="drawer-section">
                        <div className="drawer-section-title">
                            <CheckSquare size={12} style={{ marginRight: 4 }} /> To-Dos
                        </div>
                        <div className="drawer-todo-list">
                            {todos.map((todo) => (
                                <div key={todo.id} className={`drawer-todo-item ${todo.done ? 'done' : ''}`}>
                                    <div className="checkbox-wrapper" onClick={() => handleToggleTodo(todo.id, todo.done)}>
                                        <input type="checkbox" checked={todo.done} readOnly />
                                    </div>
                                    <div className="drawer-todo-content">
                                        <span className="drawer-todo-text">{todo.text}</span>
                                        {todo.dueDate && (
                                            <span className={`drawer-todo-due ${!todo.done && todo.dueDate < new Date().toISOString().split('T')[0] ? 'overdue' : ''}`}>
                                                {todo.dueDate}
                                            </span>
                                        )}
                                    </div>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteTodo(todo.id)}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <form className="drawer-add-form" onSubmit={handleAddTodo}>
                            <input className="input" value={newTodoText}
                                onChange={(e) => setNewTodoText(e.target.value)}
                                placeholder="Add to-do..." style={{ flex: 1 }} />
                            <input type="date" className="input" value={newTodoDue}
                                onChange={(e) => setNewTodoDue(e.target.value)}
                                style={{ width: 140 }} />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={!newTodoText.trim()}>
                                <Plus size={14} />
                            </button>
                        </form>
                    </div>

                    {/* Interaction Timeline */}
                    <div className="drawer-section">
                        <div className="drawer-section-title">
                            <MessageSquare size={12} style={{ marginRight: 4 }} /> Interaction History ({interactions.length})
                        </div>

                        <form className="drawer-add-form" onSubmit={handleAddInteraction}>
                            <input type="date" className="input" value={newNoteDate}
                                onChange={(e) => setNewNoteDate(e.target.value)}
                                style={{ width: 140 }} />
                            <textarea className="textarea" value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                placeholder="Log a new interaction..."
                                style={{ flex: 1, minHeight: 60 }} />
                            <button type="submit" className="btn btn-primary btn-sm" disabled={!newNote.trim()}
                                style={{ alignSelf: 'flex-end' }}>
                                <Plus size={14} /> Add
                            </button>
                        </form>

                        <div className="drawer-timeline">
                            {interactions.length === 0 ? (
                                <p className="drawer-empty">No interactions yet. Log your first one above.</p>
                            ) : (
                                interactions.map((ix, idx) => (
                                    <motion.div
                                        key={ix.id}
                                        className="timeline-item"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                    >
                                        <div className="timeline-dot"></div>
                                        <div className="timeline-content">
                                            <div className="timeline-date">{new Date(ix.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div className="timeline-notes">{ix.notes}</div>
                                        </div>
                                        <button className="btn btn-ghost btn-icon btn-sm timeline-delete"
                                            onClick={() => handleDeleteInteraction(ix.id)}>
                                            <Trash2 size={12} />
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Danger zone */}
                    <div className="drawer-section drawer-danger">
                        <button className="btn btn-danger btn-sm" onClick={handleDeleteInvestor}>
                            <Trash2 size={14} /> Delete Investor
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
