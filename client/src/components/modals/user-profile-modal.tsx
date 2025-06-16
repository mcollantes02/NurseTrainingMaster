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
import { User, Crown, Trash2, Settings, BarChart3, Edit3, FileText } from "lucide-react";
import type { MockExamWithQuestionCount } from "@shared/schema";
import { X, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [editingExamTitle, setEditingExamTitle] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["/api/user/stats"],
    enabled: isOpen,
  });

  const { data: mockExams = [] } = useQuery<MockExamWithQuestionCount[]>({
    queryKey: ["/api/mock-exams"],
    enabled: isOpen,
  });

  const updateExamMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await apiRequest("PUT", `/api/mock-exams/${id}`, { title });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      setEditingExamId(null);
      setEditingExamTitle("");
      toast({
        title: t("success.title"),
        description: t("mockExam.updated"),
      });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.updateExam"),
        variant: "destructive",
      });
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/mock-exams/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      toast({
        title: t("success.title"),
        description: t("mockExam.deleted"),
      });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.deleteExam"),
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleEditExam = (exam: MockExamWithQuestionCount) => {
    setEditingExamId(exam.id);
    setEditingExamTitle(exam.title);
  };

  const handleSaveExam = () => {
    if (editingExamId && editingExamTitle.trim()) {
      updateExamMutation.mutate({ id: editingExamId, title: editingExamTitle.trim() });
    }
  };

  const handleCancelEdit = () => {
    setEditingExamId(null);
    setEditingExamTitle("");
  };

  const handleDeleteExam = (id: number) => {
    deleteExamMutation.mutate(id);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("user.profile")}
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t("stats.title")}
            </TabsTrigger>
            <TabsTrigger value="mockexams" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t("mockExam.manage")}
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

          <TabsContent value="mockexams" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t("mockExam.manage")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t("mockExam.manageDescription")}
                </p>

                {mockExams.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    {t("mockExam.noExams")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {mockExams.map((exam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {editingExamId === exam.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editingExamTitle}
                                onChange={(e) => setEditingExamTitle(e.target.value)}
                                className="flex-1"
                                placeholder={t("mockExam.titlePlaceholder")}
                              />
                              <Button
                                size="sm"
                                onClick={handleSaveExam}
                                disabled={!editingExamTitle.trim() || updateExamMutation.isPending}
                              >
                                {t("save")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                {t("cancel")}
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <h4 className="font-medium">{exam.title}</h4>
                                <p className="text-sm text-gray-500">
                                  {exam.questionCount} {t("questions.total")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditExam(exam)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t("mockExam.confirmDelete")}</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {t("mockExam.deleteWarning", { title: exam.title, count: exam.questionCount })}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteExam(exam.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={deleteExamMutation.isPending}
                                      >
                                        {t("delete")}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
                <CardContent>
                  {/* <AdminModal /> */}
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