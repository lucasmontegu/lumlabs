"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Notification01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotifications, type MentionNotification } from "../hooks/use-notifications";
import { useSession } from "@/lib/auth-client";

interface NotificationBellProps {
  className?: string;
  onNotificationClick?: (notification: MentionNotification) => void;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
}: {
  notification: MentionNotification;
  onClick?: () => void;
  onMarkRead: () => void;
}) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead();
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-muted/50",
        !notification.read && "bg-primary/5"
      )}
    >
      {/* Avatar */}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        {notification.mentionedByImage ? (
          <img
            src={notification.mentionedByImage}
            alt={notification.mentionedBy}
            className="size-full rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium">
            {notification.mentionedBy.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {notification.mentionedBy}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          mentioned you in {notification.sessionName}
        </p>
        <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
          &ldquo;{notification.messagePreview}&rdquo;
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="size-2 shrink-0 rounded-full bg-primary mt-2" />
      )}
    </button>
  );
}

export function NotificationBell({
  className,
  onNotificationClick,
}: NotificationBellProps) {
  const { data: authSession } = useSession();
  const [open, setOpen] = React.useState(false);

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications({
    userId: authSession?.user?.id || "",
    enabled: !!authSession?.user,
  });

  const handleNotificationClick = (notification: MentionNotification) => {
    setOpen(false);
    onNotificationClick?.(notification);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "relative inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-8 w-8",
          className
        )}
      >
        <HugeiconsIcon icon={Notification01Icon} className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="font-medium text-sm">Notifications</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={clearAll}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HugeiconsIcon
                icon={Notification01Icon}
                className="size-8 text-muted-foreground/50 mb-2"
              />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
