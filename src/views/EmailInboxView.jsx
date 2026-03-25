import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { updateInvestor, getInvestors } from '../data/store';
import { Mail, Check, X, RefreshCw, Link2, AlertCircle, ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import './EmailInboxView.css';

const CONFIDENCE_LABEL = (c) => {
    if (c >= 0.85) return { label: 'High', color: '#10B981' };
    if (c >= 0.6) return { label: 'Medium', color: '#D97706' };
    return { label: 'Low', color: '#E11D48' };
};

function SuggestionCard({ suggestion, onApprove, onReject, investors }) {
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState({
        matched_investor_name: suggestion.matched_investor_name || '',
        extracted_status: suggestion.extracted_status || '',
        extracted_discussion_point: suggestion.extracted_discussion_point || '',
        extracted_date: suggestion.extracted_date || '',
    });
    const [loading, setLoading] = useState(false);
    const conf = CONFIDENCE_LABEL(suggestion.confidence || 0);

    const handleApprove = async () => {
        setLoading(true);
        await onApprove(suggestion, editing);
        setLoading(false);
    };

    return (
        <motion.div
            className="suggestion-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            layout
        >
            <div className="suggestion-header">
                <div className="suggestion-meta">
                    <div className="suggestion-from">
                        <Mail size={13} />
                        <span>{suggestion.email_from}</span>
                    </div>
                    <div className="suggestion-subject">{suggestion.email_subject}</div>
                    <div className="suggestion-date">{suggestion.email_date}</div>
                </div>
                <div className="suggestion-badges">
                    <span className="conf-badge" style={{ color: conf.color, borderColor: conf.color }}>
                        {conf.label} confidence
                    </span>
                    <button className="expand-btn" onClick={() => setExpanded(e => !e)}>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* AI Extracted Fields */}
            <div className="suggestion-fields">
                <div className="field-row">
                    <label>Investor</label>
                    <select
                        value={editing.matched_investor_name}
                        onChange={e => setEditing(prev => ({ ...prev, matched_investor_name: e.target.value }))}
                        className="field-select"
                    >
                        <option value="">— Not matched —</option>
                        {investors.map(inv => (
                            <option key={inv.id} value={inv.name}>{inv.name}</option>
                        ))}
                    </select>
                </div>
                <div className="field-row">
                    <label>Status Update</label>
                    <select
                        value={editing.extracted_status}
                        onChange={e => setEditing(prev => ({ ...prev, extracted_status: e.target.value }))}
                        className="field-select"
                    >
                        <option value="">— No change —</option>
                        {['Not Contacted', 'Contacted', 'Intro Call', 'NDA Shared', 'Deck Shared', 'Term Sheet', 'Closed / Dropped'].map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
                <div className="field-row">
                    <label>Discussion Point</label>
                    <input
                        className="field-input"
                        value={editing.extracted_discussion_point}
                        onChange={e => setEditing(prev => ({ ...prev, extracted_discussion_point: e.target.value }))}
                        placeholder="Key discussion point..."
                    />
                </div>
                <div className="field-row">
                    <label>Date</label>
                    <input
                        className="field-input"
                        type="date"
                        value={editing.extracted_date}
                        onChange={e => setEditing(prev => ({ ...prev, extracted_date: e.target.value }))}
                    />
                </div>
            </div>

            {/* Email snippet */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        className="suggestion-snippet"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <p>{suggestion.email_snippet}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="suggestion-actions">
                <button className="btn-reject" onClick={() => onReject(suggestion)} disabled={loading}>
                    <X size={14} /> Reject
                </button>
                <button
                    className="btn-approve"
                    onClick={handleApprove}
                    disabled={loading || !editing.matched_investor_name}
                >
                    <Check size={14} /> {loading ? 'Saving...' : 'Approve & Update'}
                </button>
            </div>
        </motion.div>
    );
}

export default function EmailInboxView({ onUpdate }) {
    const [suggestions, setSuggestions] = useState([]);
    const [investors, setInvestors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [connected, setConnected] = useState(null); // null = checking

    useEffect(() => {
        loadData();
        checkConnection();
    }, []);

    const checkConnection = async () => {
        const { data } = await supabase
            .from('email_tokens')
            .select('id, expires_at')
            .eq('id', 'outlook_token')
            .single();
        setConnected(!!data);
    };

    const loadData = async () => {
        setLoading(true);
        const [{ data: sug }, invs] = await Promise.all([
            supabase
                .from('email_suggestions')
                .select('*')
                .eq('status', 'pending')
                .order('email_date', { ascending: false }),
            getInvestors(),
        ]);
        setSuggestions(sug || []);
        setInvestors(invs || []);
        setLoading(false);
    };

    const handleConnect = () => {
        window.location.href = '/api/auth/microsoft';
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/email-sync', { method: 'POST' });
            const data = await res.json();
            setSyncResult(data);
            await loadData();
        } catch (err) {
            setSyncResult({ error: err.message });
        } finally {
            setSyncing(false);
        }
    };

    const handleApprove = async (suggestion, edits) => {
        // Find matched investor
        const investor = investors.find(inv =>
            inv.name.toLowerCase() === edits.matched_investor_name.toLowerCase()
        );

        if (!investor) return;

        // Build update payload
        const updates = {};
        if (edits.extracted_status) updates.stage = edits.extracted_status;
        if (edits.extracted_discussion_point) updates.key_discussion_point = edits.extracted_discussion_point;
        if (edits.extracted_date) updates.last_interaction_date = edits.extracted_date;

        // Update investor record
        await updateInvestor(investor.id, updates);

        // Mark suggestion as approved
        await supabase
            .from('email_suggestions')
            .update({ status: 'approved' })
            .eq('id', suggestion.id);

        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        if (onUpdate) onUpdate();
    };

    const handleReject = async (suggestion) => {
        await supabase
            .from('email_suggestions')
            .update({ status: 'rejected' })
            .eq('id', suggestion.id);

        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    };

    return (
        <div className="email-inbox-view">
            {/* Header */}
            <div className="inbox-header">
                <div className="inbox-title">
                    <Inbox size={18} />
                    <h2>Email Inbox</h2>
                    {suggestions.length > 0 && (
                        <span className="pending-count">{suggestions.length} pending</span>
                    )}
                </div>
                <div className="inbox-actions">
                    {connected === false && (
                        <button className="btn-connect" onClick={handleConnect}>
                            <Link2 size={14} /> Connect Outlook
                        </button>
                    )}
                    {connected && (
                        <button className="btn-sync" onClick={handleSync} disabled={syncing}>
                            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    )}
                </div>
            </div>

            {/* Sync result banner */}
            {syncResult && (
                <div className={`sync-banner ${syncResult.error ? 'sync-error' : 'sync-success'}`}>
                    {syncResult.error ? (
                        <><AlertCircle size={14} /> Error: {syncResult.error}</>
                    ) : (
                        <><Check size={14} /> Processed {syncResult.processed} emails — found {syncResult.investor_related} investor-related</>
                    )}
                </div>
            )}

            {/* Not connected prompt */}
            {connected === false && (
                <div className="connect-prompt">
                    <Mail size={40} />
                    <h3>Connect your Outlook</h3>
                    <p>
                        Connect your work Outlook account to automatically scan emails for investor updates.
                        The AI will identify relevant threads and suggest tracker updates for your approval.
                    </p>
                    <button className="btn-connect-large" onClick={handleConnect}>
                        <Link2 size={16} /> Connect Outlook Account
                    </button>
                </div>
            )}

            {/* Suggestions list */}
            {connected && (
                <>
                    {loading ? (
                        <div className="inbox-loading">Loading suggestions...</div>
                    ) : suggestions.length === 0 ? (
                        <div className="inbox-empty">
                            <Check size={32} />
                            <h3>All caught up!</h3>
                            <p>No pending email suggestions. Click "Sync Now" to scan for new emails.</p>
                        </div>
                    ) : (
                        <div className="suggestions-list">
                            <p className="inbox-hint">
                                Review each AI-extracted update. Edit any field before approving.
                            </p>
                            <AnimatePresence>
                                {suggestions.map(s => (
                                    <SuggestionCard
                                        key={s.id}
                                        suggestion={s}
                                        investors={investors}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
