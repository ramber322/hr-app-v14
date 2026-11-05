import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../services/notificationService';
import { CheckIcon } from '../components/icons/CustomIcons';
import { NotificationIconApplicant } from "../components/icons/CustomIcons";


function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadNotifications();
      loadUnreadCount();

      const subscription = supabase
        .channel('notifications_channel')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          () => {
            loadNotifications();
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => subscription.unsubscribe();
    }
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getNotifications(userId);
    if (result.success) {
      setNotifications(result.data);
    }
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    if (!userId) return;
    const result = await getUnreadCount(userId);
    if (result.success) {
      setUnreadCount(result.count);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markAsRead(notificationId);
    loadNotifications();
    loadUnreadCount();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId);
    loadNotifications();
    loadUnreadCount();
  };

  const handleDelete = async (notificationId) => {
    await deleteNotification(notificationId);
    loadNotifications();
    loadUnreadCount();
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const formatTime = (timestamp) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d `;
  };

const getNotificationIcon = (type) => {
  const icons = {
    'status_update': '',
    'interview_schedule': ''
  };
  return icons[type] || '';
};

  const styles = `
    .notification-container {
      position: relative;
      display: inline-block;
    }

    .bell-icon {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      background: #f3f4f6;
      color: #4a5568;
      border: none;
    }

    .bell-icon:hover {
      background: #e5e7eb;
    }

    .bell-icon svg {
      width: 20px;
      height: 20px;
    }

    .bell-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #dc3545;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }

    .notification-dropdown {
      position: absolute;
      top: 45px;
      right: 0;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      width: 380px;
      max-height: 450px;
      overflow: hidden;
      z-index: 1002;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .notification-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    }

    .notification-header h4 {
      margin: 0;
      font-size: 16px;
      color: #1a1f36;
    }

    .mark-all-btn {
      background: none;
      border: none;
      color: #4f46e5;
      font-size: 12px;
      cursor: pointer;
      font-weight: 500;
    }

    .mark-all-btn:hover {
      text-decoration: underline;
    }

    .notification-list {
      max-height: 350px;
      overflow-y: auto;
    }

    .notification-item {
      padding: 12px 20px;
      cursor: pointer;
      transition: all 0.2s;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      align-items: center;  /* ← ADD THIS: Vertically centers all content */
      gap: 12px;
    }

    .notification-item:hover {
      background: #f8f9fa;
    }

    .notification-item.unread {
      background: #f0f4ff;
    }

    .notification-item.unread:hover {
      background: #d4daeb;
    }

    .notification-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      font-weight: 500;
      font-size: 13px;
      color: #1a1f36;
      margin-bottom: 2px;
    }

    .notification-message {
      font-size: 13px;
      color: #6c757d;
      line-height: 1.4;
    }

    .notification-time {
      font-size: 11px;
      color: #adb5bd;
      margin-top: 4px;
    }

    .notification-actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    .notification-actions button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
      border-radius: 4px;
      color: #6c757d;
    }

    .notification-actions button:hover {
      background: #e9ecef;
    }

    .notification-empty {
      padding: 40px 20px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }

    .notification-empty .icon {
      font-size: 40px;
      margin-bottom: 8px;
      display: block;
    }

    .loading-spinner {
      text-align: center;
      padding: 20px;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .notification-dropdown {
        width: 100%;
        right: -50px;
      }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="notification-container" ref={dropdownRef}>
        <button className="bell-icon" onClick={() => setIsOpen(!isOpen)}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 640 640" 
            width="20" 
            height="20" 
            fill="currentColor"
          >
            <path d="M320 64C302.3 64 288 78.3 288 96L288 99.2C215 114 160 178.6 160 256L160 277.7C160 325.8 143.6 372.5 113.6 410.1L103.8 422.3C98.7 428.6 96 436.4 96 444.5C96 464.1 111.9 480 131.5 480L508.4 480C528 480 543.9 464.1 543.9 444.5C543.9 436.4 541.2 428.6 536.1 422.3L526.3 410.1C496.4 372.5 480 325.8 480 277.7L480 256C480 178.6 425 114 352 99.2L352 96C352 78.3 337.7 64 320 64zM258 528C265.1 555.6 290.2 576 320 576C349.8 576 374.9 555.6 382 528L258 528z"/>
          </svg>
          {unreadCount > 0 && (
            <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        {isOpen && (
          <div className="notification-dropdown">
            <div className="notification-header">
              <h4>Notifications</h4>
              {unreadCount > 0 && (
                <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
                  Mark all as read
                </button>
              )}
            </div>

            <div className="notification-list">
              {loading ? (
                <div className="loading-spinner">Loading...</div>
              ) : notifications.length === 0 ? (
             <div 
  className="notification-empty"
  style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px 0',
    textAlign: 'center'
  }}
>
  <div className="icon">
    <NotificationIconApplicant size={58} color="#c7d2fe" />
  </div>
  <span style={{ fontSize: '13px', color: '#6c757d' }}>
    No notifications yet
  </span>
</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Dot indicator for unread notifications - VERTICALLY CENTERED */}
                    {!notification.is_read && (
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#4f46e5',
                        flexShrink: 0,
                        display: 'inline-block'
                      }} />
                    )}
                    
                    <span className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {formatTime(notification.created_at)}
                      </div>
                    </div>
                    <div className="notification-actions">
                      {!notification.is_read && (
                        <button onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(notification.id);
                        }} title="Mark as read">
                          <CheckIcon size={18} style={{ color: 'black' }} />
                        </button>
                      )}
                      <button onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(notification.id);
                      }} title="Delete">
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default NotificationBell;