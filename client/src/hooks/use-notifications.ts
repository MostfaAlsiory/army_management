import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Notification } from "@shared/schema";

export function useNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications");
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json() as Promise<Notification[]>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const generateNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/generate", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate notifications");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: (id: number) => markAsReadMutation.mutate(id),
    generateNotifications: () => generateNotificationsMutation.mutate(),
    isGenerating: generateNotificationsMutation.isPending,
  };
}
