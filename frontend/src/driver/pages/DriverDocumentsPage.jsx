import { FileCheck2, FilePlus2, FileText, Image, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { driverApi } from '../api/driverApi';
import { apiError, dateTime } from '../services/driverFormatters';

const typeLabels = {
  LICENSE: 'Driving license',
  IDENTITY: 'Identity proof',
  PHOTO: 'Profile photo',
  MEDICAL_CERTIFICATE: 'Medical certificate',
  POLICE_CLEARANCE: 'Police clearance',
  OTHER: 'Other supporting document',
};

function documentLabel(item) {
  return typeLabels[item.document_type] || item.document_type || 'Driver document';
}

export default function DriverDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [documentType, setDocumentType] = useState('MEDICAL_CERTIFICATE');
  const [file, setFile] = useState(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const fileInput = useRef(null);

  useEffect(() => {
    let active = true;
    driverApi.documents()
      .then(({ data }) => {
        if (active) setDocuments(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((requestError) => {
        if (active) setError(apiError(requestError, 'Could not load your documents.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const reload = () => {
    setError('');
    setLoading(true);
    setReloadVersion((value) => value + 1);
  };

  const openDocument = async (item) => {
    const key = item.source === 'APPLICATION' ? item.document_type : `additional-${item.id}`;
    setOpeningId(key);
    setError('');
    try {
      const response = item.source === 'APPLICATION'
        ? await driverApi.applicationDocument(item.document_type)
        : await driverApi.additionalDocument(item.id);
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.original_name || `${documentLabel(item)}.pdf`;
      anchor.target = '_blank';
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(apiError(requestError, 'Could not open this document.'));
    } finally {
      setOpeningId('');
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a document to upload.');
      return;
    }
    if (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      setError('Choose a PDF, PNG, or JPG file no larger than 5 MB.');
      return;
    }
    setUploading(true);
    setError('');
    setMessage('');
    try {
      await driverApi.uploadDocument(documentType, file);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setMessage('Document uploaded securely.');
      setLoading(true);
      setReloadVersion((value) => value + 1);
    } catch (requestError) {
      setError(apiError(requestError, 'Could not upload this document.'));
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (item) => {
    if (!window.confirm(`Remove "${item.original_name}"?`)) return;
    setError('');
    setMessage('');
    try {
      await driverApi.deleteDocument(item.id);
      setMessage('Document removed.');
      setLoading(true);
      setReloadVersion((value) => value + 1);
    } catch (requestError) {
      setError(apiError(requestError, 'Could not remove this document.'));
    }
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Documents</h1><p className="mt-1 text-sm text-slate-500">View your submitted verification files or upload additional supporting documents.</p></div>
        <button onClick={reload} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}

      <form onSubmit={upload} className="mb-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1.3fr_auto] sm:items-end">
        <label className="block text-sm font-semibold text-slate-700">Document type
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">
            <option value="MEDICAL_CERTIFICATE">Medical certificate</option>
            <option value="POLICE_CLEARANCE">Police clearance</option>
            <option value="OTHER">Other supporting document</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-slate-700">Choose file
          <input ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-100 file:px-3 file:py-2 file:font-semibold file:text-[#B54700]" />
          <span className="mt-1 block text-xs font-normal text-slate-500">PDF, PNG, or JPG · maximum 5 MB</span>
        </label>
        <button type="submit" disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF6B00] px-4 py-3 text-sm font-bold text-white hover:bg-[#E85D00] disabled:opacity-50"><FilePlus2 size={16} />{uploading ? 'Uploading…' : 'Upload'}</button>
      </form>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? [1, 2, 3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)
          : error ? null
          : documents.length ? documents.map((item) => {
            const isPhoto = item.document_type === 'PHOTO';
            const isAdditional = item.source === 'ADDITIONAL';
            const itemKey = isAdditional ? `additional-${item.id}` : item.document_type;
            const Icon = isPhoto ? Image : item.document_type === 'LICENSE' ? FileCheck2 : FileText;
            return <article key={itemKey} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#B54700]"><Icon size={20} /></span>
                {isAdditional && <button type="button" onClick={() => deleteDocument(item)} aria-label={`Remove ${item.original_name}`} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button>}
              </div>
              <h2 className="mt-4 font-bold text-slate-900">{documentLabel(item)}</h2>
              <p className="mt-1 truncate text-sm text-slate-500" title={item.original_name}>{item.original_name}</p>
              <p className="mt-1 text-xs text-slate-400">Added {dateTime(item.uploaded_at)}</p>
              <button type="button" onClick={() => openDocument(item)} disabled={openingId === itemKey} className="mt-4 text-sm font-bold text-[#B54700] hover:underline disabled:opacity-50">
                {openingId === itemKey ? 'Opening…' : 'View / download'}
              </button>
            </article>;
          }) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 md:col-span-2 xl:col-span-3">No documents on your account yet.</div>}
      </section>
    </>
  );
}
