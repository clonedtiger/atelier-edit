'use client';

import React from 'react';

const CATEGORIES = [
  'All',
  'Outerwear',
  'Tops',
  'Bottoms',
  'Dresses',
  'Shoes',
  'Bags',
  'Jewelry',
  'Accessories',
];

interface FacetedFilterBarProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isSpreadsheetMode: boolean;
  onToggleSpreadsheetMode: () => void;
  totalCount: number;
  filteredCount: number;
}

export function FacetedFilterBar({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  isSpreadsheetMode,
  onToggleSpreadsheetMode,
  totalCount,
  filteredCount,
}: FacetedFilterBarProps) {
  return (
    <div className="flex flex-col space-y-4 mb-8 bg-[var(--bg-secondary)]/30 p-4 rounded-xl border border-[var(--border-color)]">
      {/* Top Filter Controls: Search & Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search brand, fabric, cut, color..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all font-sans"
          />
          <svg
            className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ✕
            </button>
          )}
        </div>

        {/* View Mode & Stats */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs text-[var(--text-muted)] tracking-wider uppercase font-semibold">
            Showing {filteredCount} of {totalCount} Items
          </span>

          <button
            onClick={onToggleSpreadsheetMode}
            className={`px-3 py-1.5 text-xs uppercase tracking-widest font-semibold rounded transition-all flex items-center gap-1.5 border ${
              isSpreadsheetMode
                ? 'bg-[var(--text-primary)] text-white border-[var(--text-primary)] shadow-sm'
                : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-primary)]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <span>{isSpreadsheetMode ? 'Grid View' : 'Spreadsheet Mode'}</span>
          </button>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <button
              key={category}
              onClick={() => onSelectCategory(category)}
              className={`px-3.5 py-1.5 text-xs uppercase tracking-widest font-semibold whitespace-nowrap rounded-full transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--bg-primary)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--border-color-hover)]'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}
