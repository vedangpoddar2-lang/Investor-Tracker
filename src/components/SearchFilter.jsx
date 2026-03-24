import { Search, FileSpreadsheet, Download, Trash2 } from 'lucide-react';
import { STAGES, ENTITIES, NDA_STATUSES } from '../data/store';
import './SearchFilter.css';

export default function SearchFilter({ filters, onFilterChange, onImport, onExport, selectedCount, onDeleteSelected }) {
    return (
        <div className="search-filter">
            <div className="search-filter-container">
                <div className="search-input-wrapper">
                    <Search size={14} className="search-icon" />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search investors..."
                        value={filters.search}
                        onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={filters.entity}
                        onChange={(e) => onFilterChange({ ...filters, entity: e.target.value })}
                    >
                        <option value="">Entity</option>
                        {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select
                        className="filter-select"
                        value={filters.stage}
                        onChange={(e) => onFilterChange({ ...filters, stage: e.target.value })}
                    >
                        <option value="">Stage</option>
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        className="filter-select"
                        value={filters.ndaStatus}
                        onChange={(e) => onFilterChange({ ...filters, ndaStatus: e.target.value })}
                    >
                        <option value="">NDA</option>
                        {NDA_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="action-group">
                    {selectedCount > 0 && (
                        <button className="btn btn-danger btn-sm" onClick={onDeleteSelected}>
                            <Trash2 size={14} /> Delete ({selectedCount})
                        </button>
                    )}
                    <button className="btn btn-ghost" onClick={onImport}>
                        <FileSpreadsheet size={14} /> Import Excel
                    </button>
                    <button className="btn btn-ghost" onClick={onExport}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
