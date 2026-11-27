import React from 'react';
import { ArrowLeft, BellOff } from 'lucide-react';
import { NotificationItem, NotificationsPreset } from '../types';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  preset?: NotificationsPreset;
  onBack: () => void;
  onMarkAllRead: () => void;
  onSelectNotification: (item: NotificationItem) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  preset = 'default',
  onBack,
  onMarkAllRead,
  onSelectNotification,
}) => {
  const isEmpty = preset === 'empty' || notifications.length === 0;
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1.5 rounded-lg text-[#1C1917] hover:bg-black/5 cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-[24px] md:text-[30px] leading-[32px] md:leading-[38px] font-semibold tracking-tight text-[#1C1917]">
            Notifications
          </h1>
        </div>
      </div>

      {/* Notifications Card */}
      <div className="max-w-[780px] rounded-[12px] bg-white/95 border border-[#0F4024]/[0.08] shadow-glass-card overflow-hidden">
        {isEmpty ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#78716C]">
              <BellOff className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-[18px] font-semibold text-[#1C1917]">No notifications yet</p>
              <p className="text-[14px] text-[#57534E] max-w-sm mx-auto">
                We tell you when someone pays you or adds a bill.
              </p>
            </div>
          </div>
        ) : (
          <div>
            {/* Section Title Row */}
            <div className="px-5 py-4 border-b border-black/[0.06] flex items-center justify-between gap-3">
              <span className="text-[14px] font-semibold text-[#57534E]">Today</span>
              <button
                type="button"
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className={`text-[14px] font-semibold transition-colors ${
                  unreadCount > 0
                    ? 'text-[#14532D] hover:underline cursor-pointer'
                    : 'text-[#A8A29E] cursor-default'
                }`}
              >
                {unreadCount > 0 ? 'Mark all read' : 'All read'}
              </button>
            </div>

            {/* Notification Rows */}
            <div className="divide-y divide-black/[0.06]">
              {notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectNotification(item)}
                  className="w-full px-5 py-4 flex items-start gap-3.5 text-left hover:bg-[#F7FDF9] transition-colors cursor-pointer"
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 mt-2 ${
                      item.unread ? 'bg-[#15803D]' : 'bg-[#D9D9D6]'
                    }`}
                    aria-label={item.unread ? 'Unread' : 'Read'}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p
                      className={`text-[15px] leading-[21px] text-[#1C1917] ${
                        item.unread ? 'font-semibold' : 'font-medium'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-[13px] leading-[18px] text-[#57534E]">{item.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
