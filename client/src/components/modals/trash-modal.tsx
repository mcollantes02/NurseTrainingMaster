
import { useState } from "react";
import { Trash2, RotateCcw, X, AlertTriangle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { TrashedQuestionWithUser } from "@shared/schema";

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrashModal({ isOpen, onClose }: TrashModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: trashedQuestions = [], isLoading } = useQuery<TrashedQuestionWithUser[]>({
    queryKey: ["/api/trash"],
    enabled: isOpen,
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/trash/${id}/restore`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: t("trash.restored"),
        description: t("trash.restoredDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.restoreQuestion"),
        variant: "destructive",
      });
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/trash/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      setDeletingId(null);
      toast({
        title: t("trash.permanentlyDeleted"),
        description: t("trash.permanentlyDeletedDescription"),
      });
    },
    onError: () => {
      setDeletingId(null);
      toast({
        title: t("error.title"),
        description: t("error.permanentDelete"),
        variant: "destructive",
      });
    },
  });

  const emptyTrashMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/trash");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      setShowEmptyConfirm(false);
      toast({
        title: t("trash.emptied"),
        description: t("trash.emptiedDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.emptyTrash"),
        variant: "destructive",
      });
    },
  });

  const handleRestore = (id: number) => {
    restoreMutation.mutate(id);
  };

  const handlePermanentDelete = (id: number) => {
    setDeletingId(id);
  };

  const confirmPermanentDelete = () => {
    if (deletingId) {
      permanentDeleteMutation.mutate(deletingId);
    }
  };

  const handleEmptyTrash = () => {
    setShowEmptyConfirm(true);
  };

  const confirmEmptyTrash = () => {
    emptyTrashMutation.mutate();
  };

  const getTypeColor = (type: string) => {
    return type === "error" 
      ? "bg-red-500 text-white" 
      : "bg-orange-500 text-white";
  };

  const getTypeLabel = (type: string) => {
    return type === "error" ? t("question.error") : t("question.doubt");
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("trash.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : trashedQuestions.length === 0 ? (
              <div className="text-center py-8">
                <Trash2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">{t("trash.empty")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">
                    <span className="font-medium">{trashedQuestions.length}</span>{" "}
                    {t("trash.itemsCount")}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleEmptyTrash}
                    disabled={emptyTrashMutation.isPending}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t("trash.emptyTrash")}
                  </Button>
                </div>

                {trashedQuestions.map((question) => (
                  <div
                    key={question.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left Section - Metadata */}
                      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="font-medium">{question.subjectName}</span>
                          <span className="text-gray-400">•</span>
                          <span>{question.topicName}</span>
                        </div>

                        <Badge className={cn("text-xs px-2 py-1", getTypeColor(question.type))}>
                          {getTypeLabel(question.type)}
                        </Badge>

                        <div className="text-xs text-gray-500">
                          {t("trash.deletedOn")}: {formatDate(question.deletedAt!)}
                        </div>
                      </div>

                      {/* Center Section - Theory */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {question.theory}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          {t("mockExam.title")}: {question.mockExamTitle}
                        </div>
                      </div>

                      {/* Right Section - Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(question.id)}
                          disabled={restoreMutation.isPending}
                          className="text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {t("trash.restore")}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handlePermanentDelete(question.id)}
                          disabled={permanentDeleteMutation.isPending}
                          className="text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          {t("trash.permanentDelete")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("trash.permanentDeleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("trash.permanentDeleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("trash.permanentDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Confirmation */}
      <AlertDialog open={showEmptyConfirm} onOpenChange={setShowEmptyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t("trash.emptyTrashConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("trash.emptyTrashWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmEmptyTrash}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("trash.emptyTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
