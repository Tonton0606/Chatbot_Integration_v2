import { useEffect, useState } from 'react';
import Client_Layout from '../../Components/Client_Components/Client_Layout.jsx';
import { supabase } from '../../../config/supabaseClient.js';
import ChangePasswordForm from '../../../components/auth/ChangePasswordForm.jsx';

function Client_Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role, status, company_name, account_role, created_at')
        .eq('id', user.id)
        .single();

      if (!error) setProfile(data);
    };

    fetchProfile();
  }, []);

  return (
    <Client_Layout>
      <div className="crm-header">
        <h1>Profile</h1>
        <p>View your personal account and company information.</p>
      </div>

      <div className="system-status-banner">
        <div className="status-header">
          <h2>User Information</h2>
        </div>

        <div className="account-stats">
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Full Name</div>
              <div className="stat-value">{profile?.full_name || 'N/A'}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Email</div>
              <div className="stat-value" style={{ fontSize: '1rem' }}>
                {profile?.email || 'N/A'}
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">System Role</div>
              <div className="stat-value">{profile?.role || 'Client'}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Account Role</div>
              <div className="stat-value">{profile?.account_role || 'owner'}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Status</div>
              <div className="stat-value">{profile?.status || 'active'}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Joined</div>
              <div className="stat-value">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="system-status-banner">
        <div className="status-header">
          <h2>Company Information</h2>
        </div>

        <div className="account-stats">
          <div className="stat-card">
            <div className="stat-info">
              <div className="stat-label">Company Name</div>
              <div className="stat-value">{profile?.company_name || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
      <div className="system-status-banner">
        <div className="status-header">
          <h2>Security</h2>
        </div>
        <div style={{ maxWidth: '420px', padding: '0 0 8px 0' }}>
          <ChangePasswordForm />
        </div>
      </div>
    </Client_Layout>
  );
}

export default Client_Profile;
