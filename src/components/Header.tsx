/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, CloudLightning, RefreshCw, UserCheck } from "lucide-react";
import { AppNotification, User } from "../types.js";

interface HeaderProps {
  user: User;
  notifications: AppNotification[];
  refreshNotifications: () => void;
  title: string;
}

export default function Header({
  user,
  notifications,
  refreshNotifications,
  title
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      if (response.ok) {
        refreshNotifications();
      }
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  return (
    <header className="sticky top-0 right-0 h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center justify-between px-6 z-30 shadow-xs">
      <div className="flex items-center gap-4">
        <h2 className="font-sans font-semibold text-lg text-slate-800 tracking-tight">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Dropdown Container */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 transition"
            aria-label="Toggle notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-rose-500 text-white font-semibold text-[10px] rounded-full flex items-center justify-center border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-700">Notifications ({unreadCount})</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead} 
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-neutral-400 text-xs">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-3.5 text-xs transition ${n.isRead ? "bg-white" : "bg-indigo-50/40"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 p-1 rounded-full bg-indigo-100 text-indigo-600 shrink-0">
                          <UserCheck size={12} />
                        </div>
                        <div className="flex-1">
                          <p className="text-neutral-700 font-medium leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-neutral-400 block mt-1 font-mono">
                            {new Date(n.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Date details */}
        <div className="hidden md:flex flex-col items-end border-l border-neutral-200 pl-4">
          <span className="text-xs text-neutral-400 font-medium font-mono">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="text-xs font-semibold text-neutral-700">
            {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </header>
  );
}
