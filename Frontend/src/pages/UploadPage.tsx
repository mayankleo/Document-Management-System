import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { getMajorHeads, getMinorHeads } from '../api/headsApi';
import { getTags, uploadDocument } from '../api/documentsApi';
import type { MajorHead, MinorHead } from '../models';

const UploadPage = () => {
    const token = useSelector((s: RootState) => s.auth.token);
    const isAdmin = useSelector((s: RootState) => s.auth.user?.isAdmin);

    // Localized formerly global state
    const [major, setMajorLocal] = useState<MajorHead[]>([]);
    const [minorByMajor, setMinorByMajor] = useState<Record<number, MinorHead[]>>({});
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

    const [selectedMajor, setSelectedMajor] = useState<number | ''>('');
    const [selectedMinor, setSelectedMinor] = useState<number | ''>('');
    const [date, setDate] = useState('');
    const [remarks, setRemarks] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTagsLocal] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [uploading, setUploading] = useState(false);

    // Load major heads and tags (if admin) on mount
    useEffect(() => {
        (async () => {
            try {
                if (!major.length) {
                    const m = await getMajorHeads();
                    setMajorLocal(m);
                }
                if (isAdmin && !tagSuggestions.length) {
                    try { const t = await getTags(); setTagSuggestions(t.map(x => x.name)); } catch { /* ignore */ }
                }
            } catch { /* ignore */ }
        })();
    }, [major.length, isAdmin, tagSuggestions.length]);

    // Load minor heads when major changes
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

    const removeTag = (t: string) => {
        setTagsLocal(tags.filter(x => x !== t));
    };

    const handleTagInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(tagInput);
            setTagInput('');
        }
    };

    const handleSuggestionClick = (t: string) => {
        addTag(t);
    };

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(''); setMessage('');
        if (!file) { setError('File required'); return; }
        if (selectedMajor === '' || selectedMinor === '') { setError('Select major and minor'); return; }
        setUploading(true);
        try {
            const res = await uploadDocument({
                file,
                majorHeadId: selectedMajor as number,
                minorHeadId: selectedMinor as number,
                documentDate: date || undefined,
                remarks: remarks || undefined,
                tags
            });
            setMessage(`Uploaded document id=${res.id}`);
            // reset
            setFile(null); setTagsLocal([]); setRemarks(''); setDate(''); setSelectedMinor('');
        } catch (err) {
            setError((err as Error).message);
        } finally { setUploading(false); }
    };

        if (!token) return <div className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-semibold mb-2">Upload Document</h1><p className="text-red-600">Not authenticated.</p></div>;
        if (!isAdmin) return <div className="max-w-3xl mx-auto p-6"><h1 className="text-2xl font-semibold mb-2">Upload Document</h1><p className="text-red-600">Only admin can upload.</p></div>;

    return (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <h1 className="text-2xl font-semibold">Upload Document</h1>
                <form onSubmit={onSubmit} className="space-y-5 bg-white/5 border border-gray-200 rounded p-5">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Date</label>
                        <input className="border rounded px-2 py-1" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Category</label>
                        <select className="border rounded px-2 py-1" value={selectedMajor} onChange={e => { setSelectedMajor(e.target.value ? Number(e.target.value) : ''); setSelectedMinor(''); }}>
                            <option value="">-- Select --</option>
                            {major.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Sub-Category</label>
                        <select className="border rounded px-2 py-1" value={selectedMinor} onChange={e => setSelectedMinor(e.target.value ? Number(e.target.value) : '')} disabled={selectedMajor === ''}>
                            <option value="">-- Select --</option>
                            {selectedMajor !== '' && minorByMajor[selectedMajor]?.map(mi => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Remarks</label>
                        <input className="border rounded px-2 py-1" value={remarks} onChange={e => setRemarks(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">File</label>
                        <input className="border rounded px-2 py-1" type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
                        {file && <span className="text-xs text-gray-600">Selected: {file.name}</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Tags</label>
                        <input className="border rounded px-2 py-1" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagInputKey} placeholder="Type tag and press Enter" />
                        <div className="flex flex-wrap gap-2 text-sm">
                            {tags.map(t => <button className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300" type="button" key={t} onClick={() => removeTag(t)}>{t} ×</button>)}
                            {tags.length === 0 && <span className="text-gray-500">No tags yet</span>}
                        </div>
                        {tagSuggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2 text-xs">
                                {tagSuggestions.filter(t => !tags.includes(t)).slice(0, 10).map(t => <button className="px-2 py-0.5 rounded border" type="button" key={t} onClick={() => handleSuggestionClick(t)}>{t}</button>)}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
                        <button className="px-3 py-1 rounded border" type="button" disabled={uploading} onClick={() => { setFile(null); setTagsLocal([]); setRemarks(''); setDate(''); setSelectedMajor(''); setSelectedMinor(''); }}>Clear</button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {message && <p className="text-sm text-green-700">{message}</p>}
                </form>
            </div>
    );
};

export default UploadPage;