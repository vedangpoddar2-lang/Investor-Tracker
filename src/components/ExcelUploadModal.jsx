import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, AlertCircle, FileSpreadsheet, ArrowRight, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getInvestors, upsertInvestors, createTodosFromImport } from '../data/store';
import './ExcelUploadModal.css';

const COLUMN_MAPPING = {
    'Investor': 'name',
    'Fund': 'fund',
    'Reached By': 'entity',
    'Primary Contact': 'primary_contact',
    'Designation': 'contact_designation',
    'First Outreach': 'first_outreach_date',
    'Current Status': 'stage',
    'NDA Status': 'nda_status',
    'Info Shared': 'info_shared',
    'Last Interaction': 'last_interaction_date',
    'Key Discussion Point': 'key_discussion_point',
    'Pending To Dos': 'pending_to_dos',
    'Pending To-Dos': 'pending_to_dos',   // alias for hyphenated spelling
    'Action Owner': 'action_owner',
    'Action Pending From': 'action_pending_from',
    'Next Follow-up': 'next_follow_up_date',
    'Follow-up Status': 'follow_up_status',
    'Remarks': 'remarks',
    'Type': 'investor_type'
};

export default function ExcelUploadModal({ onClose, onSave }) {
    const [step, setStep] = useState('upload'); // upload, review
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [parsedRows, setParsedRows] = useState([]);
    const [existingInvestors, setExistingInvestors] = useState([]);
    const [dragging, setDragging] = useState(false);

    useEffect(() => {
        async function load() {
            const data = await getInvestors();
            setExistingInvestors(data);
        }
        load();
    }, []);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        processFile(file);
    };

    const parseExcelDate = (val) => {
        if (!val) return null;
        if (val instanceof Date) return val.toISOString().split('T')[0];

        const str = String(val).trim();
        if (!str) return null;

        // Try standard Date.parse
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

        // Handle dd-mmm-yy (e.g., 24-Mar-24)
        const parts = str.split(/[-/ ]/);
        if (parts.length === 3) {
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            let day = parseInt(parts[0]);
            let monthStr = parts[1].toLowerCase();
            let year = parseInt(parts[2]);

            const monthIdx = months.findIndex(m => monthStr.startsWith(m));
            if (monthIdx !== -1) {
                if (year < 100) year += 2000;
                const finalDate = new Date(year, monthIdx, day);
                if (!isNaN(finalDate.getTime())) return finalDate.toISOString().split('T')[0];
            }
        }
        return str; // Fallback to raw string if parsing fails
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    setError('The file seems to be empty.');
                    return;
                }

                // Map columns — case-insensitive + trimmed matching
                const mapped = data.map((row, idx) => {
                    const obj = { id: `parsed-${idx}` };
                    // Build a lowercase+trimmed key map so column names match regardless of case
                    const rowNorm = Object.fromEntries(
                        Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v])
                    );
                    Object.entries(COLUMN_MAPPING).forEach(([excelCol, dbCol]) => {
                        let val = rowNorm[excelCol.toLowerCase().trim()];
                        if (dbCol.includes('date')) {
                            val = parseExcelDate(val);
                        } else {
                            val = val !== undefined && val !== null ? String(val) : '';
                        }
                        // Don't overwrite an already-set value (handles alias mappings)
                        if (!obj[dbCol]) obj[dbCol] = val;
                    });
                    return obj;
                });

                // Deduplicate / Identify status
                const enriched = mapped.map(row => {
                    const existing = existingInvestors.find(ex => ex.name.toLowerCase() === row.name.toLowerCase());
                    let status = 'new';
                    let diffs = [];

                    if (existing) {
                        status = 'no-change';
                        // Check for changes in important fields
                        Object.keys(COLUMN_MAPPING).forEach(key => {
                            const dbCol = COLUMN_MAPPING[key];
                            if (dbCol === 'name') return;
                            const newVal = String(row[dbCol] || '').trim();
                            const oldVal = String(existing[dbCol] || '').trim();
                            if (newVal && newVal !== oldVal) {
                                status = 'update';
                                diffs.push(dbCol);
                            }
                        });
                    }

                    return { ...row, _status: status, _diffs: diffs, _existingId: existing?.id };
                });

                setParsedRows(enriched);
                setStep('review');
                setError(null);
            } catch (err) {
                console.error('Error parsing excel:', err);
                setError('Failed to parse file. Please ensure it is a valid Excel or CSV.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleFieldChange = (idx, field, value) => {
        const newRows = [...parsedRows];
        newRows[idx][field] = value;

        // Re-evaluate status for this row
        const row = newRows[idx];
        const existing = existingInvestors.find(ex => ex.name.toLowerCase() === row.name.toLowerCase());
        let status = 'new';
        let diffs = [];

        if (existing) {
            status = 'no-change';
            Object.keys(COLUMN_MAPPING).forEach(key => {
                const dbCol = COLUMN_MAPPING[key];
                if (dbCol === 'name') return;
                const newVal = String(row[dbCol] || '').trim();
                const oldVal = String(existing[dbCol] || '').trim();
                if (newVal && newVal !== oldVal) {
                    status = 'update';
                    diffs.push(dbCol);
                }
            });
        }

        newRows[idx]._status = status;
        newRows[idx]._diffs = diffs;
        setParsedRows(newRows);
    };

    const handleCommit = async () => {
        setLoading(true);
        try {
            const toUpsert = parsedRows.filter(r => r._status !== 'no-change');
            if (toUpsert.length > 0) {
                const { error } = await upsertInvestors(toUpsert);
                if (error) throw error;
            }
            onSave();
            onClose();
        } catch (err) {
            console.error('Supabase Import Error:', err);
            setError(`Failed to save data: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        return {
            new: parsedRows.filter(r => r._status === 'new').length,
            update: parsedRows.filter(r => r._status === 'update').length,
            noChange: parsedRows.filter(r => r._status === 'no-change').length,
        };
    }, [parsedRows]);

    return (
        <AnimatePresence>
            <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <motion.div
                className="modal excel-upload-modal"
                initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
                animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
                exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
            >
                <div className="modal-header">
                    <h2>Import Investors from Excel</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {step === 'upload' ? (
                        <div
                            className={`upload-zone ${dragging ? 'dragging' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
                            onClick={() => document.getElementById('excel-input').click()}
                        >
                            <input type="file" id="excel-input" hidden accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
                            <div className="upload-icon"><Upload size={48} /></div>
                            <div className="upload-text">
                                <h3>Click or drag Excel/CSV file here</h3>
                                <p>Make sure columns match the dashboard (Investor, Fund, Stage, etc.)</p>
                            </div>
                        </div>
                    ) : (
                        <div className="review-container">
                            <div className="review-header">
                                <div className="review-stats">
                                    <div className="stat-badge stat-new"><Check size={12} /> {stats.new} New</div>
                                    <div className="stat-badge stat-update"><ArrowRight size={12} /> {stats.update} To Update</div>
                                    {stats.noChange > 0 && <div className="stat-badge stat-no-change" style={{ background: '#F3F4F6', color: '#6b7280' }}>{stats.noChange} Unchanged</div>}
                                </div>
                                <div className="text-tertiary" style={{ fontSize: '0.8rem' }}>Review and edit rows before importing</div>
                            </div>

                            <div className="review-table-wrapper">
                                <table className="review-table">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            {Object.keys(COLUMN_MAPPING).map(k => <th key={k}>{k}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedRows.map((row, idx) => (
                                            <tr key={row.id} className={`row-${row._status}`}>
                                                <td>
                                                    <div className={`status-indicator status-${row._status}`}>
                                                        {row._status === 'new' ? 'New' : row._status === 'update' ? 'Update' : 'No Change'}
                                                    </div>
                                                </td>
                                                {Object.entries(COLUMN_MAPPING).map(([label, key]) => (
                                                    <td key={key} className={row._diffs.includes(key) ? 'diff-highlight' : ''}>
                                                        <input
                                                            className="review-input"
                                                            value={row[key]}
                                                            onChange={(e) => handleFieldChange(idx, key, e.target.value)}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    {step === 'review' && (
                        <button
                            className="btn btn-primary"
                            disabled={loading || (stats.new === 0 && stats.update === 0)}
                            onClick={handleCommit}
                        >
                            <Save size={16} /> {loading ? 'Importing...' : 'Commit Changes'}
                        </button>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
