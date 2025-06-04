
import { useState } from "react";
import { CheckCircle, Circle, Calendar, Edit, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionWithRelations } from "@shared/schema";

interface QuestionCardProps {
  question: QuestionWithRelations;
  onClick?: () => void;
  onEdit?: () => void;
}

export function QuestionCard({ question, onClick, onEdit }: QuestionCardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleLearnedMutation = useMutation({
    mutationFn: async (isLearned: boolean) => {
      const response = await apiRequest(
        "PATCH",
        `/api/questions/${question.id}/learned`,
        { isLearned }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.updateQuestion"),
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/questions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trash"] });
      toast({
        title: t("question.deleted"),
        description: t("question.deletedDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.deleteQuestion"),
        variant: "destructive",
      });
    },
  });

  const handleToggleLearned = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLearnedMutation.mutate(!question.isLearned);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t("question.deleteConfirm"))) {
      deleteQuestionMutation.mutate(question.id);
    }
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
    if (onClick) {
      onClick();
    }
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
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
    <Card
      className={cn(
        "cursor-pointer hover:shadow-md transition-all duration-200 w-full",
        question.isLearned
          ? "border-green-500 bg-green-50"
          : "border-gray-200 bg-white"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Mobile Layout */}
        <div className="block sm:hidden">
          {/* Top Row - Status and Type */}
          <div className="flex items-center justify-between mb-2">
            <Badge
              className={cn(
                "text-xs font-medium px-2 py-1 rounded-full",
                question.isLearned
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-gray-700"
              )}
            >
              {question.isLearned ? t("question.learned") : t("question.unlearned")}
            </Badge>

            <Badge className={cn("text-xs px-2 py-1", getTypeColor(question.type))}>
              {getTypeLabel(question.type)}
            </Badge>
          </div>

          {/* Subject and Topic */}
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
            <span className="font-medium">{question.subject.name}</span>
            <span className="text-gray-400">•</span>
            <span className="truncate">{question.topic.name}</span>
          </div>

          {/* Theory Text */}
          <div className="mb-3">
            <p className={cn(
              "text-sm text-gray-700 break-words overflow-hidden",
              isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
            )}>
              {question.theory}
            </p>
          </div>

          {/* Bottom Row - Date and Actions */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              {question.createdAt ? formatDate(question.createdAt) : ''}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-blue-600"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-red-600"
                onClick={handleDelete}
                disabled={deleteQuestionMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-gray-600"
                onClick={handleToggleLearned}
                disabled={toggleLearnedMutation.isPending}
              >
                {question.isLearned ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-gray-600"
                onClick={handleExpandToggle}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:block">
          {/* Main Content Row */}
          <div className="flex items-start justify-between gap-4">
            {/* Left Section - Status and Metadata */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              <Badge
                className={cn(
                  "text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap",
                  question.isLearned
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-700"
                )}
              >
                {question.isLearned ? t("question.learned") : t("question.unlearned")}
              </Badge>

              <div className="flex items-center gap-2 text-xs text-gray-600 whitespace-nowrap">
                <span className="font-medium">{question.subject.name}</span>
                <span className="text-gray-400">•</span>
                <span>{question.topic.name}</span>
              </div>

              <Badge className={cn("text-xs px-2 py-1 whitespace-nowrap", getTypeColor(question.type))}>
                {getTypeLabel(question.type)}
              </Badge>
            </div>

            {/* Center Section - Theory Text */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm text-gray-700 break-words overflow-hidden",
                isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
              )}>
                {question.theory}
              </p>
            </div>

            {/* Right Section - Actions and Date */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-xs text-gray-500 flex items-center whitespace-nowrap">
                <Calendar className="h-3 w-3 mr-1" />
                {question.createdAt ? formatDate(question.createdAt) : ''}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-blue-600"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-red-600"
                onClick={handleDelete}
                disabled={deleteQuestionMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-gray-600"
                onClick={handleToggleLearned}
                disabled={toggleLearnedMutation.isPending}
              >
                {question.isLearned ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-auto text-gray-400 hover:text-gray-600"
                onClick={handleExpandToggle}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
