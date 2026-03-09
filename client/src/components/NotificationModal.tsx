import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Notification, Soldier } from "@shared/schema";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface NotificationModalProps {
  notification: Notification;
  onClose: () => void;
}

export function NotificationModal({
  notification,
  onClose,
}: NotificationModalProps) {
  const [soldier, setSoldier] = useState<Soldier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (notification.relatedId) {
      fetch(`/api/soldiers/${notification.relatedId}`)
        .then((res) => res.json())
        .then((data) => {
          setSoldier(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [notification.relatedId]);

  const getNotificationIcon = () => {
    switch (notification.type) {
      case "promotion":
        return "🎖️";
      case "leave_end":
        return "📋";
      case "leave_warning":
        return "⚠️";
      case "absence_limit":
        return "❌";
      case "violation_alert":
        return "⛔";
      case "prisoner_release":
        return "🔓";
      default:
        return "📢";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{getNotificationIcon()}</span>
            {notification.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تفاصيل الإشعار</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{notification.message}</p>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-4">جاري التحميل...</div>
          ) : soldier ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">بيانات الجندي</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">الاسم الكامل</p>
                    <p className="font-semibold">{soldier.fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الرقم العسكري</p>
                    <p className="font-semibold">{soldier.militaryId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الرتبة</p>
                    <p className="font-semibold">{soldier.rank}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الوحدة</p>
                    <p className="font-semibold">{soldier.unit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">التخصص</p>
                    <p className="font-semibold">{soldier.specialization}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الحالة الإدارية</p>
                    <p className="font-semibold">{soldier.adminStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">الحالة الصحية</p>
                    <p className="font-semibold">{soldier.healthStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">رقم الهاتف</p>
                    <p className="font-semibold">{soldier.phoneNumber}</p>
                  </div>
                  {soldier.lastPromotionDate && (
                    <div>
                      <p className="text-sm text-gray-600">آخر ترقية</p>
                      <p className="font-semibold">
                        {new Date(soldier.lastPromotionDate).toLocaleDateString(
                          "ar-SA"
                        )}
                      </p>
                    </div>
                  )}
                  {soldier.nextPromotionDate && (
                    <div>
                      <p className="text-sm text-gray-600">الترقية المستحقة</p>
                      <p className="font-semibold">
                        {new Date(soldier.nextPromotionDate).toLocaleDateString(
                          "ar-SA"
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
