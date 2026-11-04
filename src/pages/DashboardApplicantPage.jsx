import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabase";
import {ApplicantClockIcon, ApplicantNotesIcon, HandshakeIcon, ApplicantClipboardIcon } from "../components/icons/CustomIcons";
import locationLogo from '../assets/icon-location.png';
import '/src/styles/DashboardApplicantPage.css';
import mailBlackLogo from '../assets/mail-blue-icon.png';
import calendarminimalLogo from '../assets/calendar-minimal-icon.png';
import podcastLogo from '../assets/podcast-icon.png';

import WeatherWidget from "../components/WeatherWidget";
import Loader from '../components/Loader';

export default function DashboardApplicant() {
  const [documents, setDocuments] = useState(null);
const [userProfile, setUserProfile] = useState(null);

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    shortlisted: 0,
    hired: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [todayDate, setTodayDate] = useState("");
  const [newJobs, setNewJobs] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);

  useEffect(() => {
  const loadDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const metadata = user.user_metadata || {};
    const firstName = metadata.first_name || "";
    const surname = metadata.surname || "";
    setUserName(firstName && surname ? `${firstName} ${surname}` : user.email || "User");

    const today = new Date();
    setTodayDate(today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));

    await loadStats(user.id);
    await loadRecentApplications(user.id);
    await loadRecentNotifications(user.id);
    await loadNewJobs();
    await loadUpcomingInterviews(user.id);
    
    // 🆕 Load profile + documents
    const { data: applicantData } = await supabase
      .from('applicants')
      .select(`
        pds_file_url,
        tor_file_url,
        performance_rating_file_url,
        phone,
        address
      `)
      .eq('id', user.id)
      .maybeSingle();
    
    setDocuments(applicantData || null);
    setUserProfile(applicantData || null);
    
    setLoading(false);
  };

  loadDashboard();
}, [navigate]);

  const loadStats = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('status')
        .eq('applicant_id', userId)
        .neq('status', 'WITHDRAWN');

      if (error) throw error;

      const total = data.length;
      const pending = data.filter(a => a.status === 'PENDING' || a.status === 'REVIEWING').length;
      const shortlisted = data.filter(a => a.status === 'SHORTLISTED' || a.status === 'INTERVIEW' || a.status === 'FOR_INTERVIEW' || a.status === 'INTERVIEW_SCHEDULED' || a.status === 'QUALIFIED').length;
      const hired = data.filter(a => a.status === 'HIRED').length;

      setStats({ total, pending, shortlisted, hired });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentApplications = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job_postings (
            position_title,
            place_of_assignment,
            salary_grade
          )
        `)
        .eq('applicant_id', userId)
        .neq('status', 'WITHDRAWN')
        .order('applied_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentApplications(data || []);
    } catch (error) {
      console.error('Error loading recent applications:', error);
    }
  };

  const loadRecentNotifications = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadNewJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('id, position_title, place_of_assignment, salary_grade, closing_date, created_at')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setNewJobs(data || []);
    } catch (error) {
      console.error('Error loading new jobs:', error);
    }
  };

  const loadUpcomingInterviews = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id,
          scheduled_date,
          location,
          job_id,
          job_postings (position_title)
        `)
        .eq('applicant_id', userId)
        .eq('status', 'SCHEDULED')
        .gte('scheduled_date', new Date().toISOString())
        .order('scheduled_date', { ascending: true })
        .limit(3);

      if (error) throw error;
      setUpcomingInterviews(data || []);
    } catch (error) {
      console.error('Error loading interviews:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING': { bg: '#FFF3E0', color: '#E65100', text: 'Pending Review' },
      'REVIEWING': { bg: '#E3F2FD', color: '#1565C0', text: 'Under Review' },
      'QUALIFIED': { bg: '#E8F5E9', color: '#2E7D32', text: 'Qualified' },
      'SHORTLISTED': { bg: '#E8F5E9', color: '#2E7D32', text: 'Shortlisted' },
      'FOR_INTERVIEW': { bg: '#F3E5F5', color: '#7B1FA2', text: 'For Interview' },
      'INTERVIEW_SCHEDULED': { bg: '#F3E5F5', color: '#7B1FA2', text: 'Interview Scheduled' },
      'INTERVIEW': { bg: '#F3E5F5', color: '#7B1FA2', text: 'Interview Scheduled' },
      'HIRED': { bg: '#E8F5E9', color: '#1B5E20', text: 'Hired' },
      'NOT_SELECTED': { bg: '#FFEBEE', color: '#C62828', text: 'Not Selected' },
      'REJECTED': { bg: '#FFEBEE', color: '#C62828', text: 'Rejected' },
      'WITHDRAWN': { bg: '#F3E5F5', color: '#6A1B9A', text: 'Withdrawn' }
    };
    return colors[status] || colors['PENDING'];
  };

  const getScoreColor = (score) => {
    if (!score) return "#6c757d";
    if (score >= 80) return "#2e7d32";
    if (score >= 60) return "#e65100";
    return "#c62828";
  };

  const getScoreBg = (score) => {
    if (!score) return "#f5f5f5";
    if (score >= 80) return "#e8f5e9";
    if (score >= 60) return "#fff3e0";
    return "#ffebee";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatInterviewDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatClosingDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const now = new Date();
  const diff = date - now;                          // ← future = positive
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  
  if (days < 0) return "Closed";
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days < 7) return `Closes in ${days} days`;
  return `Closes  ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

  if (loading) {
    return (
      <>
        <Navbar userRole="applicant" />
        <div className="dashboard-container">
          <Loader />
          <div className="loading-state">Loading dashboard...</div>
        </div>
      </>
    );
  }

  // Profile completeness computation — document-based
const profileChecks = [
  { 
    label: 'Account created', 
    done: true,
    href: null,
  },
  { 
    label: 'Contact information filled', 
    done: !!(userProfile?.phone || userProfile?.address),
    href: '/applicant/profile',
  },
  { 
    label: 'Personal Data Sheet uploaded', 
    done: !!documents?.pds_file_url,
    href: '/applicant/profile',
  },
  { 
    label: 'Transcript of Records uploaded', 
    done: !!documents?.tor_file_url,
    href: '/applicant/profile',
  },
  { 
    label: 'Performance Rating uploaded', 
    done: !!documents?.performance_rating_file_url,
    href: '/applicant/profile',
  },
];
const completedChecks = profileChecks.filter(c => c.done).length;
const profilePercent = Math.round((completedChecks / profileChecks.length) * 100);
  return (
    <>
      <Navbar userRole="applicant" />
      <div className="dashboard-container">

        {/* ═══════════════ MAGAZINE HERO HEADER ═══════════════ */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3a5c 0%, #4F46E5 100%)',
          borderRadius: '20px',
          padding: '32px 36px',
          marginBottom: '28px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(79, 70, 229, 0.25)'
        }}>
          {/* Decorative circles */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-80px',
            right: '100px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)'
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '13px', opacity: 0.85, marginBottom: '6px', letterSpacing: '0.5px' }}>
              {todayDate}
            </div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 700,
              margin: 0,
              marginBottom: '8px',
              lineHeight: 1.2
            }}>
              Welcome back, {userName.split(' ')[0]} 
            </h1>
            <p style={{ fontSize: '15px', opacity: 0.9, margin: 0, maxWidth: '520px' }}>
              Here's what's happening with your job applications today.
            </p>

            {/* Inline stats in hero */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginTop: '24px',
              flexWrap: 'wrap',
            }}>
              {[
                { label: 'Applications', value: stats.total },
                { label: 'Pending', value: stats.pending },
                { label: 'Interviews', value: stats.shortlisted },
                { label: 'Hired', value: stats.hired }
              ].map((item, i) => (
                <div key={i}>
                  <div key={i} style={{ textAlign: 'center' }}>  {/* ← ADD THIS */}
                  <div style={{ fontSize: '22px', fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════ MAGAZINE GRID ═══════════════ */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '20px',
          marginBottom: '24px'
        }}>

          {/* ─── LEFT COLUMN (8 cols) ─── */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* HERO FEATURE CARD — Featured Job */}
            {newJobs.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                borderRadius: '16px',
                padding: '24px 28px',
                border: '1px solid #c7d2fe'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <span style={{
                    background: '#4F46E5',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.5px'
                  }}>
                    ✨ FEATURED OPPORTUNITY
                  </span>
                  <span
                    onClick={() => navigate('/applicant/jobs')}
                    style={{ fontSize: '13px', color: '#4F46E5', fontWeight: 600, cursor: 'pointer' }}
                  >
                    View All Jobs →
                  </span>
                </div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1a3a5c',
                  margin: '0 0 8px 0'
                }}>
                  {newJobs[0].position_title}
                </h2>
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  fontSize: '13px',
                  color: '#4a5568',
                  marginBottom: '16px',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={locationLogo} alt="" style={{ width: 14, height: 14 }} />
                    {newJobs[0].place_of_assignment || 'N/A'}
                  </span>
                  {newJobs[0].salary_grade && (
                    <span style={{ fontWeight: 600, color: '#0d9488' }}>
                      SG-{newJobs[0].salary_grade}
                    </span>
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={calendarminimalLogo} alt="" style={{ width: 14, height: 14 }} />
                   {formatClosingDate(newJobs[0].closing_date)}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/applicant/jobs`)}
                  style={{
                    background: '#4F46E5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#4F46E5'}
                >
                  Apply Now →
                </button>
              </div>
            )}

            {/* Recent Applications Card */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>
                  <ApplicantNotesIcon size={24} style={{ color: '#1e293b' }} />
                  Recent Applications
                </h3>
                <span className="view-all" onClick={() => navigate('/applicant/applications')}>
                  View All →
                </span>
              </div>
              <div className="card-body">
                {recentApplications.length === 0 ? (
                  <div className="empty-state">
                    <span className="icon">📭</span>
                    No applications yet. Start browsing jobs!
                  </div>
                ) : (
                  recentApplications.map((app) => {
                    const job = app.job_postings || {};
                    const statusStyle = getStatusColor(app.status);
                    const score = app.ai_match_score || 0;

                    return (
                      <div
                        key={app.id}
                        className="application-item"
                        onClick={() => navigate('/applicant/applications')}
                      >
                        <div className="app-item-header">
                          <div>
                            <div className="app-item-title">{job.position_title || 'Position Not Found'}</div>
                            <div className="app-item-location">
                              <img src={locationLogo} alt="" className="location-icon" />
                              {job.place_of_assignment || 'N/A'}
                            </div>
                          </div>
                          <span
                            className="app-item-status"
                            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                          >
                            {statusStyle.text}
                          </span>
                        </div>
                        <div className="app-item-details">
                          <span>
                            <img src={calendarminimalLogo} alt="" className="calendarsmall-icon" />
                            {formatDate(app.applied_date)}
                          </span>
                          {score > 0 && (
                            <span
                              className="app-item-score"
                              style={{ background: getScoreBg(score), color: getScoreColor(score) }}
                            >
                              Score: {score}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Latest Openings Grid */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>🔥 More Openings</h3>
                <span className="view-all" onClick={() => navigate('/applicant/jobs')}>
                  Browse All →
                </span>
              </div>
              <div className="card-body">
                {newJobs.length <= 1 ? (
                  <div className="empty-state">
                    <span className="icon">📭</span>
                    No new job openings at the moment. Check back soon!
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '12px'
                  }}>
                    {newJobs.slice(1, 5).map((job) => (
                      <div
                        key={job.id}
                        onClick={() => navigate(`/applicant/jobs/${job.id}`)}
                        style={{
                          background: '#f8f9fc',
                          borderRadius: '10px',
                          padding: '14px',
                          cursor: 'pointer',
                          border: '1px solid #eef0f5',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#eef2ff';
                          e.currentTarget.style.borderColor = '#c7d2fe';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f8f9fc';
                          e.currentTarget.style.borderColor = '#eef0f5';
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a3a5c', marginBottom: '6px' }}>
                          {job.position_title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                          {job.place_of_assignment}
                        </div>
                        {job.salary_grade && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0d9488',
                            background: '#f0fdfa',
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            SG-{job.salary_grade}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT COLUMN (4 cols) ─── */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Weather Widget */}
            <WeatherWidget />

           {/* Profile Completeness */}
<div className="dashboard-card">
  <div className="card-header">
    <h3>👤 Application Readiness</h3>
  </div>
  <div className="card-body">
    {(() => {
      // 🆕 REQUIRED checks (must be complete)
      const requiredChecks = [
        { label: 'Account created', done: true, href: null },
        { label: 'Contact information filled', done: !!(userProfile?.phone && userProfile?.address), href: '/applicant/profile' },
        { label: 'Personal Data Sheet uploaded', done: !!documents?.pds_file_url, href: '/applicant/profile' },
      ];

      // 🆕 OPTIONAL checks (nice to have)
      const optionalChecks = [
        { label: 'Transcript of Records', done: !!documents?.tor_file_url },
        { label: 'Performance Rating', done: !!documents?.performance_rating_file_url },
      ];

      const requiredDone = requiredChecks.filter(c => c.done).length;
      const requiredPercent = Math.round((requiredDone / requiredChecks.length) * 100);
      const allRequiredDone = requiredDone === requiredChecks.length;
      const optionalDone = optionalChecks.filter(c => c.done).length;

      return (
        <>
          {/* Overall readiness — based on required only */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'baseline', 
            gap: '8px', 
            marginBottom: '4px' 
          }}>
            <div style={{ 
              fontSize: '28px', 
              fontWeight: 700, 
              color: allRequiredDone ? '#0d9488' : requiredPercent >= 66 ? '#f59e0b' : '#dc2626'
            }}>
              {requiredPercent}%
            </div>
          
          </div>
          
          <div style={{
            height: '8px',
            background: '#f0f0f0',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '16px'
          }}>
            <div style={{
              width: `${requiredPercent}%`,
              height: '100%',
              background: allRequiredDone ? '#0d9488' : requiredPercent >= 66 ? '#f59e0b' : '#dc2626',
              borderRadius: '4px',
              transition: 'width 0.4s ease'
            }} />
          </div>

          {/* REQUIRED section */}
          <div style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            color: '#6c757d', 
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            Basics
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px 0', fontSize: '13px', lineHeight: 1.9 }}>
            {requiredChecks.map((check, i) => (
              <li 
                key={i} 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: check.done ? '#0d9488' : '#6c757d',
                  cursor: check.href && !check.done ? 'pointer' : 'default'
                }}
                onClick={() => {
                  if (check.href && !check.done) navigate(check.href);
                }}
              >
                <span>{check.done ? '✓' : '○'}</span>
                <span style={{ flex: 1 }}>{check.label}</span>
                {!check.done && check.href && (
                  <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: 600 }}>
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* OPTIONAL section */}
          <div style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            color: '#6c757d', 
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            Optional (for some jobs)
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: 1.9 }}>
            {optionalChecks.map((check, i) => (
              <li 
                key={i} 
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: check.done ? '#0d9488' : '#9ca3af',
                }}
              >
                <span>{check.done ? '✓' : '○'}</span>
                <span style={{ flex: 1 }}>{check.label}</span>
                {check.done && (
                  <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: 600 }}>
                    
                  </span>
                )}
              </li>
            ))}
          </ul>

          {/* Success message only when required is done */}
          {allRequiredDone && (
            <div style={{
              marginTop: '16px',
              padding: '10px 12px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#166534',
              fontWeight: 500
            }}>
              ✅ You're ready to apply to jobs!
              {optionalDone < optionalChecks.length && (
                <div style={{ marginTop: '4px', fontWeight: 400, fontSize: '11px' }}>
                  Add optional docs to expand job eligibility.
                </div>
              )}
            </div>
          )}
        </>
      );
    })()}
  </div>
</div>

            {/* Upcoming Interviews */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>📅 Upcoming Interviews</h3>
              </div>
              <div className="card-body">
                {upcomingInterviews.length === 0 ? (
                  <div className="empty-state">
                    <span className="icon">📅</span>
                    No upcoming interviews
                  </div>
                ) : (
                  upcomingInterviews.map((interview) => (
                    <div key={interview.id} style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #f0f0f0'
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#4F46E5', marginBottom: '4px' }}>
                        {formatInterviewDate(interview.scheduled_date)}
                      </div>
                      <div style={{ fontSize: '13px', color: '#1a3a5c', marginBottom: '2px' }}>
                        {interview.job_postings?.position_title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        📍 {interview.location || 'TBD'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>
                  <img src={mailBlackLogo} alt="" className="mail-black-icon" />
                  Notifications
                </h3>
                <span className="view-all" onClick={() => navigate('/applicant/applications')}>
                  View All →
                </span>
              </div>
              <div className="card-body notifications-body">
                {recentNotifications.length === 0 ? (
                  <div className="empty-state">
                    <span className="icon">🔕</span>
                    No notifications yet
                  </div>
                ) : (
                  recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                    >
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTime(notification.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Career Tips */}
            <div className="dashboard-card">
              <div className="card-header">
                <h3>💡 Career Tips</h3>
              </div>
              <div className="card-body">
                <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.9, fontSize: '13px', color: '#4a5568' }}>
                  <li>Tailor your resume to each job posting</li>
                  <li>Apply early — first applicants often get priority</li>
                  <li>Complete your profile to boost your AI match score</li>
                  <li>Prepare your PDS and Transcripts in advance</li>
                  <li>Check your email regularly for updates</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}