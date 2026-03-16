import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { addInvestor, updateInvestor, STAGES, ENTITIES, INVESTOR_TYPES, NDA_STATUSES, INFO_SHARED_STATUSES } from '../data/store';
import TagInput from './TagInput';

export default function InvestorModal({ investor, onClose, onSave }) {
    const isEdit = !!investor;
    const [form, setForm] = useState({
        name: investor?.name || '',
        fund: investor?.fund || '',
        entity: investor?.entity || 'Apex',
        stage: investor?.stage || 'Lead',
        investorType: investor?.investorType || '',
        checkSize: investor?.checkSize || '',
        introSource: investor?.introSource || '',
        tags: investor?.tags || [],
        ndaStatus: investor?.ndaStatus || '',
        infoShared: investor?.infoShared || '',
        primaryContact: investor?.primaryContact || '',
        contactDesignation: investor?.contactDesignation || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        if (isEdit) {
            updateInvestor(investor.id, form);
        } else {
            addInvestor(form);
        }
        onSave();
        onClose();
    };

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
                <div className="modal-header">
                    <h2>{isEdit ? 'Edit Investor' : 'Add Investor'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Investor / Contact Name *</label>
                                <input
                                    className="input"
                                    value={form.name}
                                    onChange={(e) => update('name', e.target.value)}
                                    placeholder="e.g. John Smith"
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fund / Firm</label>
                                <input
                                    className="input"
                                    value={form.fund}
                                    onChange={(e) => update('fund', e.target.value)}
                                    placeholder="e.g. Sequoia Capital"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Primary Contact</label>
                                <input
                                    className="input"
                                    value={form.primaryContact}
                                    onChange={(e) => update('primaryContact', e.target.value)}
                                    placeholder="e.g. Jane Doe"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Designation</label>
                                <input
                                    className="input"
                                    value={form.contactDesignation}
                                    onChange={(e) => update('contactDesignation', e.target.value)}
                                    placeholder="e.g. Managing Partner"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Entity</label>
                                <select className="select" value={form.entity} onChange={(e) => update('entity', e.target.value)}>
                                    {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Current Status</label>
                                <select className="select" value={form.stage} onChange={(e) => update('stage', e.target.value)}>
                                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">NDA Status</label>
                                <select className="select" value={form.ndaStatus} onChange={(e) => update('ndaStatus', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {NDA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Info Shared</label>
                                <select className="select" value={form.infoShared} onChange={(e) => update('infoShared', e.target.value)}>
                                    <option value="">— Select —</option>
                                    {INFO_SHARED_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Investor Type</label>
                                <select className="select" value={form.investorType} onChange={(e) => update('investorType', e.target.value)}>
                                    <option value="">Select...</option>
                                    {INVESTOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Check Size</label>
                                <input
                                    className="input"
                                    value={form.checkSize}
                                    onChange={(e) => update('checkSize', e.target.value)}
                                    placeholder="e.g. $5-10M"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Intro Source</label>
                            <input
                                className="input"
                                value={form.introSource}
                                onChange={(e) => update('introSource', e.target.value)}
                                placeholder="e.g. Warm intro via Alex"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Tags</label>
                            <TagInput tags={form.tags} onChange={(tags) => update('tags', tags)} />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={!form.name.trim()}>
                            {isEdit ? 'Save Changes' : 'Add Investor'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </AnimatePresence>
    );
}
