import { supabase } from "../../config/supabaseClient";

import {
  buildNavigationRegistry,
  getERPRegistryData,
} from "./erp_registry.js";

export async function getWorkspaceAccessData() {
  const [
    registryData,
    memberResult,
    featureAccessResult,
  ] = await Promise.all([
    getERPRegistryData(),

    supabase
      .from("workspace_members")
      .select(`
        workspace_id,
        user_id,
        role
      `),

    supabase
      .from("workspace_feature_access")
      .select(`
        id,
        workspace_id,
        feature_key,
        is_enabled,
        enabled_at,
        enabled_by,
        access_source
      `),
  ]);

  if (memberResult.error) throw memberResult.error;
  if (featureAccessResult.error) throw featureAccessResult.error;

  const memberRows = memberResult.data || [];

  const workspaceIds = [
    ...new Set(memberRows.map((row) => row.workspace_id)),
  ];

  const userIds = [
    ...new Set(memberRows.map((row) => row.user_id)),
  ];

  const [workspaceResult, profileResult] = await Promise.all([
    supabase
      .from("workspaces")
      .select(`
        id,
        name,
        workspace_type,
        status,
        created_at,
        owner_user_id
      `)
      .in("id", workspaceIds),

    supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        role,
        status
      `)
      .in("id", userIds),
  ]);

  if (workspaceResult.error) throw workspaceResult.error;
  if (profileResult.error) throw profileResult.error;

  const workspaceLookup = new Map();
  const profileLookup = new Map();

  for (const workspace of workspaceResult.data || []) {
    workspaceLookup.set(workspace.id, workspace);
  }

  for (const profile of profileResult.data || []) {
    profileLookup.set(profile.id, profile);
  }

  const workspaceMap = new Map();

  for (const member of memberRows) {
    const workspace = workspaceLookup.get(member.workspace_id);
    const profile = profileLookup.get(member.user_id);

    if (!workspace || !profile) continue;
    if (workspace.workspace_type === "internal") continue;
    if (profile.role !== "Client") continue;
    if (profile.status !== "active") continue;

    if (!workspaceMap.has(workspace.id)) {
      workspaceMap.set(workspace.id, {
        id: workspace.id,
        name: workspace.name,
        workspace_type: workspace.workspace_type,
        status: workspace.status,
        created_at: workspace.created_at,
        company_name: workspace.name,
        owner: profile.full_name || profile.email || "Workspace Owner",
        owner_email: profile.email,
        owner_id: profile.id,
      });
    }
  }

  const workspaces = Array.from(workspaceMap.values());

  const validWorkspaceIds = new Set(
    workspaces.map((workspace) => workspace.id)
  );

  const accessRows = (featureAccessResult.data || []).filter((row) =>
    validWorkspaceIds.has(row.workspace_id)
  );

  const modules = buildNavigationRegistry({
    divisions: registryData.divisions || [],
    features: registryData.features || [],
    enabledFeatureKeys: [],
    mode: "admin",
  }).flatMap((division) =>
    division.items.map((item) => ({
      id: item.id,
      key: item.key,
      label: item.label,
      icon: item.icon,
      description: item.description,
      status: item.status,
      statusNote: item.statusNote,
      adminRoute: item.adminRoute,
      clientRoute: item.clientRoute,
      adminVisible: item.adminVisible,
      clientVisible: item.clientVisible,
      autoEnableWithDivision:
        item.autoEnableWithDivision,
      order: item.order,
      division_id: item.divisionId,
      divisionKey: item.divisionKey,
      divisionTitle: item.divisionTitle,

      division: {
        id: division.id,
        division_key: division.key,
        title: division.title,
        icon: division.icon,
        description: division.description,
        order_index: division.order,
        admin_visible: division.adminVisible,
        client_visible: division.clientVisible,
        status: division.status,
      },
    }))
  );

  return {
    workspaces,
    modules,
    accessRows,
  };
}

export async function updateWorkspaceFeatureAccess({
  workspaceId,
  featureKey,
  isEnabled,
  accessSource = "manual",
}) {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  const payload = {
    workspace_id: workspaceId,
    feature_key: featureKey,
    is_enabled: isEnabled,
    enabled_by: userId,
    enabled_at: isEnabled
      ? new Date().toISOString()
      : null,
    access_source: accessSource,
  };

  const { data, error } = await supabase
    .from("workspace_feature_access")
    .upsert(payload, {
      onConflict: "workspace_id,feature_key",
    })
    .select(`
      id,
      workspace_id,
      feature_key,
      is_enabled,
      enabled_at,
      enabled_by,
      access_source
    `)
    .single();

  if (error) throw error;

  return data;
}

export async function updateWorkspaceDivisionAccess({
  workspaceId,
  divisionKey,
  isEnabled,
}) {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;

  const userId = authData?.user?.id;

  if (!userId) {
    throw new Error("User not authenticated.");
  }

  const divisionPayload = {
    workspace_id: workspaceId,
    division_key: divisionKey,
    is_enabled: isEnabled,
    enabled_by: userId,
    enabled_at: isEnabled
      ? new Date().toISOString()
      : null,
  };

  const { error: divisionError } = await supabase
    .from("workspace_division_access")
    .upsert(divisionPayload, {
      onConflict: "workspace_id,division_key",
    });

  if (divisionError) throw divisionError;

  const registryData = await getERPRegistryData();

  const autoEnabledFeatures = (
    registryData.features || []
  ).filter(
    (feature) =>
      feature.division?.division_key === divisionKey &&
      feature.auto_enable_with_division
  );

  const results = [];

  for (const feature of autoEnabledFeatures) {
    const result = await updateWorkspaceFeatureAccess({
      workspaceId,
      featureKey: feature.feature_key,
      isEnabled,
      accessSource: "division",
    });

    results.push(result);
  }

  return results;
}
