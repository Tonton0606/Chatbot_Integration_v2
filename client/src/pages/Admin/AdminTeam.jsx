import { useState, useEffect } from "react";
import { 
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Badge, Skeleton,
  Dialog, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogContent,
  Label, Select, SelectItem,
  Avatar, AvatarImage, AvatarFallback
} from "../../components/admin/ui";
import { aiModules } from "../../services/ai";
import { Plus, Search, Trash, Mail, Building, Brain, Sparkles, Target, Zap } from "lucide-react";
import { supabase } from "../../config/supabaseClient";

export default function AdminTeam() {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI State
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [teamRecommendations, setTeamRecommendations] = useState([]);

  // AI Functions
  async function generateAIInsights() {
    setAiLoading(true);
    try {
      const insights = await aiModules.generateBusinessInsights({
        team: members,
        module: 'team'
      }, 'current_month');
      setAiInsights(insights);
    } catch (err) {
      console.error("AI insights error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function analyzeTeamPerformance() {
    setAiLoading(true);
    try {
      const analysis = await aiModules.analyzeTeamPerformance(members);
      setTeamRecommendations(analysis.recommendations || []);
    } catch (err) {
      console.error("Team analysis error:", err);
    } finally {
      setAiLoading(false);
    }
  }

  async function suggestTeamOptimization() {
    setAiLoading(true);
    try {
      await aiModules.optimizeTeamStructure(members);
    } catch (err) {
      console.error("Optimization error:", err);
    } finally {
      setAiLoading(false);
    }
  }
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    role: "member",
    department: "",
    status: "active"
  });

  // Fetch team members from Supabase
  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
      // Use mock data for demo
      setMembers([
        { id: 1, name: "John Smith", email: "john@hermes.com", role: "admin", department: "Engineering", status: "active", activeTasks: 5, completedTasks: 23 },
        { id: 2, name: "Sarah Chen", email: "sarah@hermes.com", role: "member", department: "Design", status: "active", activeTasks: 3, completedTasks: 18 },
        { id: 3, name: "Mike Johnson", email: "mike@hermes.com", role: "member", department: "Sales", status: "away", activeTasks: 2, completedTasks: 45 },
        { id: 4, name: "Emily Davis", email: "emily@hermes.com", role: "viewer", department: "Marketing", status: "offline", activeTasks: 0, completedTasks: 12 },
        { id: 5, name: "David Wilson", email: "david@hermes.com", role: "member", department: "Engineering", status: "busy", activeTasks: 8, completedTasks: 31 },
        { id: 6, name: "Lisa Anderson", email: "lisa@hermes.com", role: "admin", department: "Operations", status: "active", activeTasks: 4, completedTasks: 27 },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newMember.name || !newMember.email) {
      alert("Name and email are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, error } = await supabase
        .from('team_members')
        .insert([newMember])
        .select()
        .single();

      if (error) throw error;
      
      setMembers([data, ...members]);
      setIsCreateOpen(false);
      setNewMember({ name: "", email: "", role: "member", department: "", status: "active" });
    } catch (error) {
      console.error('Error creating member:', error);
      const mockMember = {
        id: Date.now(),
        ...newMember,
        activeTasks: 0,
        completedTasks: 0,
        created_at: new Date().toISOString(),
      };
      setMembers([mockMember, ...members]);
      setIsCreateOpen(false);
      setNewMember({ name: "", email: "", role: "member", department: "", status: "active" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMembers(members.filter(m => m.id !== id));
    } catch (error) {
      console.error('Error deleting member:', error);
      setMembers(members.filter(m => m.id !== id));
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "away": return "bg-yellow-500";
      case "busy": return "bg-red-500";
      case "offline": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin": return "default";
      case "member": return "secondary";
      case "viewer": return "outline";
      default: return "secondary";
    }
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Members</h2>
          <p className="text-muted-foreground">
            Manage your workspace members and their roles.
          </p>
        </div>
        
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      {/* Create Member Dialog */}
      <Dialog open={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>Invite a new member to the workspace.</DialogDescription>
        </DialogHeader>
        <DialogContent>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input 
                value={newMember.name} 
                onChange={e => setNewMember({...newMember, name: e.target.value})}
                placeholder="John Smith"
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={newMember.email} 
                onChange={e => setNewMember({...newMember, email: e.target.value})}
                placeholder="john@company.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select 
                value={newMember.role} 
                onChange={e => setNewMember({...newMember, role: e.target.value})}
              >
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Input 
                value={newMember.department} 
                onChange={e => setNewMember({...newMember, department: e.target.value})}
                placeholder="Engineering"
              />
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Member"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* AI Team Intelligence */}
      <Card className="border-[#c9a84c]/30 bg-gradient-to-r from-[#c9a84c]/10 to-[#ea580c]/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#c9a84c]" />
            AI Team Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Sparkles}
              loading={aiLoading}
              onClick={generateAIInsights}
            >
              Generate Insights
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Target}
              loading={aiLoading}
              onClick={analyzeTeamPerformance}
            >
              Analyze Performance
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              icon={Zap}
              loading={aiLoading}
              onClick={suggestTeamOptimization}
            >
              Optimize Structure
            </Button>
          </div>
          {aiInsights && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{aiInsights.executiveSummary}</p>
              <div className="flex flex-wrap gap-2">
                {aiInsights.keyFindings?.slice(0, 3).map((finding, i) => (
                  <Badge key={i} variant="info" className="text-xs">{finding}</Badge>
                ))}
              </div>
            </div>
          )}
          {teamRecommendations.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Team Recommendations:</p>
              <div className="space-y-2">
                {teamRecommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-white/5 rounded text-sm">
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-xs text-gray-500">{rec.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </CardHeader>
            </Card>
          ))
        ) : filteredMembers.map(member => (
          <Card key={member.id}>
            <CardHeader className="p-4 pb-2 relative">
              <div className="absolute right-4 top-4">
                {member.role !== 'owner' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(member.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback name={member.name} />
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(member.status)}`} />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{member.name}</CardTitle>
                  <Badge variant={getRoleBadge(member.role)} className="mt-1 text-[10px] uppercase">
                    {member.role}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2 text-sm text-muted-foreground mt-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{member.email}</span>
                </div>
                {member.department && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{member.department}</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="font-semibold">{member.activeTasks || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="font-semibold">{member.completedTasks || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Assistant Widget */}

    </div>
  );
}
