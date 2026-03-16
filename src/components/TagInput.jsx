import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { getAllTags } from '../data/store';
import './TagInput.css';

export default function TagInput({ tags = [], onChange }) {
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (input.trim()) {
            const allTags = getAllTags();
            const filtered = allTags.filter(
                (t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
            );
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    }, [input, tags]);

    const addTag = (tag) => {
        const trimmed = tag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            onChange([...tags, trimmed]);
        }
        setInput('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const removeTag = (tag) => {
        onChange(tags.filter((t) => t !== tag));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && input.trim()) {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length) {
            removeTag(tags[tags.length - 1]);
        }
    };

    return (
        <div className="tag-input-wrapper">
            <div className="tag-input-container">
                {tags.map((tag) => (
                    <span key={tag} className="tag">
                        {tag}
                        <button className="tag-remove" onClick={() => removeTag(tag)}>
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className="tag-text-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                    placeholder={tags.length === 0 ? 'Add tags...' : ''}
                />
            </div>
            {showSuggestions && (
                <div className="tag-suggestions">
                    {suggestions.map((s) => (
                        <button key={s} className="tag-suggestion" onMouseDown={() => addTag(s)}>
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
