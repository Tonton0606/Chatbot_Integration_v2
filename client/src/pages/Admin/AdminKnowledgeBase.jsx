import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Badge, Input, Select, SelectItem,
  Dialog, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
  DialogContent, Label, Textarea
} from "../../components/admin/ui";
import { Brain, Sparkles, Target, Zap, BookOpen, Search, ThumbsUp, ThumbsDown, Eye, Edit, Trash, Plus } from "lucide-react";
import { supabase } from "../../config/supabaseClient";

export default function AdminKnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    category_id: "",
    tags: "",
    status: "draft"
  });

  useEffect(() => {
    fetchData();
  }, [categoryFilter, statusFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch categories
      const { data: catsData, error: catsError } = await supabase
        .from('kb_categories')
        .select('*')
        .order('order_index');
      if (catsError) throw catsError;
      setCategories(catsData || []);
      
      // Fetch articles
      let query = supabase
        .from('kb_articles')
        .select('*, category:kb_categories(name)')
        .order('created_at', { ascending: false });
      
      if (categoryFilter !== "all") query = query.eq('category_id', categoryFilter);
      if (statusFilter !== "all") query = query.eq('status', statusFilter);
      
      const { data: articlesData, error: articlesError } = await query;
      if (articlesError) throw articlesError;
      setArticles(articlesData || []);
      
      // Fetch stats
      const stats = {
        total: (articlesData || []).length,
        published: (articlesData || []).filter(a => a.status === 'published').length,
        draft: (articlesData || []).filter(a => a.status === 'draft').length,
        totalViews: (articlesData || []).reduce((sum, a) => sum + (a.view_count || 0), 0)
      };
      setStats(stats);
    } catch (error) {
      console.error('Error fetching KB data:', error);
      // Mock data
      const mockCategories = [
        { id: 1, name: 'Getting Started', slug: 'getting-started', icon: 'BookOpen' },
        { id: 2, name: 'Products & Services', slug: 'products-services', icon: 'Package' },
        { id: 3, name: 'Billing', slug: 'billing', icon: 'CreditCard' },
      ];
      const mockArticles = [
        { id: 1, title: 'How to Get Started', slug: 'how-to-get-started', excerpt: 'Quick start guide', status: 'published', view_count: 1200, helpful_count: 45, category: { name: 'Getting Started' } },
        { id: 2, title: 'Product Features Overview', slug: 'product-features', excerpt: 'Complete feature list', status: 'published', view_count: 800, helpful_count: 32, category: { name: 'Products & Services' } },
        { id: 3, title: 'Pricing Guide', slug: 'pricing-guide', excerpt: 'Understanding our pricing', status: 'draft', view_count: 0, helpful_count: 0, category: { name: 'Billing' } },
      ];
      setCategories(mockCategories);
      setArticles(mockArticles);
      setStats({ total: 3, published: 2, draft: 1, totalViews: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newArticle.title || !newArticle.content) {
      alert("Title and content are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = newArticle.slug || newArticle.title.toLowerCase().replace(/\s+/g, '-');
      const { data, error } = await supabase
        .from('kb_articles')
        .insert([{
          ...newArticle,
          slug,
          tags: newArticle.tags.split(',').map(t => t.trim()).filter(Boolean),
          published_at: newArticle.status === 'published' ? new Date().toISOString() : null
        }])
        .select()
        .single();

      if (error) throw error;
      setArticles([data, ...articles]);
      setIsCreateOpen(false);
      setNewArticle({ title: "", slug: "", content: "", excerpt: "", category_id: "", tags: "", status: "draft" });
    } catch (error) {
      console.error('Error creating article:', error);
      const mockArticle = {
        id: Date.now(),
        ...newArticle,
        slug: newArticle.title.toLowerCase().replace(/\s+/g, '-'),
        tags: newArticle.tags.split(',').map(t => t.trim()).filter(Boolean),
        view_count: 0,
        helpful_count: 0,
        not_helpful_count: 0,
        category: categories.find(c => c.id === newArticle.category_id)
      };
      setArticles([mockArticle, ...articles]);
      setIsCreateOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('kb_articles').delete().eq('id', id);
      if (error) throw error;
      setArticles(articles.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting:', error);
      setArticles(articles.filter(a => a.id !== id));
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      published: "bg-[var(--success)] text-white",
      draft: "bg-[var(--brand-gold)] text-white",
      archived: "bg-[var(--text-muted)] text-white"
    };
    return colors[status] || "bg-[var(--text-muted)]";
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.excerpt?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Knowledge Base</h2>
          <p className="text-muted-foreground">Manage help articles and documentation.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> New Article</Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Article</DialogTitle>
          <DialogDescription>Add a new knowledge base article.</DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} placeholder="Article title..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={newArticle.category_id} onChange={e => setNewArticle({...newArticle, category_id: e.target.value})}>
                  <SelectItem value="">None</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={newArticle.status} onChange={e => setNewArticle({...newArticle, status: e.target.value})}>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Excerpt</Label>
              <Input value={newArticle.excerpt} onChange={e => setNewArticle({...newArticle, excerpt: e.target.value})} placeholder="Brief summary..." />
            </div>
            <div className="grid gap-2">
              <Label>Tags (comma separated)</Label>
              <Input value={newArticle.tags} onChange={e => setNewArticle({...newArticle, tags: e.target.value})} placeholder="tag1, tag2, tag3" />
            </div>
            <div className="grid gap-2">
              <Label>Content</Label>
              <Textarea value={newArticle.content} onChange={e => setNewArticle({...newArticle, content: e.target.value})} placeholder="Article content..." rows={8} />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Article"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search articles..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="w-[180px]">
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
        </Select>
        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-[150px]">
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="published">Published</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
        </Select>
      </div>

      {/* Articles Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-3 text-center py-12">Loading...</div>
        ) : filteredArticles.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No articles found</div>
        ) : (
          filteredArticles.map(article => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold truncate">{article.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{article.excerpt || 'No excerpt'}</p>
                  </div>
                  <Badge className={`${getStatusBadge(article.status)} capitalize ml-2`}>
                    {article.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" /> {article.category?.name || 'Uncategorized'}</span>
                  <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {article.view_count || 0}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sm text-[var(--success)]"><ThumbsUp className="h-4 w-4" /> {article.helpful_count || 0}</span>
                    <span className="flex items-center gap-1 text-sm text-[var(--danger)]"><ThumbsDown className="h-4 w-4" /> {article.not_helpful_count || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(article.id)}><Trash className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

    </div>
  );
}
