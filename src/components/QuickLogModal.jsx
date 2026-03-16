import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar } from 'lucide-react';
import { addInteraction } from '../data/store';

export default function QuickLogModal({ investorId, investorName, onClose, onSave }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!notes.trim()) return;
        addInteraction(investorId, { date, notes: notes.trim() });
        onSave();
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                className="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            />
            <motion.div
                className="modal"
                style={{ width: 440 }}
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="modal-header">
                    <h2>Log Interaction — {investorName}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="date"
                                    className="input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="textarea"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="What was discussed? Key takeaways, next steps..."
                                autoFocus
                                rows={4}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={!notes.trim()}>Save Note</button>
                    </div>
                </form>
            </motion.div>
        </AnimatePresence>
    );
}
