import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShieldCheck, 
  ShieldAlert, 
  HardDrive, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  UploadCloud, 
  Database,
  Fingerprint,
  RefreshCw,
  FolderOpen,
  BookOpen,
  PenTool,
  Plus
} from 'lucide-react';
import { db, initializeDatabase } from '../../src/db';
import { useStoragePersistence, formatBytes } from '../../src/db/persistence';
import { computePdfIdentityHash, type PdfHashResult } from '../../src/utils/hasher';
import { savePdfToOpfs, listOpfsPdfs, isOpfsSupported } from '../../src/db/opfs';

export default function App() {
  const { status: persistence, isLoading: isPersistLoading, refresh: refreshPersistence } = useStoragePersistence();
  const [initDone, setInitDone] = useState(false);
  const [hashingState, setHashingState] = useState<{
    isLoading: boolean;
    result?: PdfHashResult;
    opfsSaved?: boolean;
    error?: string;
    filename?: string;
  }>({ isLoading: false });
  const [opfsFiles, setOpfsFiles] = useState<Array<{ filename: string; sizeBytes: number }>>([]);

  // Live queries to Dexie tables
  const sources = useLiveQuery(() => db.sources.toArray(), []);
  const highlights = useLiveQuery(() => db.highlights.toArray(), []);
  const documents = useLiveQuery(() => db.documents.toArray(), []);

  // Initialize DB on mount
  useEffect(() => {
    initializeDatabase().then(() => {
      setInitDone(true);
      loadOpfsList();
    });
  }, []);

  const loadOpfsList = async () => {
    if (isOpfsSupported()) {
      const list = await listOpfsPdfs();
      setOpfsFiles(list);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setHashingState({ isLoading: true, filename: file.name });

    try {
      // 1. Compute deterministic SHA-256 content hash with magic-byte validation
      const hashResult = await computePdfIdentityHash(file);

      // 2. Save binary stream to OPFS
      let opfsSaved = false;
      if (isOpfsSupported()) {
        await savePdfToOpfs(hashResult.sha256, file);
        opfsSaved = true;
      }

      // 3. Register or update source record in Dexie
      const existingSource = await db.sources.where('fingerprint').equals(hashResult.sha256).first();
      if (!existingSource) {
        await db.sources.add({
          id: 'src-' + crypto.randomUUID(),
          type: 'pdf',
          fingerprint: hashResult.sha256,
          title: file.name.replace(/\.pdf$/i, ''),
          url: file.name,
          fileSizeBytes: file.size,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        });
      }

      setHashingState({
        isLoading: false,
        result: hashResult,
        opfsSaved,
        filename: file.name,
      });

      await loadOpfsList();
    } catch (err: unknown) {
      setHashingState({
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
        filename: file.name,
      });
    }
  };

  return (
    <div className="w-[380px] min-h-[540px] max-h-[620px] overflow-y-auto bg-paper text-ink p-4 flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-ink/10 pb-3">
        <div>
          <h1 className="font-sans font-semibold text-lg tracking-tight">Corpus</h1>
          <p className="text-xs text-slate">Web & PDF Research Highlighter</p>
        </div>
        <div className="flex items-center gap-1.5">
          {persistence.persisted ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Persisted
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              Standard
            </span>
          )}
        </div>
      </header>

      {/* Storage & Persistence Status Card */}
      <section className="bg-canvas p-3.5 rounded-xl border border-ink/5 shadow-soft flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-focus-start" />
            <span className="text-xs font-semibold text-ink">Storage Durability</span>
          </div>
          <button
            onClick={refreshPersistence}
            disabled={isPersistLoading}
            className="text-[11px] text-slate hover:text-ink flex items-center gap-1 transition-colors"
            title="Refresh storage estimate"
          >
            <RefreshCw className={`w-3 h-3 ${isPersistLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs bg-paper/60 p-2 rounded-lg border border-ink/5">
          <div>
            <span className="text-slate block text-[10px]">Quota:</span>
            <span className="font-medium text-ink">{formatBytes(persistence.quotaBytes)}</span>
          </div>
          <div>
            <span className="text-slate block text-[10px]">Used:</span>
            <span className="font-medium text-ink">{formatBytes(persistence.usageBytes)}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate leading-relaxed">
          {persistence.persisted
            ? '✓ Durable storage granted by browser. Data is protected against disk pressure eviction.'
            : '⚠ Storage is standard. Click below to request guaranteed persistent storage.'}
        </p>

        {!persistence.persisted && (
          <button
            onClick={refreshPersistence}
            className="w-full text-xs font-medium py-1.5 px-3 bg-ink text-white rounded-lg hover:bg-ink/90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Request Persistent Storage
          </button>
        )}
      </section>

      {/* SHA-256 PDF Identity & OPFS Ingest Section */}
      <section className="bg-canvas p-3.5 rounded-xl border border-ink/5 shadow-soft flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-focus-start" />
          <span className="text-xs font-semibold text-ink">PDF Content Identity & OPFS</span>
        </div>

        <p className="text-[11px] text-slate leading-relaxed">
          Test the deterministic SHA-256 identity hasher. Even if you rename the file on disk, its identity hash remains invariant.
        </p>

        <label className="border-2 border-dashed border-ink/15 hover:border-focus-start/50 bg-paper/40 hover:bg-paper/80 transition-all rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
          <UploadCloud className="w-5 h-5 text-slate" />
          <span className="text-xs font-medium text-ink">Choose PDF to hash & persist</span>
          <span className="text-[10px] text-slate">Verifies %PDF- magic bytes & computes SHA-256</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {hashingState.isLoading && (
          <div className="text-xs text-focus-start font-medium flex items-center justify-center gap-2 py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Computing SHA-256 & writing to OPFS...
          </div>
        )}

        {hashingState.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div>
              <span className="font-semibold block">Hash Error:</span>
              <span>{hashingState.error}</span>
            </div>
          </div>
        )}

        {hashingState.result && (
          <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg text-xs flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>PDF Validated & Fingerprinted</span>
            </div>
            <div className="font-mono text-[10px] text-ink break-all bg-white/70 p-1.5 rounded border border-emerald-100">
              <span className="text-slate block text-[9px]">SHA-256 Hash:</span>
              {hashingState.result.sha256}
            </div>
            <div className="flex justify-between text-[11px] text-slate">
              <span>Size: {formatBytes(hashingState.result.sizeBytes)}</span>
              <span>Format: PDF {hashingState.result.formatVersion || 'Valid'}</span>
              <span>OPFS: {hashingState.opfsSaved ? '✓ Saved' : 'N/A'}</span>
            </div>
          </div>
        )}

        {/* OPFS Stored Blobs summary */}
        {opfsFiles.length > 0 && (
          <div className="border-t border-ink/5 pt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] text-slate font-medium">
              <span className="flex items-center gap-1">
                <FolderOpen className="w-3 h-3 text-focus-start" />
                OPFS Stored Binaries ({opfsFiles.length})
              </span>
            </div>
            <div className="max-h-20 overflow-y-auto flex flex-col gap-1">
              {opfsFiles.map((file) => (
                <div key={file.filename} className="text-[10px] bg-paper/70 px-2 py-1 rounded flex justify-between items-center font-mono">
                  <span className="truncate max-w-[200px]" title={file.filename}>{file.filename}</span>
                  <span className="text-slate shrink-0">{formatBytes(file.sizeBytes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Workspace Quick Launchers */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            chrome.tabs.create({ url: chrome.runtime.getURL('library.html?mode=highlights') });
          }}
          className="text-xs font-semibold py-2 px-3 bg-canvas border border-ink/15 text-ink rounded-xl hover:bg-paper transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.99]"
        >
          <BookOpen className="w-3.5 h-3.5 text-focus-start" />
          <span>Library</span>
        </button>

        <button
          onClick={async () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('library.html?mode=editor') });
          }}
          className="text-xs font-semibold py-2 px-3 bg-ink text-white rounded-xl hover:bg-ink/90 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>New Draft</span>
        </button>
      </div>

      {/* Database Records Inspection Card */}
      <section className="bg-canvas p-3.5 rounded-xl border border-ink/5 shadow-soft flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-focus-start" />
            <span className="text-xs font-semibold text-ink">Dexie IndexedDB Records</span>
          </div>
          <span className="text-[10px] text-slate">{initDone ? 'Ready' : 'Initializing...'}</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-paper/70 p-2 rounded-lg border border-ink/5">
            <span className="text-base font-bold text-ink block">{sources?.length ?? 0}</span>
            <span className="text-[10px] text-slate">Sources</span>
          </div>
          <div className="bg-paper/70 p-2 rounded-lg border border-ink/5">
            <span className="text-base font-bold text-ink block">{highlights?.length ?? 0}</span>
            <span className="text-[10px] text-slate">Highlights</span>
          </div>
          <div className="bg-paper/70 p-2 rounded-lg border border-ink/5">
            <span className="text-base font-bold text-ink block">{documents?.length ?? 0}</span>
            <span className="text-[10px] text-slate">Docs</span>
          </div>
        </div>

        {/* Recent Sources List */}
        {sources && sources.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[10px] font-medium text-slate uppercase tracking-wider">Indexed Sources</span>
            <div className="max-h-28 overflow-y-auto flex flex-col gap-1.5">
              {sources.slice(0, 3).map((src) => (
                <div key={src.id} className="text-xs bg-paper/50 p-2 rounded-lg border border-ink/5 flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2 overflow-hidden">
                    <FileText className="w-3.5 h-3.5 text-slate mt-0.5 shrink-0" />
                    <div className="overflow-hidden">
                      <span className="font-medium text-ink truncate block text-[11px]">{src.title}</span>
                      <span className="font-mono text-[9px] text-slate truncate block">
                        {src.type.toUpperCase()} · {src.fingerprint.slice(0, 16)}...
                      </span>
                    </div>
                  </div>
                  {src.type === 'pdf' ? (
                    <button
                      onClick={() => {
                        chrome.tabs.create({ url: chrome.runtime.getURL(`viewer.html?hash=${src.fingerprint}`) });
                      }}
                      className="text-[10px] bg-canvas hover:bg-paper text-ink px-2 py-1 rounded border border-ink/10 font-medium shrink-0 shadow-xs transition-colors"
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        chrome.tabs.create({ url: src.url || src.fingerprint });
                      }}
                      className="text-[10px] bg-canvas hover:bg-paper text-ink px-2 py-1 rounded border border-ink/10 font-medium shrink-0 shadow-xs transition-colors"
                    >
                      Visit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Documents List */}
        {documents && documents.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2 border-t border-ink/5 pt-2">
            <span className="text-[10px] font-medium text-slate uppercase tracking-wider">Recent Drafts</span>
            <div className="max-h-24 overflow-y-auto flex flex-col gap-1.5">
              {documents.slice(0, 2).map((doc) => (
                <div key={doc.id} className="text-xs bg-paper/50 p-2 rounded-lg border border-ink/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <PenTool className="w-3.5 h-3.5 text-focus-end shrink-0" />
                    <span className="font-medium text-ink truncate text-[11px]">{doc.title}</span>
                  </div>
                  <button
                    onClick={() => {
                      chrome.tabs.create({ url: chrome.runtime.getURL(`library.html?mode=editor&doc=${doc.id}`) });
                    }}
                    className="text-[10px] bg-canvas hover:bg-paper text-ink px-2 py-1 rounded border border-ink/10 font-medium shrink-0 shadow-xs transition-colors"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Highlights List */}
        {highlights && highlights.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-2 border-t border-ink/5 pt-2">
            <span className="text-[10px] font-medium text-slate uppercase tracking-wider">Recent Highlights</span>
            <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5">
              {highlights.slice(0, 3).map((hl) => {
                const tagColors: Record<string, string> = {
                  amber: '#F5C64C',
                  violet: '#8B7CF6',
                  teal: '#4FB0A5',
                  coral: '#E8785A',
                };
                const dotColor = tagColors[hl.tag] || '#F5C64C';
                return (
                  <div key={hl.id} className="text-xs bg-paper/50 p-2 rounded-lg border border-ink/5 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-slate truncate max-w-[220px]">
                        {hl.sourceTitle}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: dotColor }}
                        title={hl.tag}
                      />
                    </div>
                    <p className="text-[11px] text-ink line-clamp-2 italic leading-snug">
                      "{hl.selectedText}"
                    </p>
                    {hl.note && (
                      <span className="text-[10px] text-focus-start font-medium truncate">
                        Note: {hl.note}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Trust Caption */}
      <footer className="text-center pt-1 border-t border-ink/5">
        <p className="text-[11px] text-slate italic">
          Stored only on this device. No data is ever transmitted to remote servers.
        </p>
      </footer>
    </div>
  );
}
