import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

const ImageDbContext = createContext(null);

// db shape: { [categoryName]: { [item]: imageUrl | null } }
export function ImageDbProvider({ children }) {
  const [db, setDb] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/imageDb.json')
      .then(res => (res.ok ? res.json() : {}))
      .then(data => {
        setDb(data ?? {});
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const categoryList = useMemo(
    () => Object.keys(db).map(name => ({
      name,
      itemCount: Object.keys(db[name] || {}).length,
      imageCount: Object.values(db[name] || {}).filter(Boolean).length,
    })),
    [db]
  );

  const addCategory = useCallback((name) => {
    setDb(prev => (prev[name] ? prev : { ...prev, [name]: {} }));
  }, []);

  const deleteCategory = useCallback((name) => {
    setDb(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setItems = useCallback((category, items) => {
    setDb(prev => {
      const existing = prev[category] || {};
      const merged = {};
      for (const item of items) {
        merged[item] = existing[item] ?? null;
      }
      return { ...prev, [category]: merged };
    });
  }, []);

  const setImage = useCallback((category, item, url) => {
    setDb(prev => ({
      ...prev,
      [category]: { ...(prev[category] || {}), [item]: url },
    }));
  }, []);

  const getImagesForCategory = useCallback((category) => {
    const cat = db[category] || {};
    return Object.values(cat).filter(Boolean);
  }, [db]);

  const getItemsNeedingImages = useCallback((category) => {
    const cat = db[category] || {};
    return Object.entries(cat).filter(([, url]) => !url).map(([item]) => item);
  }, [db]);

  const value = {
    db,
    loaded,
    categoryList,
    addCategory,
    deleteCategory,
    setItems,
    setImage,
    getImagesForCategory,
    getItemsNeedingImages,
  };

  return (
    <ImageDbContext.Provider value={value}>
      {children}
    </ImageDbContext.Provider>
  );
}

export function useImageDb() {
  const ctx = useContext(ImageDbContext);
  if (ctx === null) {
    throw new Error('useImageDb must be used within an <ImageDbProvider>.');
  }
  return ctx;
}
