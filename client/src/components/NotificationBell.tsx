import { Bell } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useState } from "react";
import { NotificationModal } from "./NotificationModal";
import { Notification } from "@shared/schema";

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, generateNotifications, isGenerating } = useNotifications();
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center p-3 border-b sticky top-0 bg-white z-10">
            <span className="font-bold text-sm">الإشعارات</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.preventDefault();
                generateNotifications();
              }} 
              disabled={isGenerating}
            >
              {isGenerating ? "جاري التحديث..." : "تحديث التنبيهات"}
            </Button>
          </div>
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              لا توجد إشعارات
            </div>
          ) : (
            notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.isRead ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm">
                    {notification.title}
                  </span>
                  {!notification.isRead && (
                    <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <span className="text-xs text-gray-400 mt-1">
                  {new Date(notification.createdAt).toLocaleDateString("ar-SA")}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedNotification && (
        <NotificationModal
          notification={selectedNotification}
          onClose={() => setSelectedNotification(null)}
        />
      )}
    </>
  );
}
