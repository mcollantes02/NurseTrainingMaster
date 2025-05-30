import { X, LogOut } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface UserStats {
  completedExams: number;
  learnedQuestions: number;
  totalQuestions: number;
  progressPercentage: number;
}

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: isOpen && !!user,
  });

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const getUserInitials = () => {
    if (!user) return "U";
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleDisplay = () => {
    if (!user) return "";
    return user.role === "admin" ? t("user.admin") : t("user.student");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t("user.profile")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src="" />
              <AvatarFallback className="text-lg">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                {user ? `${user.firstName} ${user.lastName}` : ""}
              </h3>
              <p className="text-sm text-gray-600">{user?.email}</p>
              <Badge className="mt-1 bg-blue-600">
                {getRoleDisplay()}
              </Badge>
            </div>
          </div>

          {/* Progress Stats */}
          {stats && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("stats.completedExams")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.completedExams}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("stats.learnedQuestions")}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {stats.learnedQuestions}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("stats.totalQuestions")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.totalQuestions}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={stats.progressPercentage} className="h-2" />
                <p className="text-xs text-gray-600 text-center">
                  {stats.progressPercentage}% {t("stats.overallProgress")}
                </p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full text-gray-700 hover:bg-gray-100"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t("user.logout")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
