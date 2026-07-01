import { formatDate, statusClass } from "./crmUtils.js";

export default function CRMRecentActivities({ activities }) {
  return (
    <div className="crm-card">
      <div className="crm-card-header">
        <h3 className="crm-card-title">Recent Activities</h3>
        <p className="crm-card-subtitle">
          Latest CRM movements based on opportunity updates.
        </p>
      </div>
      <div className="crm-activity-list">
        {activities.length === 0 ? (
          <p className="crm-empty-mini">No recent activity.</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="crm-activity-item">
              <div className="crm-activity-top">
                <p className="crm-activity-title">{activity.title}</p>
                <span className={`rounded-full border px-2 py-1 text-xs font-bold uppercase ${statusClass(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
              <p className="crm-activity-meta">
                {activity.company} · {activity.stageName}
              </p>
              <p className="crm-activity-date">
                Updated {formatDate(activity.date)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
