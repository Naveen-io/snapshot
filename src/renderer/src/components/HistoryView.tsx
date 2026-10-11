import React, { useState, useEffect } from 'react';
import { ScreenshotHistoryItem } from '@shared/types';
import {
  Search,
  Calendar,
  Clock,
  Trash2,
  Copy,
  Edit3,
  Folder,
  FileText,
  AlertTriangle,
  Check,
  HardDrive,
  Eye,
  Video,
  Play
} from 'lucide-react';
import { ScreenshotPreviewModal } from './ScreenshotPreviewModal';

interface HistoryViewProps {
  onOpenInEditor: (dataUrl: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onOpenInEditor }) => {
  const [items, setItems] = useState<ScreenshotHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<ScreenshotHistoryItem | null>(null);

  const handleUpdateOcrText = (id: string, text: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ocrText: text } : item)));
    if (selectedPreviewItem && selectedPreviewItem.id === id) {
      setSelectedPreviewItem((prev) => (prev ? { ...prev, ocrText: text } : null));
    }
  };

  const loadHistory = async () => {
    if (window.snapshotAPI) {
      const list = await window.snapshotAPI.getHistory();
      setItems(list || []);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleCopy = async (item: ScreenshotHistoryItem) => {
    if (window.snapshotAPI) {
      await window.snapshotAPI.copyImage(item.dataUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.snapshotAPI) {
      await window.snapshotAPI.deleteHistoryItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleClearAll = async () => {
    if (window.snapshotAPI) {
      await window.snapshotAPI.clearHistory();
      setItems([]);
      setShowClearConfirm(false);
    }
  };

  const handleShowInFolder = (filePath?: string) => {
    if (filePath && window.snapshotAPI) {
      window.snapshotAPI.showInFolder(filePath);
    }
  };

  // Filter and sort items
  const filteredItems = items
    .filter((item) => {
      // Query filter (filename or OCR text)
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesName = item.fileName.toLowerCase().includes(q);
        const matchesOcr = item.ocrText?.toLowerCase().includes(q);
        if (!matchesName && !matchesOcr) return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const created = new Date(item.createdAt).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateFilter === 'today' && now - created > oneDay) return false;
        if (dateFilter === 'week' && now - created > 7 * oneDay) return false;
        if (dateFilter === 'month' && now - created > 30 * oneDay) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return a.fileName.localeCompare(b.fileName);
    });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-app)' }}>
      {/* Search & Filter Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          gap: 12,
          flexWrap: 'wrap'
        }}
      >
        {/* Search input with OCR text search */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flex: 1, minWidth: 240, maxWidth: 400 }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 10 }} />
          <input
            type="text"
            placeholder="Search by filename or extracted OCR text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value as any)}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Alphabetical</option>
          </select>

          {items.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="ghost"
              style={{ color: 'var(--danger-primary)', padding: '6px 10px' }}
              title="Clear all screenshot history"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Screenshots */}
      <div style={{ flex: 1, padding: 18, overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <div
            style={{
              height: '60vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              gap: 12
            }}
          >
            <HardDrive size={36} color="var(--border-default)" />
            <span style={{ fontSize: 14 }}>No screenshots found matching your criteria.</span>
            <span style={{ fontSize: 12 }}>Use the capture shortcut (Ctrl+Shift+S) to take a screenshot.</span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16
            }}
          >
            {filteredItems.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Thumbnail */}
                <div
                  onClick={() => {
                    if (item.type === 'video') {
                      if (item.filePath) handleShowInFolder(item.filePath);
                    } else {
                      setSelectedPreviewItem(item);
                    }
                  }}
                  style={{
                    height: 160,
                    backgroundColor: '#0a0c10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  title={item.type === 'video' ? 'Click to reveal video in folder' : 'Click to Preview & Extract Text (OCR)'}
                >
                  {item.type === 'video' ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Play size={20} fill="#ef4444" color="#ef4444" style={{ marginLeft: 2 }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>Screen Recording</span>
                    </div>
                  ) : (
                    <img
                      src={item.thumbnailUrl || item.dataUrl}
                      alt={item.fileName}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}

                  {/* Video format or duration badge */}
                  {item.type === 'video' ? (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        backgroundColor: 'rgba(239, 68, 68, 0.85)',
                        color: '#ffffff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      <Video size={10} />
                      <span>{item.duration ? `${Math.floor(item.duration / 60)}:${(item.duration % 60).toString().padStart(2, '0')}` : 'REC'}</span>
                    </div>
                  ) : item.ocrText && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        backgroundColor: 'rgba(18, 19, 22, 0.88)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                      title="Contains extracted OCR text"
                    >
                      <FileText size={10} />
                      <span>OCR</span>
                    </div>
                  )}
                </div>

                {/* Info & Metadata */}
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 160
                      }}
                      title={item.fileName}
                    >
                      {item.fileName}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {item.width} × {item.height}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>{Math.round((item.fileSize || 0) / 1024)} KB</span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {item.type !== 'video' && (
                        <>
                          <button
                            onClick={() => setSelectedPreviewItem(item)}
                            className="ghost"
                            style={{ padding: '4px 6px', fontSize: 11 }}
                            title="Preview & Extract Text (OCR)"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            onClick={() => handleCopy(item)}
                            className="ghost"
                            style={{ padding: '4px 6px', fontSize: 11 }}
                            title="Copy to Clipboard"
                          >
                            {copiedId === item.id ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                          </button>

                          <button
                            onClick={() => onOpenInEditor(item.dataUrl)}
                            className="ghost"
                            style={{ padding: '4px 6px', fontSize: 11 }}
                            title="Edit in Screenshot Editor"
                          >
                            <Edit3 size={13} />
                          </button>
                        </>
                      )}

                      {item.filePath && (
                        <button
                          onClick={() => handleShowInFolder(item.filePath)}
                          className="ghost"
                          style={{ padding: '4px 6px', fontSize: 11 }}
                          title="Show file in Windows Explorer"
                        >
                          <Folder size={13} />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="ghost"
                      style={{ padding: '4px 6px', fontSize: 11, color: 'var(--danger-primary)' }}
                      title="Delete item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: 20,
              width: 380,
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--danger-primary)' }}>
              <AlertTriangle size={20} />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Clear All History?</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              This will permanently delete all cached captures and metadata from local history. Real files saved in your
              Pictures folder will not be touched.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button onClick={() => setShowClearConfirm(false)} className="ghost">
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="primary"
                style={{ backgroundColor: 'var(--danger-primary)', borderColor: 'var(--danger-primary)' }}
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Preview & Direct OCR Modal */}
      {selectedPreviewItem && (
        <ScreenshotPreviewModal
          item={selectedPreviewItem}
          onClose={() => setSelectedPreviewItem(null)}
          onOpenInEditor={(dataUrl) => {
            setSelectedPreviewItem(null);
            onOpenInEditor(dataUrl);
          }}
          onUpdateOcrText={handleUpdateOcrText}
        />
      )}
    </div>
  );
};
