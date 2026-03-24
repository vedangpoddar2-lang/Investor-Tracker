import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, User, AlertTriangle } from 'lucide-react';
import { getAllTodos, getInvestor, updateTodo, deleteTodo, getInvestors } from '../data/store';
import './TodoView.css';

export default function TodoView({ onOpenDrawer, refreshKey, onUpdate }) {
    const [rawTodos, setRawTodos] = useState([]);
    const [rawInvestors, setRawInvestors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [tds, invs] = await Promise.all([
                    getAllTodos(),
                    getInvestors()
                ]);
                setRawTodos(tds);
                setRawInvestors(invs);
            } catch (err) {
                console.error('Failed to load todos:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [refreshKey]);

    const todos = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        return rawTodos.map((todo) => {
            const investor = rawInvestors.find(i => i.id === todo.investor_id);
            return {
                ...todo,
                investorName: investor?.name || 'Unknown',
                investorFund: investor?.fund || '',
                isOverdue: !todo.done && todo.due_date && todo.due_date < today,
            };
        });
    }, [rawTodos, rawInvestors]);

    const openTodos = todos.filter((t) => !t.done);
    const doneTodos = todos.filter((t) => t.done);

    const handleToggle = async (id, done) => {
        await updateTodo(id, { done: !done });
        if (onUpdate) onUpdate();
    };

    const handleDelete = async (id) => {
        await deleteTodo(id);
        if (onUpdate) onUpdate();
    };

    if (loading && rawTodos.length === 0) {
        return <div className="todo-loading">Loading to-dos...</div>;
    }

    return (
        <div className="todo-view">
            <div className="todo-view-header">
                <h3 className="todo-view-title">Open To-Dos</h3>
                <span className="todo-view-count">{openTodos.length} open · {doneTodos.length} done</span>
            </div>

            {openTodos.length === 0 && doneTodos.length === 0 ? (
                <div className="empty-state">
                    <Check size={40} />
                    <p>No to-dos yet. Open an investor and add tasks.</p>
                </div>
            ) : (
                <>
                    <div className="todo-list">
                        {openTodos.map((todo, idx) => (
                            <motion.div
                                key={todo.id}
                                className={`todo-row ${todo.isOverdue ? 'todo-overdue' : ''}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.02 }}
                            >
                                <div className="checkbox-wrapper" onClick={() => handleToggle(todo.id, todo.done)}>
                                    <input type="checkbox" checked={todo.done} readOnly />
                                </div>
                                <div className="todo-row-content">
                                    <span className="todo-row-text">{todo.text}</span>
                                    <span
                                        className="todo-row-investor"
                                        onClick={() => onOpenDrawer(todo.investor_id)}
                                    >
                                        <User size={10} /> {todo.investorName}
                                        {todo.investorFund ? ` · ${todo.investorFund}` : ''}
                                    </span>
                                </div>
                                <div className="todo-row-meta">
                                    {todo.isOverdue && <AlertTriangle size={14} className="todo-overdue-icon" />}
                                    {todo.due_date && (
                                        <span className={`todo-row-due ${todo.isOverdue ? 'overdue' : ''}`}>
                                            <Clock size={10} /> {todo.due_date}
                                        </span>
                                    )}
                                    {todo.action_owner && (
                                        <span className="todo-row-due" style={{ color: 'var(--accent-primary)' }}>
                                            👤 {todo.action_owner}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {doneTodos.length > 0 && (
                        <>
                            <div className="todo-divider">Completed ({doneTodos.length})</div>
                            <div className="todo-list todo-list-done">
                                {doneTodos.map((todo) => (
                                    <div key={todo.id} className="todo-row todo-done">
                                        <div className="checkbox-wrapper" onClick={() => handleToggle(todo.id, todo.done)}>
                                            <input type="checkbox" checked={todo.done} readOnly />
                                        </div>
                                        <div className="todo-row-content">
                                            <span className="todo-row-text">{todo.text}</span>
                                            <span className="todo-row-investor" onClick={() => onOpenDrawer(todo.investor_id)}>
                                                <User size={10} /> {todo.investorName}
                                            </span>
                                        </div>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(todo.id)}>
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

