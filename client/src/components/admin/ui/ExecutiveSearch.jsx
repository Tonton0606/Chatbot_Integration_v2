import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Clock,
  Bookmark,
  Filter,
  X,
  ArrowRight,
  TrendingUp,
  Users,
  Briefcase,
  CheckSquare,
  DollarSign,
  Users2,
  Book,
  Inbox,
} from "lucide-react";
import { Card } from "./index";
import { executiveSearch } from "../../../services/intelligence/search_service";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";

const MODULE_ICONS = {
  deals: TrendingUp,
  contacts: Users,
  projects: Briefcase,
  tasks: CheckSquare,
  revenue: DollarSign,
  team: Users2,
  knowledge: Book,
  inbox: Inbox,
};

const STATUS_COLORS = {
  active: "bg-green-500/15 text-green-400",
  pending: "bg-yellow-500/15 text-yellow-400",
  closed: "bg-gray-500/15 text-gray-300",
  completed: "bg-blue-500/15 text-blue-400",
  cancelled: "bg-red-500/15 text-red-400",
};

export default function ExecutiveSearch({ className = "" }) {
  const { isDark } = useTheme();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const searchTimeout = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    setSavedSearches(executiveSearch.getSavedSearches());
  }, []);

  const shouldShowDropdown =
    isOpen && (query.trim().length >= 2 || savedSearches.length > 0);

  const handleSearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setResults([]);
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setSelectedIndex(-1);

      try {
        const suggestionResults = await executiveSearch.getSuggestions(searchQuery);
        setSuggestions(suggestionResults);

        const searchResults = await executiveSearch.search(searchQuery, {
          modules: selectedFilter === "all" ? ["all"] : [selectedFilter],
          limit: 20,
        });

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedFilter]
  );

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length >= 2) setIsOpen(true);

    searchTimeout.current = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, handleSearch]);

  function handleKeyDown(event) {
    const totalItems = [...suggestions, ...results].length;

    switch (event.key) {
      case "ArrowDown":
        if (totalItems === 0) return;
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        break;
      case "ArrowUp":
        if (totalItems === 0) return;
        event.preventDefault();
        setSelectedIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
        break;
      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0) {
          const selectedItem = [...suggestions, ...results][selectedIndex];
          if (selectedItem) handleItemClick(selectedItem);
          return;
        }
        handleSearch(query);
        break;
      case "Escape":
        setIsOpen(false);
        setShowFilters(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  }

  function handleItemClick(item) {
    if (item?.url) {
      navigate(item.url, { state: { highlightId: item.id } });
    } else if (typeof item === "string") {
      setQuery(item);
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
    setShowFilters(false);
    setQuery("");
  }

  function handleFilterSelect(filter) {
    setSelectedFilter(filter);
    setShowFilters(false);

    if (query.trim().length >= 2) {
      handleSearch(query);
    }
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setSuggestions([]);
    setSelectedIndex(-1);
    setShowFilters(false);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function saveCurrentSearch() {
    if (query.trim().length < 2) return;

    const name = prompt("Enter a name for this saved search:");
    if (!name) return;

    executiveSearch.saveSearch(name, query, {
      modules: [selectedFilter],
    });

    setSavedSearches(executiveSearch.getSavedSearches());
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowFilters(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mutedText = isDark ? "text-gray-400" : "text-gray-500";
  const softText = isDark ? "text-gray-300" : "text-gray-700";
  const strongText = isDark ? "text-white" : "text-gray-900";
  const border = isDark ? "border-white/10" : "border-gray-100";
  const hover = isDark ? "hover:bg-white/5" : "hover:bg-gray-50";
  const selected = isDark ? "bg-white/10" : "bg-gray-100";

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedText}`} />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2 || savedSearches.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search deals, contacts, projects, tasks..."
          className={`w-full rounded-lg border py-2 pl-10 pr-10 text-sm outline-none transition-colors ${
            isDark
              ? "border-white/10 bg-white/5 text-white placeholder-gray-500 focus:ring-2 focus:ring-[#c9a84c]/50"
              : "border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#c9a84c]"
          }`}
        />

        {query && (
          <button
            type="button"
            onClick={clearSearch}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${mutedText} ${
              isDark ? "hover:text-white" : "hover:text-gray-600"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {shouldShowDropdown && (
        <Card
          className={`absolute left-0 right-0 top-full z-[80] mt-2 max-h-96 overflow-y-auto border shadow-xl ${
            isDark
              ? "border-white/10 bg-[#0d1525]"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="p-2">
            <div className={`mb-3 flex items-center gap-2 border-b pb-3 ${border}`}>
              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`flex items-center gap-1 px-2 py-1 text-xs ${mutedText} ${
                  isDark ? "hover:text-white" : "hover:text-gray-900"
                }`}
              >
                <Filter className="h-3 w-3" />
                {selectedFilter === "all" ? "All" : selectedFilter}
              </button>

              {query.trim().length >= 2 && (
                <button
                  type="button"
                  onClick={saveCurrentSearch}
                  className={`flex items-center gap-1 px-2 py-1 text-xs ${mutedText} ${
                    isDark ? "hover:text-white" : "hover:text-gray-900"
                  }`}
                >
                  <Bookmark className="h-3 w-3" />
                  Save
                </button>
              )}
            </div>

            {showFilters && (
              <div className={`mb-3 flex flex-wrap gap-1 border-b pb-3 ${border}`}>
                {["all", "deals", "contacts", "projects", "tasks", "revenue", "team", "knowledge", "inbox"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => handleFilterSelect(filter)}
                    className={`rounded px-2 py-1 text-xs ${
                      selectedFilter === filter
                        ? "bg-[#c9a84c] text-[#0a0e1a]"
                        : isDark
                        ? "bg-white/5 text-gray-300 hover:bg-white/10"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#c9a84c] border-t-transparent" />
                <span className={`ml-2 text-sm ${mutedText}`}>Searching...</span>
              </div>
            )}

            {!loading && suggestions.length > 0 && results.length === 0 && (
              <div className="mb-3">
                <div className={`flex items-center gap-2 px-2 py-1 text-xs ${mutedText}`}>
                  <Clock className="h-3 w-3" />
                  Suggestions
                </div>

                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleItemClick(suggestion)}
                    className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${softText} ${hover} ${
                      selectedIndex === index ? selected : ""
                    }`}
                  >
                    <Clock className={`h-3 w-3 ${mutedText}`} />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div>
                <div className={`px-2 py-1 text-xs ${mutedText}`}>
                  {results.length} results found
                </div>

                {results.map((result, index) => {
                  const Icon = MODULE_ICONS[result.module] || Search;
                  const globalIndex = suggestions.length + index;

                  return (
                    <button
                      key={`${result.module}-${result.id}`}
                      type="button"
                      onClick={() => handleItemClick(result)}
                      className={`flex w-full items-start gap-3 rounded px-3 py-2 text-left text-sm ${hover} ${
                        selectedIndex === globalIndex ? selected : ""
                      }`}
                    >
                      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${mutedText}`} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`truncate font-medium ${strongText}`}>
                            {result.title}
                          </span>

                          {result.status && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-xs ${
                                STATUS_COLORS[result.status] ||
                                "bg-gray-500/15 text-gray-300"
                              }`}
                            >
                              {result.status}
                            </span>
                          )}
                        </div>

                        {result.subtitle && (
                          <div className={`truncate text-xs ${mutedText}`}>
                            {result.subtitle}
                          </div>
                        )}

                        {result.description && (
                          <div className="mt-1 truncate text-xs text-gray-400">
                            {result.description}
                          </div>
                        )}
                      </div>

                      <ArrowRight className={`mt-0.5 h-3 w-3 flex-shrink-0 ${mutedText}`} />
                    </button>
                  );
                })}
              </div>
            )}

            {!loading &&
              query.trim().length >= 2 &&
              results.length === 0 &&
              suggestions.length === 0 && (
                <div className="py-8 text-center">
                  <Search className={`mx-auto mb-2 h-8 w-8 ${mutedText}`} />
                  <p className={`text-sm ${mutedText}`}>
                    No results found for "{query}"
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Try different keywords or filters.
                  </p>
                </div>
              )}

            {!loading && !query && savedSearches.length > 0 && (
              <div className={`mt-3 border-t pt-3 ${border}`}>
                <div className={`flex items-center gap-2 px-2 py-1 text-xs ${mutedText}`}>
                  <Bookmark className="h-3 w-3" />
                  Saved Searches
                </div>

                {savedSearches.slice(0, 3).map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={() => {
                      setQuery(saved.query);
                      handleFilterSelect(saved.options.modules?.[0] || "all");
                      setIsOpen(true);
                    }}
                    className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm ${hover}`}
                  >
                    <Bookmark className={`h-3 w-3 ${mutedText}`} />

                    <div>
                      <div className={`font-medium ${strongText}`}>
                        {saved.name}
                      </div>

                      <div className={`text-xs ${mutedText}`}>
                        {saved.query}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
