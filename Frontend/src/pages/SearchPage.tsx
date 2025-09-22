import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { getMajorHeads, getMinorHeads } from '../api/headsApi';
import { searchDocuments, downloadFile, downloadZip, listDocuments } from '../api/documentsApi';
import type { MajorHead, MinorHead, DocumentItem } from '../models';

function Spinner({ size = 'xs', invert = false }: { size?: 'xs' | 'sm' | 'md'; invert?: boolean }) {
  const dim = size === 'md' ? 'h-5 w-5' : size === 'sm' ? 'h-4 w-4' : 'h-3 w-3';
  const color = invert ? 'border-white border-t-transparent' : 'border-indigo-500 border-t-transparent';
  return <span className={`inline-block animate-spin rounded-full ${dim} border-2 ${color}`} aria-label="loading" />;
}

const SearchPage = () => {
  const token = useSelector((s: RootState) => s.auth.token);
  const user = useSelector((s: RootState) => s.auth.user);
  const isAdmin = !!user?.isAdmin;
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
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const majorLabel = isAdmin ? 'Major Head' : 'Category';
  const minorLabel = isAdmin ? 'Minor Head' : 'Sub Category';

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

  const allSelected = useMemo(() => documents.length > 0 && selected.length === documents.map(d => d.fileName).length, [documents, selected]);
  const partiallySelected = useMemo(() => selected.length > 0 && selected.length < documents.length, [documents, selected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(documents.map(d => d.fileName));
    }
  };

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
    if (!selected.length || bulkLoading) return;
    setBulkLoading(true);
    try {
      const blob = await downloadZip({ fileNames: selected });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'documents.zip'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Zip download failed');
    } finally {
      setBulkLoading(false);
    }
  };

  if (!token) return <div className="max-w-7xl mx-auto p-6"><h1 className="text-2xl font-semibold mb-2">Documents</h1><p className="text-red-600">Not authenticated.</p></div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-sm text-gray-600">Search, preview and download your stored documents. {isAdmin && 'Use advanced filters to refine results.'}</p>
      </header>

      <section className="bg-white/70 backdrop-blur border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filters</h2>
          <button onClick={() => setShowFilters(s => !s)} className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-100">{showFilters ? 'Hide' : 'Show'}</button>
        </div>
        {showFilters && (
          <div className="p-4 grid gap-4 md:grid-cols-6 text-sm">
            {isAdmin && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-gray-700">{majorLabel}</label>
                  <select className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={majorId} onChange={e => { setMajorId(e.target.value ? Number(e.target.value) : ''); setMinorId(''); }}>
                    <option value="">Any</option>
                    {major.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-medium text-gray-700">{minorLabel}</label>
                  <select className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={minorId} onChange={e => setMinorId(e.target.value ? Number(e.target.value) : '')} disabled={majorId === ''}>
                    <option value="">Any</option>
                    {majorId !== '' && minorByMajor[majorId]?.map(mi => <option key={mi.id} value={mi.id}>{mi.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1">
              <label className="font-medium text-gray-700">From</label>
              <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-medium text-gray-700">To</label>
              <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="font-medium text-gray-700">Tags (comma)</label>
              <input className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1,tag2" />
            </div>
            <div className="flex gap-2 items-end md:col-span-6">
              <button className="px-4 py-2 rounded bg-indigo-600 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-2" onClick={runSearch} disabled={loading}>{loading && <Spinner size="xs" />} {loading ? 'Searching...' : 'Apply Filters'}</button>
              <button className="px-3 py-2 rounded border text-xs" onClick={async () => { setMajorId(''); setMinorId(''); setFrom(''); setTo(''); setTags(''); setSelected([]); setDocuments(await listDocuments()); setInfo(''); setError(''); }} disabled={loading}>Reset</button>
              {info && <span className="text-xs text-gray-500">{info}</span>}
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </div>
        )}
      </section>

      {selected.length > 0 && (
        <div className="sticky top-2 z-20 bg-indigo-600 text-white rounded-md shadow flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
          <span className="font-medium">{selected.length} selected</span>
          <button onClick={handleBulkZip} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20 disabled:opacity-50 flex items-center gap-2" disabled={!selected.length || bulkLoading}>{bulkLoading && <Spinner size="xs" invert />} {bulkLoading ? 'Preparing ZIP…' : 'Download ZIP'}</button>
          <button onClick={() => setSelected([])} className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/20">Clear</button>
        </div>
      )}

      <section className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 text-left text-xs uppercase tracking-wide">
              <tr>
                <th className="p-2 w-10 align-middle">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = partiallySelected; }}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </div>
                </th>
                <th className="p-2 font-semibold">File</th>
                {isAdmin && <th className="p-2 font-semibold">{majorLabel}</th>}
                {isAdmin && <th className="p-2 font-semibold">{minorLabel}</th>}
                <th className="p-2 font-semibold">Date</th>
                <th className="p-2 font-semibold">Tags</th>
                <th className="p-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(d => {
                const checked = selected.includes(d.fileName);
                return (
                  <tr key={d.id} className="odd:bg-white even:bg-gray-50 hover:bg-indigo-50/50 transition-colors">
                    <td className="p-2 text-center">
                      <input type="checkbox" checked={checked} onChange={() => setSelected(prev => prev.includes(d.fileName) ? prev.filter(x => x !== d.fileName) : [...prev, d.fileName])} />
                    </td>
                    <td className="p-2 max-w-[260px]">
                      <div className="flex flex-col">
                        <span className="truncate font-medium" title={d.fileOriginalName}>{d.fileOriginalName}</span>
                        <span className="text-[10px] text-gray-500">{d.fileName}</span>
                      </div>
                    </td>
                    {isAdmin && <td className="p-2 whitespace-nowrap">{d.majorHead.name}</td>}
                    {isAdmin && <td className="p-2 whitespace-nowrap">{d.minorHead.name}</td>}
                    <td className="p-2 whitespace-nowrap">{d.documentDate?.slice(0,10)}</td>
                    <td className="p-2">{d.tags.length ? (
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {d.tags.slice(0,6).map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-medium">{t}</span>)}
                        {d.tags.length > 6 && <span className="text-[10px] text-gray-500">+{d.tags.length - 6}</span>}
                      </div>
                    ) : <span className="text-[11px] text-gray-400">—</span>}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-2 py-1 rounded border text-xs hover:bg-gray-100" onClick={() => handleDownload(d.fileName)}>Download</button>
                        <button className="px-2 py-1 rounded border text-xs hover:bg-gray-100 disabled:opacity-50" disabled={previewLoading} onClick={() => openPreview(d)}>{previewLoading ? 'Loading…' : 'Preview'}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={isAdmin ? 7 : 5}>No documents found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full h-full flex flex-col animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-2 text-sm bg-gray-50">
              <span className="font-medium truncate pr-2" title={preview.name}>{preview.name}</span>
              <div className="flex gap-2">
                <button onClick={closePreview} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs">Close</button>
              </div>
            </div>
            <div className="p-3 overflow-auto flex-1 bg-gray-100 flex items-center justify-center">
              {preview.type === 'image' && (
                <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain rounded shadow" />
              )}
              {preview.type === 'pdf' && (
                <iframe title="pdf" src={preview.url} className="w-full h-full rounded border bg-white" />
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