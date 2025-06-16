import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Crown, Trash2, Settings, BarChart3 } from "lucide-react";
import { X, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { AdminModal } from "@/components/modals/admin-modal";

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
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");

  const { data: stats } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: isOpen,
  });

  

  const handleLogout = () => {
    logout();
    onClose();
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

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("user.profile")}
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t("stats.title")}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t("settings.title")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
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
          </TabsContent>

          

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  {t("trash.title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t("trash.description")}
                </p>
                {/* <TrashModal /> */}
              </CardContent>
            </Card>

            {user?.role === "admin" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    {t("admin.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {t("admin.description")}
                  </p>
                  <AdminModal />
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t("user.logout")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}