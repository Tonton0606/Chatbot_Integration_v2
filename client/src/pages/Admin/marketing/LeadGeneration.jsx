import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Upload,
  UserPlus,
  Link,
  X,
  Edit2,
  Trash2,
  Download,
  Search,
  Folder,
  FolderOpen,
  Users,
  Tag,
} from 'lucide-react';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from '../../../components/admin/ui';

import {
  getCurrentUserOrThrow,
  fetchLeads as fetchLeadsService,
  fetchLeadBatches as fetchLeadBatchesService,
  deleteLeadBatch,
  deleteLead,
  createLead,
  updateLead,
  validateLeadIds,
  createLeadBatch,
  updateLeadBatch,
  addLeadsToBatch,
  importLeadsToBatch
} from '../../../services/marketing/leads';

import { useTheme } from '../../../context/ThemeContext';

import {
  LeadStats,
  LeadTools,
  LeadBatchList,
  ManualLeadModal,
  ImportPreviewModal,
  BatchModal,
  LeadDeleteModal,
} from "../../../components/admin/layout/Admin_LeadGeneration_Components.jsx";


const LEAD_STATUSES = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
  { value: 'converted', label: 'Converted', color: 'bg-purple-100 text-purple-800' },
  { value: 'unqualified', label: 'Unqualified', color: 'bg-red-100 text-red-800' },
];

const LEAD_SOURCES = [
  'Website',
  'LinkedIn',
  'Email Campaign',
  'Cold Call',
  'Referral',
  'Social Media',
  'Trade Show',
  'Other',
];

function parseCSV(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Secure CSV parsing that handles quoted fields
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Start or end quote
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    return result;
  };

  try {
    const headers = parseCSVLine(lines[0]).map(h => {
      // Validate header names to prevent injection
      const cleanHeader = h.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (!cleanHeader || cleanHeader.length > 50) {
        throw new Error('Invalid header format');
      }
      return cleanHeader;
    });

    const leads = [];
    const maxRows = 1000; // Prevent DoS with huge files

    for (let i = 1; i < lines.length && i <= maxRows; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = parseCSVLine(lines[i]);
      
      if (values.length !== headers.length) {
        console.warn(`Skipping malformed row ${i}: expected ${headers.length} fields, got ${values.length}`);
        continue;
      }

      const lead = {};
      headers.forEach((header, index) => {
        // Validate and sanitize each field
        let value = values[index] || '';
        
        // Remove potentially dangerous content
        value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        value = value.replace(/javascript:/gi, '');
        value = value.replace(/vbscript:/gi, '');
        value = value.replace(/data:/gi, '');
        
        // Limit field length
        if (value.length > 1000) {
          value = value.substring(0, 1000);
        }
        
        lead[header] = value;
      });
      
      // Validate required email field if present
      if (lead.email && !validateEmail(lead.email)) {
        console.warn(`Skipping row ${i}: invalid email format`);
        continue;
      }
      
      leads.push(lead);
    }

    return leads;
  } catch (error) {
    console.error('CSV parsing error:', error);
    return [];
  }
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


const toast = {
  success: (...args) => console.log("[SUCCESS]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  warning: (...args) => console.warn("[WARNING]", ...args),
  info: (...args) => console.info("[INFO]", ...args),
};

export default function LeadGeneration() {
  const { isDark } = useTheme();
  const fileInputRef = useRef(null);

  // State
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    company: '',
    job_title: '',
    source: 'Website',
    status: 'new',
    notes: '',
    tags: '',
    batch_id: '',
  });

  // State for current view
  const [selectedBatchView, setSelectedBatchView] = useState(null);
  
  // State for delete confirmation modals
  const [deleteModal, setDeleteModal] = useState({
    type: null, // 'lead' or 'batch'
    id: null,
    name: ''
  });

  // Import state
  const [importData, setImportData] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [selectedImportBatch, setSelectedImportBatch] = useState('');

  // Lead batching state
  const [leadBatches, setLeadBatches] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [showBatchSelection, setShowBatchSelection] = useState(false);
  const [selectedBatchForAdding, setSelectedBatchForAdding] = useState(null);

  // Batch form state
  const [batchFormData, setBatchFormData] = useState({
    name: '',
    description: '',
    tags: '',
  });

  // Fetch leads and batches
  useEffect(() => {
    fetchLeads();
    fetchLeadBatches();
  }, []);

  // Group leads by batch (optimized with useMemo)
  const leadsByBatch = useMemo(() => {
    return leads.reduce((acc, lead) => {
      const batchId = lead.batch_id || 'unassigned';
      if (!acc[batchId]) {
        acc[batchId] = [];
      }
      acc[batchId].push(lead);
      return acc;
    }, {});
  }, [leads]);

  const fetchLeads = async () => {
    try {
      await getCurrentUserOrThrow();
      const data = await fetchLeadsService();
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  // Fetch lead batches
  const fetchLeadBatches = async () => {
    try {
      await getCurrentUserOrThrow();
      const data = await fetchLeadBatchesService();
      setLeadBatches(data);
    } catch (error) {
      console.error('Error fetching lead batches:', error);
      toast.error('Failed to fetch lead batches');
    }
  };

  // Create or update lead batch
  const handleBatchSubmit = async (e) => {
    e.preventDefault();

    if (!batchFormData.name.trim()) {
      toast.error('Batch name is required');
      return;
    }

    try {
      const user = await getCurrentUserOrThrow();

      // Validate that selected leads exist and are accessible
      if (selectedLeads.length > 0) {
        const validLeadIds = await validateLeadIds(selectedLeads);
        const invalidLeads = selectedLeads.filter((id) => !validLeadIds.includes(id));

        if (invalidLeads.length > 0) {
          toast.error('Access denied: Some leads are not available');
          return;
        }
      }

      const batchData = {
        name: batchFormData.name.trim(),
        description: batchFormData.description.trim(),
        tags: batchFormData.tags
          ? batchFormData.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        lead_ids: selectedLeads,
        user_id: user.id,
      };

      if (editingBatch) {
        await updateLeadBatch(editingBatch.id, batchData);
        toast.success('Batch updated successfully');
      } else {
        await createLeadBatch(batchData);
        toast.success('Batch created successfully');
      }

      setShowBatchModal(false);
      resetBatchForm();
      fetchLeadBatches();
      setSelectedLeads([]);
    } catch (error) {
      console.error('Error saving batch:', error);
      toast.error('Failed to save batch');
    }
  };

  // Delete lead batch
  const handleDeleteBatch = async (batchId) => {
    // Find the batch to get its name for the modal
    const batch = leadBatches.find(b => b.id === batchId);
    
    setDeleteModal({
      type: 'batch',
      id: batchId,
      name: batch ? batch.name : 'Unknown Batch'
    });
  };

  // Confirm batch deletion
  const confirmDeleteBatch = async () => {
    if (!deleteModal.id) return;

    try {
      await getCurrentUserOrThrow();
      await deleteLeadBatch(deleteModal.id);
      toast.success('Batch deleted successfully');
      setDeleteModal({ type: null, id: null, name: '' });
      fetchLeadBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Failed to delete batch');
    }
  };

  // Edit lead batch
  const handleEditBatch = (batch) => {
    setEditingBatch(batch);
    setBatchFormData({
      name: batch.name || '',
      description: batch.description || '',
      tags: batch.tags ? batch.tags.join(', ') : '',
    });
    setShowBatchModal(true);
  };

  // Reset batch form
  const resetBatchForm = () => {
    setBatchFormData({
      name: '',
      description: '',
      tags: '',
    });
    setEditingBatch(null);
  };

  // Add selected leads to batch
  const handleAddLeadsToBatch = async (batchId) => {
    if (selectedLeads.length === 0) {
      toast.error('Please select leads to add to this batch');
      return;
    }

    try {
      const user = await getCurrentUserOrThrow();
      const data = await addLeadsToBatch(batchId, selectedLeads, user.id);

      const addedCount = data?.added_count || selectedLeads.filter(id =>
        !leads.find(l => l.id === id && l.batch_id === batchId)
      ).length;
      
      toast.success(`Added ${addedCount} leads to batch`);
      setSelectedLeads([]);
      fetchLeadBatches();
      fetchLeads(); // Refresh leads to show updated batch assignments
    } catch (error) {
      console.error('Error adding leads to batch:', error);
      toast.error('Failed to add leads to batch: ' + error.message);
    }
  };

  // Toggle lead selection
  const toggleLeadSelection = (leadId) => {
    setSelectedLeads((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  // Select all leads
  const selectAllLeads = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((lead) => lead.id));
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      searchTerm === '' ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Reset form
  const resetForm = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      company: '',
      job_title: '',
      source: 'Website',
      status: 'new',
      notes: '',
      tags: '',
      batch_id: selectedBatchForAdding?.id || '',
    });
    setEditingLead(null);
  };

  // Handle manual form submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const batchId = formData.batch_id || selectedBatchForAdding?.id || '';
    if (!batchId) {
      toast.error('Please select a batch for this lead');
      return;
    }

    try {
      const user = await getCurrentUserOrThrow();

      const leadData = {
        ...formData,
        user_id: user.id,
        tags: formData.tags
          ? formData.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        batch_id: batchId,
      };

      if (editingLead) {
        await updateLead(editingLead.id, leadData);
        toast.success('Lead updated successfully');
      } else {
        await createLead(leadData);
        toast.success('Lead added successfully');
      }

      setShowManualModal(false);
      resetForm();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead');
    }
  };

  // Handle delete lead
  const handleDelete = async (id) => {
    // Find the lead to get its name for the modal
    const lead = leads.find((l) => l.id === id);

    setDeleteModal({
      type: 'lead',
      id: id,
      name: lead ? `${lead.first_name} ${lead.last_name}`.trim() : 'Unknown Lead',
    });
  };

  // Confirm lead deletion
  const confirmDeleteLead = async () => {
    if (!deleteModal.id) return;

    try {
      await getCurrentUserOrThrow();
      await deleteLead(deleteModal.id);
      toast.success('Lead deleted successfully');
      setDeleteModal({ type: null, id: null, name: '' });
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  // Handle edit lead
  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      email: lead.email || '',
      first_name: lead.first_name || '',
      last_name: lead.last_name || '',
      phone: lead.phone || '',
      company: lead.company || '',
      job_title: lead.job_title || '',
      source: lead.source || 'Website',
      status: lead.status || 'new',
      notes: lead.notes || '',
      tags: lead.tags ? lead.tags.join(', ') : '',
      batch_id: lead.batch_id || '',
    });
    setShowManualModal(true);
  };

  // Handle file import
  const handleFileImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File size validation (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 5MB limit. Please choose a smaller file.');
      e.target.value = ''; // Clear the input
      return;
    }

    // File type validation
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only CSV files are supported');
      e.target.value = ''; // Clear the input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parsedLeads = parseCSV(text);

        if (parsedLeads.length === 0) {
          toast.error('No valid leads found in file');
          return;
        }

        // Validate that required columns exist
        const hasEmail = parsedLeads.some(lead => lead.email);
        if (!hasEmail) {
          toast.error('CSV must contain an "email" column');
          return;
        }

        setImportData(text);
        setImportPreview(parsedLeads.slice(0, 5)); // Show first 5 for preview
        setShowImportModal(true);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file. Please check the format.');
      }
    };
    
    reader.onerror = () => {
      toast.error('Failed to read file');
    };
    
    reader.readAsText(file);
  };

  // Process import
  const handleImportSubmit = async () => {
    if (!selectedImportBatch) {
      toast.error('Please select a batch for imported leads');
      return;
    }

    try {
      const user = await getCurrentUserOrThrow();

      const allLeads = parseCSV(importData);
      const validLeads = allLeads.filter((lead) => lead.email && validateEmail(lead.email));
      const invalidLeads = allLeads.length - validLeads.length;

      toast.info(
        `Starting import: ${validLeads.length} valid leads to process in batches of 50`
      );

      const result = await importLeadsToBatch(
        validLeads,
        selectedImportBatch,
        user.id,
        ({ processedCount, total, progress }) => {
          toast.info(`Import progress: ${processedCount}/${total} (${progress}%)`);
        }
      );

      const errorCount = result.errorCount + invalidLeads;
      toast.success(`Import completed: ${result.successCount} leads added, ${errorCount} failed`);
      setShowImportModal(false);
      setImportData('');
      setImportPreview([]);
      setSelectedImportBatch('');
      fetchLeads();
    } catch (error) {
      console.error('Error importing leads:', error);
      toast.error('Failed to import leads');
    }
  };

  // Export leads for specific batch
  const handleExport = (batchId = null) => {
    const leadsToExport = batchId ? leadsByBatch[batchId] || [] : filteredLeads;

    const batchName = batchId
      ? leadBatches.find((b) => b.id === batchId)?.name || 'batch'
      : 'all-leads';

    const csvContent = [
      'Email,First Name,Last Name,Phone,Company,Job Title,Source,Status,Notes,Batch',
      ...leadsToExport.map(
        (lead) =>
          `"${lead.email}","${lead.first_name || ''}","${lead.last_name || ''}","${lead.phone || ''}","${lead.company || ''}","${lead.job_title || ''}","${lead.source || ''}","${lead.status || ''}","${lead.notes || ''}","${batchName}"`
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batchName}-leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    const statusConfig = LEAD_STATUSES.find((s) => s.value === status);
    return statusConfig ? statusConfig.color : 'bg-[var(--hover-bg)] text-gray-800';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Lead Generation</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Manage leads by batches - every lead must belong to a batch
          </p>
        </div>
        <div className="flex gap-2"></div>
      </div>

      <LeadStats
        leadBatches={leadBatches}
        leads={leads}
      />

      <LeadTools
        isDark={isDark}
        fileInputRef={fileInputRef}
        handleFileImport={handleFileImport}
        onManualAdd={() => setShowManualModal(true)}
      />

      <LeadBatchList
        isDark={isDark}
        leadBatches={leadBatches}
        leadsByBatch={leadsByBatch}
        selectedBatchView={selectedBatchView}
        setSelectedBatchView={setSelectedBatchView}
        handleExport={handleExport}
        setSelectedBatchForAdding={setSelectedBatchForAdding}
        setShowManualModal={setShowManualModal}
        handleEditBatch={handleEditBatch}
        handleDeleteBatch={handleDeleteBatch}
        getStatusColor={getStatusColor}
        LEAD_STATUSES={LEAD_STATUSES}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />

      {/* Unassigned Leads Section - Only show if there are any */}
      {leadsByBatch.unassigned && leadsByBatch.unassigned.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-[var(--danger)]">
                Unassigned Leads ({leadsByBatch.unassigned.length})
              </CardTitle>
              <Button variant="outline" className="text-[var(--danger)]">
                These leads need batch assignment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm mb-2">
                <strong>⚠️ Action Required:</strong> All leads must be assigned to a batch.
              </p>
              <p className="text-red-700 text-sm">
                Please create batches and assign these leads to organize them properly.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-white/10' : 'border-[var(--border-color)]'}`}>
                    <th className="text-left py-2 px-3 font-medium">Name</th>
                    <th className="text-left py-2 px-3 font-medium">Email</th>
                    <th className="text-left py-2 px-3 font-medium">Company</th>
                    <th className="text-left py-2 px-3 font-medium">Status</th>
                    <th className="text-left py-2 px-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsByBatch.unassigned.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`border-b ${isDark ? 'border-white/10' : 'border-[var(--border-color)]'} bg-red-50`}
                    >
                      <td className="py-2 px-3">
                        <div>
                          <div className="font-medium text-sm">
                            {lead.first_name || ''} {lead.last_name || ''}
                          </div>
                          {lead.job_title && (
                            <div className="text-xs text-[var(--text-muted)]">{lead.job_title}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="text-sm">{lead.email}</div>
                        {lead.phone && <div className="text-xs text-[var(--text-muted)]">{lead.phone}</div>}
                      </td>
                      <td className="py-2 px-3 text-sm">{lead.company || '-'}</td>
                      <td className="py-2 px-3">
                        <Badge className={`${getStatusColor(lead.status)} text-xs`}>
                          {LEAD_STATUSES.find((s) => s.value === lead.status)?.label || lead.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(lead)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lead.id)}
                            className="text-[var(--danger)]"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ManualLeadModal
        showManualModal={showManualModal}
        isDark={isDark}
        editingLead={editingLead}
        selectedBatchForAdding={selectedBatchForAdding}
        setShowManualModal={setShowManualModal}
        resetForm={resetForm}
        setSelectedBatchForAdding={setSelectedBatchForAdding}
        handleManualSubmit={handleManualSubmit}
        formData={formData}
        setFormData={setFormData}
        LEAD_SOURCES={LEAD_SOURCES}
        LEAD_STATUSES={LEAD_STATUSES}
        leadBatches={leadBatches}
      />

      <ImportPreviewModal
        showImportModal={showImportModal}
        isDark={isDark}
        setShowImportModal={setShowImportModal}
        setImportData={setImportData}
        setImportPreview={setImportPreview}
        setSelectedImportBatch={setSelectedImportBatch}
        importPreview={importPreview}
        selectedImportBatch={selectedImportBatch}
        leadBatches={leadBatches}
        handleImportSubmit={handleImportSubmit}
      />

      <BatchModal
        showBatchModal={showBatchModal}
        isDark={isDark}
        editingBatch={editingBatch}
        setShowBatchModal={setShowBatchModal}
        resetBatchForm={resetBatchForm}
        handleBatchSubmit={handleBatchSubmit}
        batchFormData={batchFormData}
        setBatchFormData={setBatchFormData}
        selectedLeads={selectedLeads}
      />

      <LeadDeleteModal
        deleteModal={deleteModal}
        isDark={isDark}
        setDeleteModal={setDeleteModal}
        confirmDeleteLead={confirmDeleteLead}
        confirmDeleteBatch={confirmDeleteBatch}
      />

    </div>
  );
}
