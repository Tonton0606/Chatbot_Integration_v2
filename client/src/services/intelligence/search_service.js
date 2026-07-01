import { supabase } from "../../config/supabaseClient";

const RECENT_SEARCHES_KEY = "executiveSearch_recent";
const SAVED_SEARCHES_KEY = "executiveSearch_saved";

const ADMIN_SEARCH_MODULES = {
  erp_registry: {
    label: "ERP Registry",
  },
  workspace_administration: {
    label: "Workspace Administration",
  },
  workspace_access: {
    label: "Workspace Access",
  },
  contacts: {
    table: "contacts",
    module: "contacts",
    url: "/Admin/Contacts",
    titleFields: ["full_name", "name", "company_name"],
    subtitleFields: ["email", "phone"],
    descriptionFields: ["company_name", "notes", "source"],
    searchFields: [
      "full_name",
      "name",
      "email",
      "phone",
      "company_name",
      "notes",
    ],
  },
  deals: {
    table: "deals",
    module: "deals",
    url: "/Admin/Deals",
    titleFields: ["title", "name"],
    subtitleFields: ["company_name", "status"],
    descriptionFields: ["description", "notes"],
    searchFields: [
      "title",
      "name",
      "company_name",
      "description",
      "notes",
      "status",
    ],
  },
  projects: {
    table: "admin_projects",
    fallbackTables: ["projects", "client_projects"],
    module: "projects",
    url: "/Admin/Projects",
    titleFields: ["title", "name"],
    subtitleFields: ["client_name", "company_name", "status"],
    descriptionFields: ["description", "notes"],
    searchFields: [
      "title",
      "name",
      "client_name",
      "company_name",
      "description",
      "notes",
      "status",
    ],
  },
  tasks: {
    table: "admin_tasks",
    fallbackTables: ["tasks", "client_tasks"],
    module: "tasks",
    url: "/Admin/Tasks",
    titleFields: ["title", "name"],
    subtitleFields: ["status", "priority"],
    descriptionFields: ["description", "notes"],
    searchFields: ["title", "name", "description", "notes", "status", "priority"],
  },
  inbox: {
    table: "inbox_threads",
    fallbackTables: ["conversations"],
    module: "inbox",
    url: "/Admin/Inbox",
    titleFields: ["subject", "title"],
    subtitleFields: ["status"],
    descriptionFields: ["last_message_preview", "message"],
    searchFields: ["subject", "title", "last_message_preview", "message", "status"],
  },
};

class ExecutiveSearchService {
  constructor() {
    this.searchCache = new Map();
    this.recentSearches = this.readStorage(RECENT_SEARCHES_KEY, []);
    this.savedSearches = this.readStorage(SAVED_SEARCHES_KEY, []);
  }

  readStorage(key, fallback) {
    try {
      if (typeof window === "undefined") return fallback;

      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  writeStorage(key, value) {
    try {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures.
    }
  }

  normalizeQuery(query) {
    return String(query || "").trim();
  }

  escapeSearchValue(value) {
    return String(value || "")
      .replaceAll("\\", "\\\\")
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_")
      .replaceAll(",", "\\,")
      .trim();
  }

  async search(query, options = {}) {
    const { modules = ["all"], limit = 20, filters = {} } = options;

    const cleanQuery = this.normalizeQuery(query);

    if (!cleanQuery || cleanQuery.length < 2) {
      return [];
    }

    const cacheKey = `${cleanQuery}_${JSON.stringify({
      modules,
      limit,
      filters,
    })}`;

    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const shouldSearch = (moduleKey) =>
      modules.includes("all") || modules.includes(moduleKey);

    try {
      const searchJobs = [];

      if (shouldSearch("erp_registry")) {
        searchJobs.push(this.searchERPRegistry(cleanQuery));
      }

      if (shouldSearch("workspace_administration")) {
        searchJobs.push(this.searchWorkspaces(cleanQuery));
      }

      if (shouldSearch("workspace_access")) {
        searchJobs.push(this.searchWorkspaceAccess(cleanQuery));
      }

      Object.entries(ADMIN_SEARCH_MODULES).forEach(([moduleKey, config]) => {
        if (!config.table) return;

        if (shouldSearch(moduleKey)) {
          searchJobs.push(this.searchOptionalTable(cleanQuery, config));
        }
      });

      const settled = await Promise.allSettled(searchJobs);

      let results = [];

      for (const result of settled) {
        if (result.status === "fulfilled") {
          results = results.concat(result.value || []);
        }
      }

      results.sort(
        (a, b) =>
          (b.relevanceScore || 0) - (a.relevanceScore || 0) ||
          String(a.title || "").localeCompare(String(b.title || ""))
      );

      const finalResults = results.slice(0, limit);

      this.searchCache.set(cacheKey, finalResults);

      setTimeout(() => {
        this.searchCache.delete(cacheKey);
      }, 300000);

      this.addToRecentSearches(cleanQuery);

      return finalResults;
    } catch (error) {
      console.error("Executive search error:", error);
      return [];
    }
  }

  async searchERPRegistry(query) {
    const safeQuery = this.escapeSearchValue(query);

    const [divisionResult, featureResult] = await Promise.allSettled([
      supabase
        .from("erp_divisions")
        .select("id, division_key, title, description, status, status_note")
        .or(
          [
            `division_key.ilike.%${safeQuery}%`,
            `title.ilike.%${safeQuery}%`,
            `description.ilike.%${safeQuery}%`,
            `status.ilike.%${safeQuery}%`,
            `status_note.ilike.%${safeQuery}%`,
          ].join(",")
        )
        .limit(10),

      supabase
        .from("erp_features")
        .select(
          `
          id,
          feature_key,
          label,
          description,
          admin_route,
          client_route,
          status,
          status_note,
          division:division_id (
            title,
            division_key
          )
        `
        )
        .or(
          [
            `feature_key.ilike.%${safeQuery}%`,
            `label.ilike.%${safeQuery}%`,
            `description.ilike.%${safeQuery}%`,
            `admin_route.ilike.%${safeQuery}%`,
            `client_route.ilike.%${safeQuery}%`,
            `status.ilike.%${safeQuery}%`,
            `status_note.ilike.%${safeQuery}%`,
          ].join(",")
        )
        .limit(15),
    ]);

    const results = [];

    if (divisionResult.status === "fulfilled" && !divisionResult.value.error) {
      for (const division of divisionResult.value.data || []) {
        results.push({
          id: division.id,
          module: "erp_registry",
          title: division.title || division.division_key || "ERP Division",
          subtitle: `Division · ${division.division_key}`,
          description: division.description || division.status_note,
          status: division.status,
          url: "/Admin/ERPRegistry",
          relevanceScore: this.calculateRelevance(query, [
            division.title,
            division.division_key,
            division.description,
            division.status,
          ]),
        });
      }
    }

    if (featureResult.status === "fulfilled" && !featureResult.value.error) {
      for (const feature of featureResult.value.data || []) {
        results.push({
          id: feature.id,
          module: "erp_registry",
          title: feature.label || feature.feature_key || "ERP Feature",
          subtitle: `Feature · ${feature.feature_key} · ${
            feature.division?.title || "No division"
          }`,
          description:
            feature.description || feature.admin_route || feature.client_route,
          status: feature.status,
          url: "/Admin/ERPRegistry",
          relevanceScore: this.calculateRelevance(query, [
            feature.label,
            feature.feature_key,
            feature.description,
            feature.admin_route,
            feature.client_route,
            feature.status,
            feature.division?.title,
          ]),
        });
      }
    }

    return results;
  }

  async searchWorkspaces(query) {
    const safeQuery = this.escapeSearchValue(query);

    const { data, error } = await supabase
      .from("workspaces")
      .select(
        `
        id,
        name,
        workspace_type,
        status,
        owner_user_id,
        owner:owner_user_id (
          id,
          email,
          full_name,
          role,
          status
        )
      `
      )
      .or(
        [
          `name.ilike.%${safeQuery}%`,
          `workspace_type.ilike.%${safeQuery}%`,
          `status.ilike.%${safeQuery}%`,
        ].join(",")
      )
      .limit(15);

    if (error) {
      console.warn("Workspace search skipped:", error.message);
      return [];
    }

    return (data || []).map((workspace) => ({
      id: workspace.id,
      module: "workspace_administration",
      title: workspace.name || "Untitled Workspace",
      subtitle: `${workspace.workspace_type || "standard"} workspace · Owner: ${
        workspace.owner?.full_name || workspace.owner?.email || "Unassigned"
      }`,
      description: `Status: ${workspace.status || "unknown"}`,
      status: workspace.status,
      url: "/Admin/WorkspaceAdministration",
      relevanceScore: this.calculateRelevance(query, [
        workspace.name,
        workspace.workspace_type,
        workspace.status,
        workspace.owner?.full_name,
        workspace.owner?.email,
      ]),
    }));
  }

  async searchWorkspaceAccess(query) {
    const safeQuery = this.escapeSearchValue(query);

    const [divisionAccessResult, featureAccessResult] = await Promise.allSettled(
      [
        supabase
          .from("workspace_division_access")
          .select(
            `
          id,
          workspace_id,
          division_key,
          is_enabled,
          workspaces:workspace_id (
            name,
            workspace_type,
            status
          )
        `
          )
          .or(`division_key.ilike.%${safeQuery}%`)
          .limit(10),

        supabase
          .from("workspace_feature_access")
          .select(
            `
          id,
          workspace_id,
          feature_key,
          is_enabled,
          access_source,
          workspaces:workspace_id (
            name,
            workspace_type,
            status
          )
        `
          )
          .or(
            [
              `feature_key.ilike.%${safeQuery}%`,
              `access_source.ilike.%${safeQuery}%`,
            ].join(",")
          )
          .limit(15),
      ]
    );

    const results = [];

    if (
      divisionAccessResult.status === "fulfilled" &&
      !divisionAccessResult.value.error
    ) {
      for (const row of divisionAccessResult.value.data || []) {
        results.push({
          id: row.id,
          module: "workspace_access",
          title: row.division_key || "Division Access",
          subtitle: `Division access · ${row.workspaces?.name || "Workspace"}`,
          description: row.is_enabled ? "Enabled" : "Disabled",
          status: row.is_enabled ? "active" : "disabled",
          url: "/Admin/WorkspaceAccess",
          relevanceScore: this.calculateRelevance(query, [
            row.division_key,
            row.workspaces?.name,
            row.workspaces?.workspace_type,
          ]),
        });
      }
    }

    if (
      featureAccessResult.status === "fulfilled" &&
      !featureAccessResult.value.error
    ) {
      for (const row of featureAccessResult.value.data || []) {
        results.push({
          id: row.id,
          module: "workspace_access",
          title: row.feature_key || "Feature Access",
          subtitle: `Feature access · ${row.workspaces?.name || "Workspace"}`,
          description: `Source: ${row.access_source || "manual"}`,
          status: row.is_enabled ? "active" : "disabled",
          url: "/Admin/WorkspaceAccess",
          relevanceScore: this.calculateRelevance(query, [
            row.feature_key,
            row.access_source,
            row.workspaces?.name,
            row.workspaces?.workspace_type,
          ]),
        });
      }
    }

    return results;
  }

  async searchOptionalTable(query, config) {
    const tables = [config.table, ...(config.fallbackTables || [])];

    for (const table of tables) {
      const results = await this.trySearchTable(query, {
        ...config,
        table,
      });

      if (results !== null) {
        return results;
      }
    }

    return [];
  }

  async trySearchTable(query, config) {
    const safeQuery = this.escapeSearchValue(query);
    const searchableColumns = config.searchFields || [];

    const orFilter = searchableColumns
      .map((field) => `${field}.ilike.%${safeQuery}%`)
      .join(",");

    if (!orFilter) return [];

    const selectColumns = this.buildSelectColumns(config);

    try {
      const { data, error } = await supabase
        .from(config.table)
        .select(selectColumns)
        .or(orFilter)
        .limit(10);

      if (error) {
        console.warn(`Search skipped for ${config.table}:`, error.message);
        return null;
      }

      return (data || []).map((row) => ({
        id: row.id,
        module: config.module,
        title: this.firstValue(row, config.titleFields) || "Untitled",
        subtitle: this.firstValue(row, config.subtitleFields),
        description: this.firstValue(row, config.descriptionFields),
        status: row.status || row.priority || null,
        url: config.url,
        relevanceScore: this.calculateRelevance(query, [
          ...searchableColumns.map((field) => row[field]),
          this.firstValue(row, config.titleFields),
          this.firstValue(row, config.subtitleFields),
        ]),
      }));
    } catch (error) {
      console.warn(`Search failed for ${config.table}:`, error.message);
      return null;
    }
  }

  buildSelectColumns(config) {
    const columns = new Set([
      "id",
      "status",
      "priority",
      ...(config.titleFields || []),
      ...(config.subtitleFields || []),
      ...(config.descriptionFields || []),
      ...(config.searchFields || []),
    ]);

    return [...columns].filter(Boolean).join(",");
  }

  firstValue(row, fields = []) {
    for (const field of fields) {
      if (row?.[field]) return row[field];
    }

    return "";
  }

  calculateRelevance(query, fields = []) {
    let score = 0;
    const queryLower = String(query || "").toLowerCase();

    fields.forEach((field) => {
      if (!field) return;

      const value = String(field).toLowerCase();

      if (value === queryLower) score += 100;
      else if (value.startsWith(queryLower)) score += 75;
      else if (value.includes(queryLower)) score += 50;
      else if (queryLower.includes(value)) score += 25;
    });

    return score;
  }

  async getSuggestions(query) {
    if (!query || query.trim().length < 2) return [];

    const queryLower = query.toLowerCase();

    const recentMatches = this.recentSearches
      .filter((search) => search.toLowerCase().includes(queryLower))
      .slice(0, 3);

    const staticSuggestions = [
      "Workspace Access",
      "Workspace Administration",
      "ERP Registry",
      "CRM",
      "Contacts",
      "Deals",
      "Projects",
      "Tasks",
      "Inbox",
      "Settings",
    ].filter((item) => item.toLowerCase().includes(queryLower));

    return [...new Set([...recentMatches, ...staticSuggestions])].slice(0, 8);
  }

  addToRecentSearches(query) {
    if (!query || query.length < 2) return;

    this.recentSearches = this.recentSearches.filter(
      (search) => search !== query
    );

    this.recentSearches.unshift(query);
    this.recentSearches = this.recentSearches.slice(0, 10);

    this.writeStorage(RECENT_SEARCHES_KEY, this.recentSearches);
  }

  getRecentSearches() {
    return this.recentSearches;
  }

  clearRecentSearches() {
    this.recentSearches = [];

    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(RECENT_SEARCHES_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  }

  saveSearch(name, query, options = {}) {
    const savedSearch = {
      id: Date.now().toString(),
      name,
      query,
      options,
      createdAt: new Date().toISOString(),
    };

    this.savedSearches.push(savedSearch);
    this.writeStorage(SAVED_SEARCHES_KEY, this.savedSearches);

    return savedSearch;
  }

  getSavedSearches() {
    return this.savedSearches;
  }

  deleteSavedSearch(id) {
    this.savedSearches = this.savedSearches.filter(
      (search) => search.id !== id
    );

    this.writeStorage(SAVED_SEARCHES_KEY, this.savedSearches);
  }
}

export const executiveSearch = new ExecutiveSearchService();
export default executiveSearch;
