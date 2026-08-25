'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';

interface BatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function BatchUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: BatchUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [customBrand, setCustomBrand] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const urls: string[] = [];

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
        urls.push(URL.createObjectURL(file));
      }
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...urls]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleClearAll = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setProgressStatus(null);
  };

  const handleUploadBatch = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProgressStatus(`Ingesting & Tagging Item ${i + 1} of ${selectedFiles.length} with Gemini Vision...`);

        const formData = new FormData();
        formData.append('image', file);
        if (customBrand.trim()) formData.append('brand', customBrand.trim());
        if (customNotes.trim()) formData.append('styleNotes', customNotes.trim());

        const res = await fetch('/api/wardrobe/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        }
      }

      setProgressStatus(`Successfully added ${successCount} garments to your closet.`);
      setTimeout(() => {
        handleClearAll();
        onUploadSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Batch upload error:', err);
      setProgressStatus('Upload failed. Please check network connection.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isUploading && onClose()}
      title="Add Garments to Atelier"
      subtitle="AI Image Ingestion & Automated Styling Tag Extraction"
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Drag & Drop Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFilesSelected(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-[var(--border-color-hover)] hover:border-[var(--accent)] rounded-xl p-8 text-center cursor-pointer bg-[var(--bg-secondary)]/30 hover:bg-[var(--bg-secondary)]/50 transition-all flex flex-col items-center justify-center space-y-3"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-[var(--accent)] shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
              Drop Garment Photos Here or Click to Browse
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Supports JPEG, PNG, WebP, HEIC. Upload single pieces or multi-garment batches.
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </div>

        {/* Selected Images Grid Preview */}
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-[var(--text-primary)]">
                {selectedFiles.length} Selected Image{selectedFiles.length === 1 ? '' : 's'}
              </span>
              <button
                onClick={handleClearAll}
                disabled={isUploading}
                className="text-xs text-rose-600 uppercase tracking-widest font-semibold hover:underline"
              >
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-56 overflow-y-auto p-1">
              {previewUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[3/4] rounded-lg overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)] group"
                >
                  <Image src={url} alt={`Preview ${idx}`} fill sizes="100px" className="object-cover" />
                  {!isUploading && (
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Metadata Overrides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-color)]">
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Brand Override (Optional)
            </label>
            <input
              type="text"
              value={customBrand}
              onChange={(e) => setCustomBrand(e.target.value)}
              placeholder="e.g. Chanel, McQueen, Toteme"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">
              Custom Style Notes (Optional)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Heavy tweed, gold buttons, vintage"
              className="w-full px-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Progress & Upload Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-color)]">
          <span className="text-xs text-[var(--text-secondary)] italic">
            {progressStatus || (selectedFiles.length > 0 ? `${selectedFiles.length} file(s) ready for Gemini AI vision analysis` : 'Select files to begin')}
          </span>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="w-full sm:w-auto px-4 py-2 text-xs uppercase tracking-widest font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadBatch}
              disabled={isUploading || selectedFiles.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded-lg shadow-md transition-all disabled:opacity-50"
            >
              {isUploading ? 'Ingesting Batch...' : `Upload & Analyze (${selectedFiles.length})`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
