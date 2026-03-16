import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, User, AlertTriangle } from 'lucide-react';
import { getAllTodos, getInvestor, updateTodo, deleteTodo } from '../data/store';
import './TodoView.css';

export default function TodoView({ onOpenDrawer, refreshKey, onUpdate }) {
    const todos = useMemo(() => {
        const all = getAllTodos();
        const today = new Date().toISOString().split('T')[0];

        return all.map((todo) => {
            const investor = getInvestor(todo.investorId);
            return {
                ...todo,
                investorName: investor?.name || 'Unknown',
                investorFund: investor?.fund || '',
                isOverdue: !todo.done && todo.dueDate && todo.dueDate < today,
            };
        });
    }, [refreshKey]);

    const openTodos = todos.filter((t) => !t.done);
    const doneTodos = todos.filter((t) => t.done);

    const handleToggle = (id, done) => {
        updateTodo(id, { done: !done });
        onUpdate();
    };

    const handleDelete = (id) => {
        deleteTodo(id);
        onUpdate();
    };

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
                                        onClick={() => onOpenDrawer(todo.investorId)}
                                    >
                                        <User size={10} /> {todo.investorName}
                                        {todo.investorFund ? ` · ${todo.investorFund}` : ''}
                                    </span>
                                </div>
                                <div className="todo-row-meta">
                                    {todo.isOverdue && <AlertTriangle size={14} className="todo-overdue-icon" />}
                                    {todo.dueDate && (
                                        <span className={`todo-row-due ${todo.isOverdue ? 'overdue' : ''}`}>
                                            <Clock size={10} /> {todo.dueDate}
                                        </span>
                                    )}
                                    {todo.actionOwner && (
                                        <span className="todo-row-due" style={{ color: 'var(--accent-primary)' }}>
                                            👤 {todo.actionOwner}
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
                                            <span className="todo-row-investor" onClick={() => onOpenDrawer(todo.investorId)}>
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
