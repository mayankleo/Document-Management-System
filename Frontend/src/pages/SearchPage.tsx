import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { getMajorHeads, getMinorHeads } from '../api/headsApi';
import { searchDocuments, downloadFile, downloadZip, listDocuments } from '../api/documentsApi';
import type { MajorHead, MinorHead, DocumentItem } from '../models';

const SearchPage = () => {
  const token = useSelector((s: RootState) => s.auth.token);
  const [major, setMajor] = useState<MajorHead[]>([]);
  const [minorByMajor, setMinorByMajor] = useState<Record<number, MinorHead[]>>({});
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<null | { url: string; type: 'image' | 'pdf' | 'unsupported'; name: string }>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [majorId, setMajorId] = useState<number | ''>('');
  const [minorId, setMinorId] = useState<number | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    (async () => {
      if (!major.length && token) {
        try { const m = await getMajorHeads(); setMajor(m); } catch { /* ignore */ }
      }
    })();
  }, [major.length, token]);

  useEffect(() => {
    (async () => {
      if (majorId !== '' && !minorByMajor[majorId]) {
        const minors = await getMinorHeads(majorId);
        setMinorByMajor(prev => ({ ...prev, [majorId]: minors }));
      }
    })();
  }, [majorId, minorByMajor]);

    useEffect(() => {
    (async () => {
      setDocuments(await listDocuments());
    })();
  }, []);

  const runSearch = async () => {
    if (!token) return;
    setError(''); setInfo('');
    setLoading(true);
    try {
      const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
      const result = await searchDocuments({
        majorHeadId: majorId || undefined,
        minorHeadId: minorId || undefined,
        from: from || undefined,
        to: to || undefined,
        tags: tagArray.length ? tagArray : undefined
      });
  setDocuments(result);
  setSelected([]);
  setInfo(`${result.length} documents`);
    } catch (err) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const blob = await downloadFile(fileName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  } catch { alert('Download failed'); }
  };

  const inferTypeFromName = (name: string): 'image' | 'pdf' | 'unsupported' => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (!ext) return 'unsupported';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    return 'unsupported';
  };

  const openPreview = async (doc: DocumentItem) => {
    setPreviewLoading(true);
    try {
      const blob = await downloadFile(doc.fileName);
      const url = URL.createObjectURL(blob);
      const type = inferTypeFromName(doc.fileOriginalName || doc.fileName);
      setPreview({ url, type, name: doc.fileOriginalName || doc.fileName });
    } catch {
      alert('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const handleBulkZip = async () => {
    if (!selected.length) return;
    try {
      const blob = await downloadZip({ fileNames: selected });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'documents.zip'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Zip download failed'); }
  };

  if (!token) return <div className="max-w-6xl mx-auto p-6"><h1 className="text-2xl font-semibold mb-2">Search Documents</h1><p className="text-red-600">Not authenticated.</p></div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your Documents</h1>
      <div className="grid md:grid-cols-5 gap-4 bg-white/5 border border-gray-200 rounded p-4 text-sm">
        <div className="flex flex-col gap-1">
          <label className="font-medium">Major</label>
          <select className="border rounded px-2 py-1" value={majorId} onChange={e => { setMajorId(e.target.value ? Number(e.target.value) : ''); setMinorId(''); }}>
            <option value="">Any</option>
            {major.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium">Minor</label>
          <select className="border rounded px-2 py-1" value={minorId} onChange={e => setMinorId(e.target.value ? Number(e.target.value) : '')} disabled={majorId === ''}>
            <option value="">Any</option>
            {majorId !== '' && minorByMajor[majorId]?.map(mi => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium">From</label>
          <input className="border rounded px-2 py-1" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-medium">To</label>
          <input className="border rounded px-2 py-1" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1 md:col-span-1 col-span-full">
          <label className="font-medium">Tags (comma)</label>
          <input className="border rounded px-2 py-1" value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1,tag2" />
        </div>
        <div className="flex gap-2 items-end md:col-span-5">
          <button className="px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-50" onClick={runSearch} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
          <button className="px-3 py-1 rounded border" onClick={() => { setMajorId(''); setMinorId(''); setFrom(''); setTo(''); setTags(''); setSelected([]); setDocuments([]); setInfo(''); setError(''); }} disabled={loading}>Reset</button>
        </div>
        {error && <p className="text-sm text-red-600 col-span-5">{error}</p>}
        {info && <p className="text-sm text-gray-700 col-span-5">{info}</p>}
      </div>
      <div className="flex items-center gap-3 text-sm">
  <button className="px-3 py-1 rounded bg-green-600 text-white disabled:opacity-50" disabled={!selected.length} onClick={handleBulkZip}>Download Selected (.zip)</button>
  <button className="px-3 py-1 rounded border disabled:opacity-50" disabled={!selected.length} onClick={() => setSelected([])}>Clear Selection</button>
        <span className="text-xs text-gray-500">{selected.length} selected</span>
      </div>
      <div className="overflow-auto border border-gray-200 rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-2">Select</th>
              <th className="p-2">File</th>
              <th className="p-2">Major</th>
              <th className="p-2">Minor</th>
              <th className="p-2">Date</th>
              <th className="p-2">Tags</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map(d => (
              <tr key={d.id} className="odd:bg-white even:bg-gray-50">
                <td className="p-2"><input type="checkbox" checked={selected.includes(d.fileName)} onChange={() => setSelected(prev => prev.includes(d.fileName) ? prev.filter(x => x !== d.fileName) : [...prev, d.fileName])} /></td>
                <td className="p-2 truncate max-w-[200px]" title={d.fileOriginalName}>{d.fileOriginalName}</td>
                <td className="p-2">{d.majorHead.name}</td>
                <td className="p-2">{d.minorHead.name}</td>
                <td className="p-2">{d.documentDate?.slice(0,10)}</td>
                <td className="p-2">{d.tags.join(', ')}</td>
                <td className="p-2 flex gap-2">
                  <button className="px-2 py-0.5 rounded border" onClick={() => handleDownload(d.fileName)}>Download</button>
                  <button className="px-2 py-0.5 rounded border" disabled={previewLoading} onClick={() => openPreview(d)}>{previewLoading ? 'Loading...' : 'Preview'}</button>
                </td>
              </tr>
            ))}
            {documents.length === 0 && <tr><td className="p-4 text-center text-gray-500" colSpan={7}>No results</td></tr>}
          </tbody>
        </table>
      </div>
      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
              <span className="font-medium truncate pr-2" title={preview.name}>{preview.name}</span>
              <button onClick={closePreview} className="px-2 py-0.5 rounded bg-gray-200 hover:bg-gray-300">Close</button>
            </div>
            <div className="p-3 overflow-auto flex-1 bg-gray-50 flex items-center justify-center">
              {preview.type === 'image' && (
                <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" />
              )}
              {preview.type === 'pdf' && (
                <iframe title="pdf" src={preview.url} className="w-full h-full rounded border" />
              )}
              {preview.type === 'unsupported' && (
                <p className="text-sm text-gray-600">Preview not supported for this file type. Please download instead.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;