import { useState, useEffect } from 'react';
import { Plus, X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from '../../../components/admin/ui';
import { CampaignStats, CampaignList, CampaignFormModal, CampaignPreviewModal, CampaignDeleteModal } from '../../../components/admin/layout/Admin_EmailCampaign_Components.jsx';
import { useTheme } from '../../../context/ThemeContext';
import {
  getCurrentUserOrThrow,
  fetchLeadBatchesForCampaigns,
  createEmailCampaign,
  updateEmailCampaign,
  deleteEmailCampaign,
  fetchCampaignBatchLeads,
  updateCampaignSendingProgress,
  finalizeCampaignSend,
  EMAIL_TEMPLATES,
  parseEmails,
  getInvalidEmails,
  sanitizeHtml,
  safeHtmlPreview,
  getCampaignTotalLeads,
  getCampaignOpens,
  getCampaignClicks,
  formatRate,
} from '../../../services/marketing/campaigns';

const EMPTY_FORM = {
  title: '',
  subject: '',
  body: '',
  business_name: '',
  batch_size: 10,
  email_type: 'text',
  template_type: 'launch',
  lead_batch_id: '',
};


function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  const iconMap = { success: CheckCircle, error: AlertCircle, warning: AlertCircle, info: Info };
  const colorMap = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    error:   'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(t => {
        const Icon = iconMap[t.type] || Info;
        return (
          <div key={t.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg ${colorMap[t.type] || colorMap.info}`}>
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 mt-0.5"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
      })}
    </div>
  );
}

export default function EmailCampaigns({ campaigns, loading, onRefresh }) {
  const { isDark } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [leadBatches, setLeadBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [rawLeads, setRawLeads] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, campaignId: null });
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [toastList, setToastList] = useState([]);

  function pushToast(type, message) {
    const id = Date.now() + Math.random();
    setToastList(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToastList(prev => prev.filter(t => t.id !== id)), 5000);
  }

  const toast = {
    success: (msg) => pushToast('success', msg),
    error:   (msg) => pushToast('error', msg),
    warning: (msg) => pushToast('warning', msg),
    info:    (msg) => pushToast('info', msg),
  };

  function dismissToast(id) {
    setToastList(prev => prev.filter(t => t.id !== id));
  }
  
  // Cleanup function for component unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing email sending when component unmounts
      if (sendingId) {
        setSendingId(null);
      }
    };
  }, [sendingId]);

  // Fetch lead batches
  useEffect(() => {
    fetchLeadBatches();
  }, []);

  const fetchLeadBatches = async () => {
    try {
      const data = await fetchLeadBatchesForCampaigns();
      setLeadBatches(data);
    } catch (error) {
      console.error('Error fetching lead batches:', error);
      toast.error('Failed to fetch lead batches');
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);
  const totalLeads = campaigns.reduce((sum, c) => sum + getCampaignTotalLeads(c), 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + getCampaignOpens(c), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + getCampaignClicks(c), 0);
  const openRate = formatRate(totalOpens, totalLeads);
  const clickRate = formatRate(totalClicks, totalLeads);
  const parsedLeads = parseEmails(rawLeads);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingCampaign(null);
    setFormData(EMPTY_FORM);
    setRawLeads('');
    setShowModal(true);
  };

  const openEditModal = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title,
      subject: campaign.subject,
      body: campaign.body,
      business_name: campaign.business_name || '',
      batch_size: campaign.batch_size || 10,
      email_type: campaign.email_type || 'text',
      template_type: campaign.template_type || 'launch',
      lead_batch_id: campaign.lead_batch_id || '',
    });
    setRawLeads(campaign.leads?.map((l) => (typeof l === 'string' ? l : l.email)).join('\n') || '');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCampaign(null);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const invalidEmails = getInvalidEmails(rawLeads);
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email address(es):\n${invalidEmails.join('\n')}`);
        return;
      }
      const parsedLeads = parseEmails(rawLeads);
      if (!formData.lead_batch_id && parsedLeads.length === 0) {
        toast.error('Select a lead batch or add at least one valid email');
        return;
      }

      const user = await getCurrentUserOrThrow();

      const campaignData = {
        ...formData,
        batch_size: parseInt(formData.batch_size) || 10,
        updated_at: new Date().toISOString(),
        lead_batch_id: formData.lead_batch_id || null,
        leads: formData.lead_batch_id
          ? []
          : parsedLeads.map((email) => ({ email, status: 'pending' })),
        total_leads: formData.lead_batch_id 
          ? leadBatches.find(b => b.id === formData.lead_batch_id)?.lead_ids?.length || 0
          : parsedLeads.length,
        user_id: user.id,
      };

      if (editingCampaign) {
        await updateEmailCampaign(editingCampaign.id, campaignData);
        toast.success('Campaign updated successfully');
      } else {
        const data = await createEmailCampaign(campaignData);
        toast.success('Campaign created successfully');
      }

      closeModal();
      setRawLeads('');
      onRefresh();
    } catch (error) {
      toast.error(error?.message || 'Failed to save campaign. Please try again.');
    }
  };

  const handleDelete = (id) => setDeleteConfirm({ open: true, campaignId: id });

  const confirmDelete = async () => {
    try {
      await getCurrentUserOrThrow();
      await deleteEmailCampaign(deleteConfirm.campaignId);

      onRefresh();
      setDeleteConfirm({ open: false, campaignId: null });
      toast.success('Campaign deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign.');
      setDeleteConfirm({ open: false, campaignId: null });
    }
  };

  const handleSendCampaign = async (campaign) => {
    // Prevent concurrent sends
    if (sendingId || campaign.status === 'sending') {
      toast.error('Campaign is already being sent');
      return;
    }

    let leads = [];

    // If campaign has a lead_batch_id, fetch leads from the batch
    if (campaign.lead_batch_id) {
      try {
        leads = await fetchCampaignBatchLeads(campaign.lead_batch_id);

        if (leads.length === 0) {
          toast.error('No leads found in this batch');
          return;
        }
      } catch (error) {
        console.error('Error fetching batch leads:', error);
        toast.error('Failed to fetch leads from batch');
        return;
      }
    } else {
      // Use individual leads from campaign
      leads = campaign.leads || [];
      if (leads.length === 0) {
        toast.error('No leads in this campaign');
        return;
      }

      leads = leads.map((lead) => ({
        email: typeof lead === 'string' ? lead : lead.email,
        status: typeof lead === 'string' ? 'pending' : lead.status || 'pending',
      }));
    }

    setSendingId(campaign.id);

    // Different batch strategies for different campaign types
    let batchSize;
    let batchDelay;

    if (campaign.template_type === 'launch') {
      // Batch 1: Launch campaigns - smaller batches, faster delivery
      batchSize = campaign.batch_size || 25;
      batchDelay = 2000; // 2 seconds between batches
      toast.info(
        `Starting Launch Campaign: Processing ${leads.length} leads in batches of ${batchSize}`
      );
    } else if (campaign.template_type === 'announcement') {
      // Batch 2: Announcement campaigns - larger batches, slower delivery
      batchSize = campaign.batch_size || 50;
      batchDelay = 5000; // 5 seconds between batches
      toast.info(
        `Starting Announcement Campaign: Processing ${leads.length} leads in batches of ${batchSize}`
      );
    } else {
      // Default for other campaign types
      batchSize = campaign.batch_size || 10;
      batchDelay = 3000;
      toast.info(`Starting Campaign: Processing ${leads.length} leads in batches of ${batchSize}`);
    }

    const batches = [];
    for (let i = 0; i < leads.length; i += batchSize) batches.push(leads.slice(i, i + batchSize));

    let updatedLeads = [...leads];
    let sentCount = 0;
    let failedCount = 0;

    try {
      for (let i = 0; i < batches.length; i++) {
        // Process current batch
        for (let j = 0; j < batches[i].length; j++) {
          const lead = batches[i][j];
          if (!lead.email) continue;
          const leadIndex = i * batchSize + j;
          
          // Retry logic for individual email sends
          const maxRetries = 3;
          let retryCount = 0;
          let emailSent = false;
          let lastError = null;
          
          while (retryCount < maxRetries && !emailSent) {
            try {
              const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  campaign_id: campaign.id,
                  to: lead.email,
                  subject: campaign.subject,
                  body: campaign.body,
                  from_name: campaign.business_name || 'Hermes',
                  email_type: campaign.email_type || 'text',
                }),
              });
              
              if (response.ok) {
                updatedLeads[leadIndex] = {
                  ...lead,
                  status: 'sent',
                  sent_at: new Date().toISOString(),
                };
                sentCount++;
                emailSent = true;
              } else {
                const errorText = await response.text();
                lastError = errorText;
                
                // Don't retry on client errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                  break;
                }
                
                retryCount++;
                if (retryCount < maxRetries) {
                  // Exponential backoff: 1s, 2s, 4s
                  const delay = Math.pow(2, retryCount - 1) * 1000;
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
            } catch (err) {
              lastError = err.message;
              retryCount++;
              
              if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount - 1) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          if (!emailSent) {
            updatedLeads[leadIndex] = { 
              ...lead, 
              status: 'failed', 
              error: lastError || 'Unknown error after retries' 
            };
            failedCount++;
          }
        }

        // Update campaign progress after each batch
        const processedBatches = i + 1;
        const totalBatches = batches.length;
        const progress = Math.round((processedBatches / totalBatches) * 100);

        // Update campaign in database with current progress
        await updateCampaignSendingProgress(campaign.id, {
          leads: updatedLeads,
          sentCount,
        });

        // Show batch progress
        const campaignType =
          campaign.template_type === 'launch'
            ? 'Launch'
            : campaign.template_type === 'announcement'
              ? 'Announcement'
              : 'Campaign';
        toast.info(
          `${campaignType} Batch ${processedBatches}/${totalBatches} completed (${progress}%)`
        );

        // Apply campaign-specific delay between batches (except for last batch)
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, batchDelay));
        }
      }

      const allSent = updatedLeads.every((l) => l.status === 'sent');

      await finalizeCampaignSend(campaign.id, {
        status: allSent ? 'sent' : 'partial',
        leads: updatedLeads,
        sentCount,
        sentAt: allSent ? new Date().toISOString() : null,
      });

      allSent
        ? toast.success(`Successfully sent to all ${sentCount} leads!`)
        : toast.warning(`Campaign completed: ${sentCount} sent, ${failedCount} failed.`);

      onRefresh();
    } catch (err) {
      console.error('Error sending campaign:', err);
      toast.error('Failed to send campaign: ' + (err.message || 'Unknown error'));
    } finally {
      setSendingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <ToastContainer toasts={toastList} onDismiss={dismissToast} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-[var(--text-primary)]">Email Campaigns</h2>
          <p className="text-sm text-[var(--text-muted)]">Create and manage email campaigns</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          Create Campaign
        </Button>
      </div>

      <CampaignStats
        totalCampaigns={totalCampaigns}
        totalSent={totalSent}
        openRate={openRate}
        clickRate={clickRate}
      />

      <Card>
        <CardHeader>
          <CardTitle>Email Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <CampaignList
            campaigns={campaigns}
            loading={loading}
            isDark={isDark}
            sendingId={sendingId}
            onPreview={setShowPreview}
            onSend={handleSendCampaign}
            onEdit={openEditModal}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>

      <CampaignFormModal
        open={showModal}
        isDark={isDark}
        editingCampaign={editingCampaign}
        formData={formData}
        setFormData={setFormData}
        rawLeads={rawLeads}
        setRawLeads={setRawLeads}
        parsedLeads={parsedLeads}
        leadBatches={leadBatches}
        emailTemplates={EMAIL_TEMPLATES}
        sanitizeHtml={sanitizeHtml}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <CampaignPreviewModal
        campaign={showPreview}
        isDark={isDark}
        onClose={() => setShowPreview(null)}
        safeHtmlPreview={safeHtmlPreview}
      />

      <CampaignDeleteModal
        open={deleteConfirm.open}
        isDark={isDark}
        onClose={() => setDeleteConfirm({ open: false, campaignId: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
