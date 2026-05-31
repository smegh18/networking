import { create } from 'zustand';
import type { User, Chapter } from '../types';
import { normalizeStringArray, normalizeTextLower } from '../utils/helpers';

interface NetworkFilters {
  selectedChapter: string | null;
  selectedLocation: string | null;
  selectedTags: string[];
}

interface NetworkState {
  users: User[];
  filteredUsers: User[];
  chapters: Chapter[];
  selectedChapter: string | null;
  selectedLocation: string | null;
  selectedTags: string[];
  searchQuery: string;
  isLoading: boolean;
}

interface NetworkActions {
  setUsers: (users: User[]) => void;
  setFilteredUsers: (filteredUsers: User[]) => void;
  setChapters: (chapters: Chapter[]) => void;
  setFilters: (filters: Partial<NetworkFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (searchQuery: string) => void;
  applyFilters: () => void;
  setLoading: (isLoading: boolean) => void;
}

type NetworkStore = NetworkState & NetworkActions;

const initialFilters: NetworkFilters = {
  selectedChapter: null,
  selectedLocation: null,
  selectedTags: [],
};

export const useNetworkStore = create<NetworkStore>((set, get) => ({
  users: [],
  filteredUsers: [],
  chapters: [],
  ...initialFilters,
  searchQuery: '',
  isLoading: false,

  setUsers: (users) => set({ users, filteredUsers: users }),

  setFilteredUsers: (filteredUsers) => set({ filteredUsers }),

  setChapters: (chapters) => set({ chapters }),

  setFilters: (filters) =>
    set((state) => ({
      ...state,
      ...filters,
    })),

  clearFilters: () =>
    set((state) => ({
      ...initialFilters,
      searchQuery: '',
      filteredUsers: state.users,
    })),

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  applyFilters: () => {
    const { users, selectedChapter, selectedLocation, selectedTags, searchQuery } = get();

    let filtered = [...users];

    // Filter by chapter
    if (selectedChapter) {
      filtered = filtered.filter((user) => user.chapterId === selectedChapter);
    }

    // Filter by location (city or state)
    if (selectedLocation) {
      const locationLower = normalizeTextLower(selectedLocation);
      filtered = filtered.filter(
        (user) =>
          normalizeTextLower(user.location?.city).includes(locationLower) ||
          normalizeTextLower(user.location?.state).includes(locationLower),
      );
    }

    // Filter by tags (match any of the selected tags)
    if (selectedTags.length > 0) {
      const normalizedSelectedTags = selectedTags.map((tag) => normalizeTextLower(tag));
      filtered = filtered.filter((user) =>
        normalizeStringArray(user.businessTags).some((tag) =>
          normalizedSelectedTags.includes(normalizeTextLower(tag)),
        ),
      );
    }

    // Filter by search query (name, business name, or category)
    if (searchQuery.trim()) {
      const queryLower = normalizeTextLower(searchQuery);
      filtered = filtered.filter(
        (user) =>
          normalizeTextLower(user.name).includes(queryLower) ||
          normalizeTextLower(user.businessName).includes(queryLower) ||
          normalizeTextLower(user.businessCategory).includes(queryLower) ||
          normalizeStringArray(user.businessTags).some((tag) => normalizeTextLower(tag).includes(queryLower)),
      );
    }

    set({ filteredUsers: filtered });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
