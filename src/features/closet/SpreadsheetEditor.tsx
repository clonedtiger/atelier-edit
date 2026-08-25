'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { WardrobeItem } from './GarmentCard';

interface SpreadsheetEditorProps {
  items: WardrobeItem[];
  onSaveItem: (item: WardrobeItem) => Promise<void>;
  onBulkUpdateBrand: (ids: string[], brand: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

export function SpreadsheetEditor({
  items,
  onSaveItem,
  onBulkUpdateBrand,
  onDeleteItem,
}: SpreadsheetEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBrand, setBulkBrand] = useState('');
  const [editingRows, setEditingRows] = useState<Record<string, Partial<WardrobeItem>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFieldChange = (id: string, field: keyof WardrobeItem, value: string | string[]) => {
    setEditingRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveRow = async (originalItem: WardrobeItem) => {
    const changes = editingRows[originalItem.id];
    if (!changes) return;

    setIsSaving(true);
    try {
      const updated: WardrobeItem = {
        ...originalItem,
        ...changes,
      };
      await onSaveItem(updated);
      setEditingRows((prev) => {
        const next = { ...prev };
        delete next[originalItem.id];
        return next;
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyBulkBrand = async () => {
    if (!bulkBrand.trim() || selectedIds.length === 0) return;
    setIsSaving(true);
    try {
      await onBulkUpdateBrand(selectedIds, bulkBrand.trim());
      setBulkBrand('');
      setSelectedIds([]);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Bulk Operation Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-bold text-[var(--accent)]">
              {selectedIds.length} {selectedIds.length === 1 ? 'Item' : 'Items'} Selected
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Set Brand for Selected..."
              value={bulkBrand}
              onChange={(e) => setBulkBrand(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-[var(--text-primary)]"
            />
            <button
              onClick={handleApplyBulkBrand}
              disabled={isSaving || !bulkBrand.trim()}
              className="px-3 py-1.5 text-xs uppercase tracking-widest font-bold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] rounded transition-colors disabled:opacity-50"
            >
              Apply Brand
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div className="overflow-x-auto border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] shadow-sm">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] uppercase tracking-widest border-b border-[var(--border-color)]">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={items.length > 0 && selectedIds.length === items.length}
                  onChange={toggleSelectAll}
                  className="accent-[var(--accent)] cursor-pointer"
                />
              </th>
              <th className="p-3 w-16">Visual</th>
              <th className="p-3 w-32">Category</th>
              <th className="p-3 w-40">Brand</th>
              <th className="p-3">Style Notes</th>
              <th className="p-3 w-48">Detected Tags</th>
              <th className="p-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]/60">
            {items.map((item) => {
              const edit = editingRows[item.id] || {};
              const category = edit.category ?? item.category;
              const brand = edit.brand ?? (item.brand || '');
              const styleNotes = edit.styleNotes ?? (item.styleNotes || '');
              const tags = edit.detectedTags ?? item.detectedTags;
              const isDirty = Boolean(editingRows[item.id]);

              return (
                <tr
                  key={item.id}
                  className={`hover:bg-[var(--bg-secondary)]/30 transition-colors ${
                    selectedIds.includes(item.id) ? 'bg-[var(--bg-secondary)]/40' : ''
                  }`}
                >
                  {/* Select */}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="accent-[var(--accent)] cursor-pointer"
                    />
                  </td>

                  {/* Thumbnail */}
                  <td className="p-3">
                    <div className="relative w-12 h-16 rounded overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <Image
                        src={item.imageUrl}
                        alt={item.category}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  </td>

                  {/* Category Dropdown */}
                  <td className="p-3">
                    <select
                      value={category}
                      onChange={(e) => handleFieldChange(item.id, 'category', e.target.value)}
                      className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)]"
                    >
                      <option value="Outerwear">Outerwear</option>
                      <option value="Tops">Tops</option>
                      <option value="Bottoms">Bottoms</option>
                      <option value="Dresses">Dresses</option>
                      <option value="Shoes">Shoes</option>
                      <option value="Bags">Bags</option>
                      <option value="Jewelry">Jewelry</option>
                      <option value="Accessories">Accessories</option>
                    </select>
                  </td>

                  {/* Brand Input */}
                  <td className="p-3">
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => handleFieldChange(item.id, 'brand', e.target.value)}
                      placeholder="e.g. Chanel"
                      className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)]"
                    />
                  </td>

                  {/* Style Notes Input */}
                  <td className="p-3">
                    <input
                      type="text"
                      value={styleNotes}
                      onChange={(e) => handleFieldChange(item.id, 'styleNotes', e.target.value)}
                      placeholder="Cut, silhouette, fabric..."
                      className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)]"
                    />
                  </td>

                  {/* Tags Input */}
                  <td className="p-3">
                    <input
                      type="text"
                      value={Array.isArray(tags) ? tags.join(', ') : ''}
                      onChange={(e) =>
                        handleFieldChange(
                          item.id,
                          'detectedTags',
                          e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                        )
                      }
                      placeholder="tweed, cropped, gold..."
                      className="w-full px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded text-xs text-[var(--text-primary)] font-mono"
                    />
                  </td>

                  {/* Row Actions */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      {isDirty && (
                        <button
                          onClick={() => handleSaveRow(item)}
                          disabled={isSaving}
                          className="px-2 py-1 text-[10px] uppercase font-bold bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)]"
                        >
                          Save
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="p-1 text-[var(--text-muted)] hover:text-rose-600 rounded"
                        aria-label="Delete item"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
