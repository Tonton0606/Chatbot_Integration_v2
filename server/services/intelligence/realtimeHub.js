const clients = new Map();

function getWorkspaceClients(workspaceId) {
  if (!clients.has(workspaceId)) clients.set(workspaceId, new Set());
  return clients.get(workspaceId);
}

function addClient(workspaceId, res) {
  const workspaceClients = getWorkspaceClients(workspaceId);
  workspaceClients.add(res);
  res.on("close", () => {
    workspaceClients.delete(res);
    if (!workspaceClients.size) clients.delete(workspaceId);
  });
}

function publish(workspaceId, event, payload) {
  const workspaceClients = clients.get(workspaceId);
  if (!workspaceClients?.size) return;

  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of workspaceClients) {
    client.write(data);
  }
}

module.exports = {
  addClient,
  publish,
};
