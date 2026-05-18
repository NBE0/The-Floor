import React, { useState } from 'react';
import { useImageDb } from '../context/ImageDbContext';

export default function CategoryList() {
  const { categoryList, deleteCategory, isFetching } = useImageDb();
  const [isExpanded, setIsExpanded] = useState(true);

  const allReady = categoryList.length > 0 &&
    categoryList.every(c => c.imageCount > 0);

  return (
    <div className="w-full bg-floor-surface rounded-2xl shadow-2xl overflow-hidden">

      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4
                   hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-floor-text/70 text-sm uppercase tracking-widest font-semibold">
            Categories
          </span>
          <span className="text-floor-text/30 text-xs">
            {categoryList.length} total
          </span>
          {allReady && (
            <span className="text-floor-accent text-xs">● ready</span>
          )}
        </div>
        <span className="text-floor-text/30 text-lg leading-none">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          {categoryList.length > 0 ? (
            <ul className="space-y-2">
              {categoryList.map(cat => (
                <li
                  key={cat.name}
                  className="flex items-center gap-3 bg-floor-bg rounded-lg px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-floor-text text-sm font-medium truncate block">
                      {cat.name}
                    </span>
                    <span className="text-floor-text/30 text-xs">
                      {cat.itemCount > 0
                        ? `${cat.imageCount} / ${cat.itemCount} images`
                        : 'No items yet — run Fetch in AI Studio'}
                    </span>
                  </div>

                  {cat.imageCount > 0 && (
                    <span className="text-floor-accent text-xs bg-floor-accent/10
                                     px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                      {cat.imageCount} imgs
                    </span>
                  )}

                  <button
                    onClick={() => deleteCategory(cat.name)}
                    disabled={isFetching}
                    aria-label={`Delete ${cat.name}`}
                    className="text-white/20 hover:text-floor-accent transition-colors
                               text-lg leading-none flex-shrink-0 disabled:opacity-30
                               disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-floor-text/30 text-sm text-center py-2">
              No categories yet. Add one in the AI Studio.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
