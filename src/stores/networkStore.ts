import { create } from 'zustand';
import type { User, Chapter, Zone } from '../types';

interface NetworkFilters {
  selectedChapter: string | null;
  selectedLocation: string | null;
  selectedTags: string[];
}

interface NetworkState {
  users: User[];
  filteredUsers: User[];
  chapters: Chapter[];
  zones: Zone[];
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
  setZones: (zones: Zone[]) => void;
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
  zones: [],
  ...initialFilters,
  searchQuery: '',
  isLoading: false,

  setUsers: (users) => set({ users, filteredUsers: users }),

  setFilteredUsers: (filteredUsers) => set({ filteredUsers }),

  setChapters: (chapters) => set({ chapters }),

  setZones: (zones) => set({ zones }),

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
      const locationLower = selectedLocation.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.location.city.toLowerCase().includes(locationLower) ||
          user.location.state.toLowerCase().includes(locationLower),
      );
    }

    // Filter by tags (match any of the selected tags)
    if (selectedTags.length > 0) {
      filtered = filtered.filter((user) =>
        user.businessTags.some((tag) =>
          selectedTags.map((t) => t.toLowerCase()).includes(tag.toLowerCase()),
        ),
      );
    }

    // Filter by search query (name, business name, or category)
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(queryLower) ||
          user.businessName.toLowerCase().includes(queryLower) ||
          user.businessCategory.toLowerCase().includes(queryLower) ||
          user.businessTags.some((tag) => tag.toLowerCase().includes(queryLower)),
      );
    }

    set({ filteredUsers: filtered });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
