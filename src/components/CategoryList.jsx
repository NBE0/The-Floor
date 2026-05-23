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
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {categoryList.map(cat => {
                const ratio = cat.itemCount > 0 ? cat.imageCount / cat.itemCount : 0;
                const complete = cat.itemCount > 0 && cat.imageCount >= cat.itemCount;
                const empty = cat.itemCount === 0;
                return (
                  <li
                    key={cat.name}
                    className="bg-floor-bg rounded-lg px-3 py-2 space-y-1.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-floor-text text-sm font-medium truncate block">
                          {cat.name}
                        </span>
                      </div>
                      <span className="text-floor-text/40 text-xs whitespace-nowrap flex-shrink-0">
                        {empty
                          ? 'no items yet'
                          : `${cat.imageCount} / ${cat.itemCount}`}
                      </span>
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
                    </div>
                    <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                      {empty ? (
                        <div className="h-full w-1/3 bg-white/10 animate-pulse rounded-full" />
                      ) : (
                        <div
                          className={`h-full rounded-full transition-all duration-300
                                      ${complete ? 'bg-floor-gold' : 'bg-floor-gold/70'}`}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-floor-text/30 text-sm text-center py-2">
              No categories yet. Add one above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
