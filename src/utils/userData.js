const STORAGE_KEY = 'kyc_user_data';

const getStorage = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const saveStorage = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const addSearchHistory = (userId, entry) => {
  if (!userId) return;
  const data = getStorage();
  const userData = data[userId] || { history: [], favorites: [] };
  userData.history = [
    { ...entry, timestamp: entry.timestamp || new Date().toISOString() },
    ...userData.history.slice(0, 19),
  ];
  data[userId] = userData;
  saveStorage(data);
};

export const getSearchHistory = (userId) => {
  if (!userId) return [];
  const data = getStorage();
  return data[userId]?.history || [];
};

export const addFavoritePlace = (userId, place) => {
  if (!userId || !place?.name) return;
  const data = getStorage();
  const userData = data[userId] || { history: [], favorites: [] };
  const exists = userData.favorites.some((fav) => fav.name === place.name);
  if (!exists) {
    userData.favorites.unshift({ ...place, savedAt: new Date().toISOString() });
    userData.favorites = userData.favorites.slice(0, 30);
  }
  data[userId] = userData;
  saveStorage(data);
};

export const getFavoritePlaces = (userId) => {
  if (!userId) return [];
  const data = getStorage();
  return data[userId]?.favorites || [];
};

