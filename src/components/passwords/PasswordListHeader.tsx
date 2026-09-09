import React from 'react';
import { useVault } from '../../context/VaultContext';
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
} from 'lucide-react';

export const PasswordListHeader: React.FC = () => {
  const {
    filterOptions,
    setFilterOptions,
    categories,
    openCreatePasswordModal,
    selectedCategory,
    activeTab,
  } = useVault();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterOptions((prev) => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterOptions((prev) => ({ ...prev, category: e.target.value }));
  };

  const handleStrengthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterOptions((prev) => ({ ...prev, strength: e.target.value as any }));
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterOptions((prev) => ({ ...prev, sortBy: e.target.value as any }));
  };

  const toggleViewMode = (mode: 'grid' | 'table') => {
    setFilterOptions((prev) => ({ ...prev, viewMode: mode }));
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      {/* Title & Category Breadcrumb */}
      <div>
        <h1 className="text-xl font-bold text-white capitalize glow-text">
          {activeTab === 'trash'
            ? 'Trash Bin'
            : activeTab === 'favorites'
            ? 'Favorite Passwords'
            : selectedCategory !== 'All'
            ? `${selectedCategory} Passwords`
            : 'All Vault Passwords'}
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          {activeTab === 'trash'
            ? 'Items in trash can be restored or permanently deleted.'
            : 'Manage and copy your end-to-end encrypted password credentials.'}
        </p>
      </div>

      {/* Toolbar Controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Instant Search input */}
        <div className="relative flex-1 sm:w-60">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search credentials..."
            value={filterOptions.searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-800 bg-zinc-900 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-300">
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={filterOptions.category}
            onChange={handleCategoryChange}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-zinc-900">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name} className="bg-zinc-900">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Strength Filter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-300">
          <select
            value={filterOptions.strength}
            onChange={handleStrengthChange}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="All" className="bg-zinc-900">All Strengths</option>
            <option value="Weak" className="bg-zinc-900">Weak Passwords</option>
            <option value="Medium" className="bg-zinc-900">Medium Passwords</option>
            <option value="Strong" className="bg-zinc-900">Strong Passwords</option>
            <option value="Very Strong" className="bg-zinc-900">Very Strong</option>
          </select>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-300">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={filterOptions.sortBy}
            onChange={handleSortChange}
            className="bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="newest" className="bg-zinc-900">Newest First</option>
            <option value="oldest" className="bg-zinc-900">Oldest First</option>
            <option value="a-z" className="bg-zinc-900">Name (A-Z)</option>
            <option value="z-a" className="bg-zinc-900">Name (Z-A)</option>
            <option value="updated" className="bg-zinc-900">Recently Updated</option>
          </select>
        </div>

        {/* View Mode Switcher (Grid vs Table) */}
        <div className="flex items-center p-1 rounded-xl border border-zinc-800 bg-zinc-900">
          <button
            onClick={() => toggleViewMode('grid')}
            className={`p-1 rounded-lg text-xs transition-all ${
              filterOptions.viewMode === 'grid'
                ? 'bg-zinc-800 text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggleViewMode('table')}
            className={`p-1 rounded-lg text-xs transition-all ${
              filterOptions.viewMode === 'table'
                ? 'bg-zinc-800 text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Add Password CTA */}
        {activeTab !== 'trash' && (
          <button
            onClick={openCreatePasswordModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Credential</span>
          </button>
        )}
      </div>
    </div>
  );
};
