import { useEffect, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { getMajorHeads, getMinorHeads } from '../api/headsApi';
import { getTags, uploadDocument } from '../api/documentsApi';
import type { MajorHead, MinorHead } from '../models';

const UploadPage = () => {
    const token = useSelector((s: RootState) => s.auth.token);
    const isAdmin = useSelector((s: RootState) => s.auth.user?.isAdmin);

    // Data
    const [major, setMajorLocal] = useState<MajorHead[]>([]);
    const [minorByMajor, setMinorByMajor] = useState<Record<number, MinorHead[]>>({});
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

    // Form state
    const [selectedMajor, setSelectedMajor] = useState<number | ''>('');
    const [selectedMinor, setSelectedMinor] = useState<number | ''>('');
    const [date, setDate] = useState('');
    const [remarks, setRemarks] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTagsLocal] = useState<string[]>([]);

    // Feedback
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                if (!major.length) {
                    const m = await getMajorHeads();
                    setMajorLocal(m);
                }
                if (isAdmin && !tagSuggestions.length) {
                    try { const t = await getTags(); setTagSuggestions(t.map(x => x.name)); } catch {/* ignore */ }
                }
            } catch {/* ignore */ }
        })();
    }, [major.length, isAdmin, tagSuggestions.length]);

    useEffect(() => {
        (async () => {
            if (selectedMajor !== '' && !minorByMajor[selectedMajor]) {
                const minors = await getMinorHeads(selectedMajor);
                setMinorByMajor(prev => ({ ...prev, [selectedMajor]: minors }));
            }
        })();
    }, [selectedMajor, minorByMajor]);

    const addTag = (t: string) => {
        const cleaned = t.trim();
        if (!cleaned || tags.includes(cleaned)) return;
        setTagsLocal([...tags, cleaned]);
    };
    const removeTag = (t: string) => setTagsLocal(tags.filter(x => x !== t));

    const handleTagInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
            setTagInput('');
        } else if (e.key === 'Backspace' && !tagInput && tags.length) {
            // convenience: remove last
            setTagsLocal(tags.slice(0, -1));
        }
    };

    const handleSuggestionClick = (t: string) => addTag(t);

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(''); setMessage('');
        // Validation: all required now
        if (selectedMajor === '') { setError('Category is required'); return; }
        if (selectedMinor === '') { setError('Sub-Category is required'); return; }
        if (!date) { setError('Date is required'); return; }
        if (!remarks.trim()) { setError('Remarks are required'); return; }
        if (!file) { setError('File is required'); return; }
        if (!tags.length) { setError('At least one tag is required (Type a tag and press Enter)'); return; }
        setUploading(true);
        try {
            const res = await uploadDocument({
                file,
                majorHeadId: selectedMajor as number,
                minorHeadId: selectedMinor as number,
                documentDate: date,
                remarks: remarks,
                tags
            });
            setMessage(`Uploaded successfully.`);
            console.log(res);
            const rt = await getTags();
            setTagSuggestions(rt.map(x => x.name));
            setFile(null); setTagsLocal([]); setRemarks(''); setDate(''); setSelectedMinor(''); setSelectedMajor(''); setTagInput('');
        } catch (err) {
            setError((err as Error).message || 'Upload failed');
        } finally { setUploading(false); }
    };

    const onFileChange = (f: File | null) => setFile(f);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileChange(e.dataTransfer.files[0]);
        }
    }, []);

    if (!token) return <div className="max-w-4xl mx-auto p-8"><h1 className="text-2xl font-semibold mb-2">Upload Document</h1><p className="text-red-600">Not authenticated.</p></div>;
    if (!isAdmin) return <div className="max-w-4xl mx-auto p-8"><h1 className="text-2xl font-semibold mb-2">Upload Document</h1><p className="text-red-600">Only admin can upload.</p></div>;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8">
            <header className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight">Upload Document</h1>
                <p className="text-sm text-gray-600">Add a new document.</p>
            </header>

            <form onSubmit={onSubmit} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-3">
                    <div className="bg-white rounded-lg shadow-sm border p-5 space-y-4 md:col-span-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Metadata</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600 uppercase">Category <span className="text-red-600">*</span></label>
                                <select className={`border rounded px-2 py-2 text-sm ${selectedMajor === '' && error ? 'border-red-500' : ''}`} value={selectedMajor} onChange={e => { setSelectedMajor(e.target.value ? Number(e.target.value) : ''); setSelectedMinor(''); }}>
                                    <option value="">Select...</option>
                                    {major.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600 uppercase">Sub-Category <span className="text-red-600">*</span></label>
                                <select className={`border rounded px-2 py-2 text-sm ${(selectedMinor === '' || selectedMajor === '') && error ? 'border-red-500' : ''}`} value={selectedMinor} onChange={e => setSelectedMinor(e.target.value ? Number(e.target.value) : '')} disabled={selectedMajor === ''}>
                                    <option value="">Select...</option>
                                    {selectedMajor !== '' && minorByMajor[selectedMajor]?.map(mi => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-gray-600 uppercase">Date <span className="text-red-600">*</span></label>
                                <input className={`border rounded px-2 py-2 text-sm ${!date && error ? 'border-red-500' : ''}`} type="date" value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1 sm:col-span-2">
                                <label className="text-xs font-medium text-gray-600 uppercase">Remarks <span className="text-red-600">*</span></label>
                                <input className={`border rounded px-3 py-2 text-sm ${!remarks.trim() && error ? 'border-red-500' : ''}`} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter remarks" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border p-5 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">File <span className="text-red-600">*</span></h2>
                        <div
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            className={`relative rounded border-2 border-dashed p-6 text-center text-sm transition ${dragActive ? 'border-indigo-400 bg-indigo-50' : (!file && error ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50')}`}
                        >
                            {!file && (
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => onFileChange(e.target.files?.[0] || null)}
                                />
                            )}
                            {!file && (
                                <div className="space-y-1">
                                    <p className="font-medium text-gray-700">Drag & drop file here</p>
                                    <p className="text-xs text-gray-500">or click to browse. PDF / Images supported.</p>
                                </div>
                            )}
                            {file && (
                                <div className="flex flex-col items-center gap-1">
                                    <p className="text-sm font-medium text-gray-800 truncate max-w-full" title={file.name}>{file.name}</p>
                                    <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => onFileChange(null)}>Remove</button>
                                </div>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug">Ensure the correct category + sub-category. Tags improve search relevance.</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border p-5 space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Tags <span className="text-red-600">*</span></h2>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {tags.map(t => (
                            <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs font-medium">
                                {t}
                                <button type="button" className="text-indigo-600 hover:text-indigo-900" onClick={() => removeTag(t)} aria-label={`Remove tag ${t}`}>×</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            className={`border rounded px-3 py-2 text-sm flex-1 ${tags.length === 0 && error ? 'border-red-500' : ''}`}
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKey}
                            placeholder="Type a tag and press Enter"
                        />
                        <button
                            type="button"
                            className="px-3 py-2 text-sm rounded bg-indigo-600 text-white disabled:opacity-50"
                            onClick={() => { addTag(tagInput); setTagInput(''); }}
                            disabled={!tagInput.trim()}
                        >Add</button>
                    </div>
                    {tagSuggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {tagSuggestions.filter(t => !tags.includes(t) && (!tagInput || t.toLowerCase().includes(tagInput.toLowerCase()))).slice(0, 12).map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    className="px-2 py-1 rounded border text-xs hover:bg-gray-100"
                                    onClick={() => handleSuggestionClick(t)}
                                >{t}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
                        type="submit"
                        disabled={uploading}
                    >{uploading ? 'Uploading...' : 'Upload Document'}</button>
                    <button
                        className="px-4 py-2 rounded border text-sm"
                        type="button"
                        disabled={uploading}
                        onClick={() => { setFile(null); setTagsLocal([]); setRemarks(''); setDate(''); setSelectedMajor(''); setSelectedMinor(''); setTagInput(''); }}
                    >Reset</button>
                    {error && <span className="text-sm text-red-600">{error}</span>}
                    {message && <span className="text-sm text-green-700">{message}</span>}
                </div>
            </form>
        </div>
    );
};

export default UploadPage;