import { supabase } from "../../config/supabaseClient";

export async function getCurrentUserOrThrow() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error("User not authenticated");

  return user;
}

export async function fetchLeads() {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchLeadBatches() {
  const { data, error } = await supabase
    .from("lead_batches")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function deleteLeadBatch(batchId) {
  const { error } = await supabase
    .from("lead_batches")
    .delete()
    .eq("id", batchId);

  if (error) throw error;
}

export async function deleteLead(leadId) {
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId);

  if (error) throw error;
}

export async function createLead(leadData) {
  const { data, error } = await supabase
    .from("leads")
    .insert(leadData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLead(leadId, leadData) {
  const { data, error } = await supabase
    .from("leads")
    .update(leadData)
    .eq("id", leadId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function validateLeadIds(leadIds) {
  if (!leadIds?.length) return [];

  const { data, error } = await supabase
    .from("leads")
    .select("id")
    .in("id", leadIds);

  if (error) throw error;
  return (data || []).map((lead) => lead.id);
}

export async function createLeadBatch(batchData) {
  const { data, error } = await supabase
    .from("lead_batches")
    .insert(batchData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeadBatch(batchId, batchData) {
  const { data, error } = await supabase
    .from("lead_batches")
    .update(batchData)
    .eq("id", batchId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addLeadsToBatch(batchId, selectedLeadIds, userId) {
  const { data, error } = await supabase.rpc("add_leads_to_batch", {
    batch_id: batchId,
    lead_ids: selectedLeadIds,
    current_user_id: userId,
  });

  if (!error) return data;

  const { data: currentBatch, error: fetchError } = await supabase
    .from("lead_batches")
    .select("lead_ids")
    .eq("id", batchId)
    .single();

  if (fetchError) throw fetchError;

  const existingLeadIds = currentBatch.lead_ids || [];
  const newLeadIds = selectedLeadIds.filter((id) => !existingLeadIds.includes(id));
  const updatedLeadIds = [...existingLeadIds, ...newLeadIds];

  const { error: updateError } = await supabase
    .from("lead_batches")
    .update({ lead_ids: updatedLeadIds })
    .eq("id", batchId);

  if (updateError) throw updateError;

  return { added_count: newLeadIds.length };
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function importLeadsToBatch(validLeads, batchId, userId, onProgress) {
  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;
  let processedCount = 0;

  for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
    const batch = validLeads.slice(i, i + BATCH_SIZE);

    const batchData = batch.map((lead) => ({
      email: lead.email,
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      phone: lead.phone || "",
      company: lead.company || "",
      job_title: lead.job_title || "",
      source: lead.source || "Import",
      status: "new",
      notes: lead.notes || "",
      tags: [],
      batch_id: batchId || null,
      user_id: userId,
    }));

    const maxRetries = 3;
    let retryCount = 0;
    let batchError = null;

    while (retryCount < maxRetries) {
      const { error } = await supabase.from("leads").insert(batchData);

      if (!error) {
        successCount += batch.length;
        batchError = null;
        break;
      }

      batchError = error;
      retryCount++;

      if (retryCount < maxRetries) {
        await wait(Math.pow(2, retryCount - 1) * 1000);
      }
    }

    if (batchError) {
      for (const leadData of batchData) {
        try {
          const { error } = await supabase.from("leads").insert(leadData);
          if (error) errorCount++;
          else successCount++;
        } catch {
          errorCount++;
        }
      }
    }

    processedCount += batch.length;

    if (onProgress) {
      const progress = Math.round((processedCount / validLeads.length) * 100);
      onProgress({ processedCount, total: validLeads.length, progress });
    }

    await wait(100);
  }

  return { successCount, errorCount };
}
