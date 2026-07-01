export function computeContactAnalytics(contacts) {
  const total = contacts.length;
  const companies = contacts.filter((contact) => contact.type === "company").length;
  const customers = contacts.filter((contact) => contact.status === "customer").length;
  const leads = contacts.filter((contact) => contact.status === "lead").length;
  const prospects = contacts.filter((contact) => contact.status === "prospect").length;

  const recent = contacts.filter((contact) => {
    const created = new Date(contact.created_at || 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return created >= cutoff;
  }).length;

  return {
    total,
    companies,
    customers,
    leads,
    prospects,
    recent,
  };
}
