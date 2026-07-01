import { useState, useEffect } from "react";
import { Plus, Package, AlertCircle, X, Edit2, Trash2, Brain, TrendingUp, Zap, Target, Sparkles } from "lucide-react";
import { Card, CardContent, Button, Badge, CardHeader, CardTitle } from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import { supabase } from "../../config/supabaseClient";
import { useTheme } from "../../context/ThemeContext";

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: "", sku: "", quantity: 0, price: 0, category: "General" });
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [demandForecasts, setDemandForecasts] = useState({});
  const { isDark } = useTheme();

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("documents").select("*").eq("category", "inventory").order("created_at", { ascending: false });
      if (error) throw error;
      setProducts(data?.map(d => ({ ...d, ...JSON.parse(d.content || '{}') })) || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        title: formData.name,
        category: "inventory",
        content: JSON.stringify({ sku: formData.sku, quantity: parseInt(formData.quantity), price: parseFloat(formData.price) }),
        status: parseInt(formData.quantity) > 10 ? "published" : parseInt(formData.quantity) > 0 ? "draft" : "archived",
      };
      if (editingProduct) {
        await supabase.from("documents").update(productData).eq("id", editingProduct.id);
      } else {
        await supabase.from("documents").insert(productData);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: "", sku: "", quantity: 0, price: 0, category: "General" });
      fetchProducts();
    } catch (error) {
      alert("Failed to save product.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("documents").delete().eq("id", id);
    fetchProducts();
  };

  const getStockStatus = (qty) => {
    if (qty === 0) return { label: "Out of Stock", color: "bg-red-500" };
    if (qty <= 10) return { label: "Low Stock", color: "bg-amber-500" };
    return { label: "In Stock", color: "bg-green-500" };
  };

  async function generateAIForecast() {
    setAiLoading(true);
    try {
      const forecasts = {};
      for (const product of products.slice(0, 5)) {
        const forecast = await aiModules.predictDemand(
          product,
          [], // Historical sales
          {}  // Market trends
        );
        forecasts[product.id] = forecast;
      }
      setDemandForecasts(forecasts);
      
      const optimization = await aiModules.optimizeInventory(
        products.map(p => ({ id: p.id, quantity: p.quantity, price: p.price })),
        {}, // Sales velocity
        {}  // Lead times
      );
      setAiInsights(optimization);
    } catch (err) {
      console.error("AI inventory error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  const filteredProducts = products.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()));
  const totalValue = products.reduce((sum, p) => sum + (p.price * p.quantity || 0), 0);
  const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= 10).length;
  const outOfStock = products.filter(p => p.quantity === 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>AI Inventory</h1>
          <p className="text-sm text-gray-500">AI-powered demand forecasting and optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            icon={Brain}
            loading={aiLoading}
            onClick={generateAIForecast}
          >
            AI Forecast
          </Button>
          <Button icon={Plus} onClick={() => { setEditingProduct(null); setFormData({ name: "", sku: "", quantity: 0, price: 0 }); setShowModal(true); }}>Add Product</Button>
        </div>
      </div>

      {/* AI Inventory Intelligence */}
      <Card className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-500" />
            AI Inventory Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-cyan-500" />
                <span className="font-medium text-sm">Demand Forecasting</span>
              </div>
              <p className="text-xs text-gray-500">AI predicts 30/60/90 day demand</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">Stock Optimization</span>
              </div>
              <p className="text-xs text-gray-500">Optimal levels to minimize costs</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span className="font-medium text-sm">Dead Stock Detection</span>
              </div>
              <p className="text-xs text-gray-500">Identify slow-moving inventory</p>
            </div>
            <div className="p-4 bg-white dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-green-500" />
                <span className="font-medium text-sm">Smart Reorder</span>
              </div>
              <p className="text-xs text-gray-500">AI-calculated reorder points</p>
            </div>
          </div>
          {aiInsights && (
            <div className="mt-4 p-4 bg-white dark:bg-white/5 rounded-lg">
              <p className="text-sm font-medium mb-2">AI Recommendations:</p>
              <ul className="text-sm space-y-1">
                {aiInsights.recommendations?.slice(0, 3).map((rec, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-cyan-500" />
                    {rec.productId}: {rec.action} to {rec.targetLevel} units
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[ 
          { label: "Total Products", value: products.length, icon: Package, color: "blue" },
          { label: "Inventory Value", value: `$${totalValue.toLocaleString()}`, icon: () => <span className="text-green-500 font-bold">$</span>, color: "green" },
          { label: "Low Stock", value: lowStock, icon: AlertCircle, color: "amber" },
          { label: "Out of Stock", value: outOfStock, icon: AlertCircle, color: "red" },
        ].map((stat, idx) => (
          <Card key={idx} className={isDark ? "bg-white/5 border-white/10" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-${stat.color}-500/20 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-500`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="max-w-md">
        <div className="relative">
          <Package className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
          <input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c9a84c] ${
              isDark ? "bg-white/5 border border-white/10 text-white placeholder-gray-500" : "border border-gray-300 text-gray-900"
            }`}
          />
        </div>
      </div>

      <Card className={isDark ? "bg-white/5 border-white/10" : ""}>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><div className="animate-spin w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full mx-auto mb-4" /><p className="text-gray-500">Loading...</p></div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <p className={`text-lg mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>No products yet</p>
              <Button icon={Plus} onClick={() => setShowModal(true)}>Add Product</Button>
            </div>
          ) : (
            <table className="w-full">
              <thead className={`${isDark ? "bg-white/5" : "bg-gray-50"} border-b ${isDark ? "border-white/10" : "border-gray-200"}`}>
                <tr>{["Product", "SKU", "Quantity", "Price", "Status", "Actions"].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-600"}`}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product.quantity || 0);
                  return (
                    <tr key={product.id} className={`border-b ${isDark ? "border-white/5 hover:bg-white/5" : "border-gray-100 hover:bg-gray-50"}`}>
                      <td className={`px-4 py-3 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{product.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{product.sku || "-"}</td>
                      <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{product.quantity || 0}</td>
                      <td className={`px-4 py-3 text-sm ${isDark ? "text-white" : "text-gray-900"}`}>${product.price || 0}</td>
                      <td className="px-4 py-3"><Badge className={status.color}>{status.label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingProduct(product); setFormData({ name: product.title, sku: product.sku, quantity: product.quantity, price: product.price }); setShowModal(true); }} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className={`w-full max-w-md mx-4 ${isDark ? "bg-[#0d1525] border-white/10" : ""}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{editingProduct ? "Edit" : "Add"} Product</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="Product Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-white/5 border-white/10 text-white" : "border-gray-300"}`} />
                <input placeholder="SKU" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-white/5 border-white/10 text-white" : "border-gray-300"}`} />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Quantity" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-white/5 border-white/10 text-white" : "border-gray-300"}`} />
                  <input type="number" step="0.01" placeholder="Price ($)" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-white/5 border-white/10 text-white" : "border-gray-300"}`} />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">{editingProduct ? "Update" : "Add"}</Button>
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Assistant Widget */}

    </div>
  );
}
