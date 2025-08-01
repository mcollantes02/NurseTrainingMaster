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
    onMutate: async (isLearned: boolean) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/questions"] });

      // Snapshot the previous value
      const previousQuestions = queryClient.getQueryData(["/api/questions"]);

      // Optimistically update the cache
      queryClient.setQueryData(["/api/questions"], (old: any) => {
        if (!old) return old;
        return old.map((q: any) => 
          q.id === question.id 
            ? { ...q, isLearned } 
            : q
        );
      });

      // Return a context object with the snapshotted value
      return { previousQuestions };
    },
    onError: (err, isLearned, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousQuestions) {
        queryClient.setQueryData(["/api/questions"], context.previousQuestions);
      }

      toast({
        title: t("error.title"),
        description: t("error.updateQuestion"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the correct data
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
  });

  const updateFailureCountMutation = useMutation({
    mutationFn: async (newCount: number) => {
      const response = await apiRequest(
        "PATCH",
        `/api/questions/${question.id}/failure-count`,
        { failureCount: newCount }
      );
      return response.json();
    },
    onMutate: async (newCount: number) => {
      // Cancel any outgoing refetches for instant UI updates
      await queryClient.cancelQueries({ queryKey: ["/api/questions"] });

      // Snapshot the previous value  
      const previousQuestions = queryClient.getQueryData(["/api/questions"]);

      // Build the correct query key that matches what's being used
      const currentFilters = new URLSearchParams(window.location.search);
      const queryKey = ["/api/questions", currentFilters.toString()];

      // Optimistically update both possible query keys
      queryClient.setQueryData(["/api/questions"], (old: any) => {
        if (!old) return old;
        return old.map((q: any) => 
          q.id === question.id 
            ? { ...q, failureCount: newCount } 
            : q
        );
      });

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return old.map((q: any) => 
          q.id === question.id 
            ? { ...q, failureCount: newCount } 
            : q
        );
      });

      return { previousQuestions, newCount };
    },
    onError: (err, newCount, context) => {
      // Rollback optimistic updates on error
      if (context?.previousQuestions) {
        queryClient.setQueryData(["/api/questions"], context.previousQuestions);

        const currentFilters = new URLSearchParams(window.location.search);
        const queryKey = ["/api/questions", currentFilters.toString()];
        queryClient.setQueryData(queryKey, context.previousQuestions);
      }
      toast({
        title: t("error.title"),
        description: t("error.updateQuestion"),
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      // Ensure the UI reflects the server response
      const updateQueries = (old: any) => {
        if (!old) return old;
        return old.map((q: any) => 
          q.id === question.id 
            ? { ...q, failureCount: data.failureCount } 
            : q
        );
      };

      queryClient.setQueryData(["/api/questions"], updateQueries);

      const currentFilters = new URLSearchParams(window.location.search);
      const queryKey = ["/api/questions", currentFilters.toString()];
      queryClient.setQueryData(queryKey, updateQueries);
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

  const handleFailureCountChange = async (change: 1 | -1) => {
    try {
      console.log(`Updating failure count for question ${question.id} with change: ${change}`);
      const response = await apiRequest("PATCH", `/api/questions/${question.id}/failure-count`, {
        change
      });

      if (response.ok) {
        const updatedQuestion = await response.json();
        console.log(`Updated question ${question.id} failure count to:`, updatedQuestion.failureCount);

        // Invalidate all question queries to ensure fresh data
        await queryClient.invalidateQueries({ queryKey: ["/api/questions"] });

        // Force refetch with current filters
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to update failure count:", error);
    }
  };

  const getFailureCountColor = (count: number) => {
    if (count === 0) return "text-gray-400";
    if (count === 1) return "text-orange-500";
    return "text-red-500";
  };

  const handleCardClick = () => {
    setIsExpanded(!isExpanded);
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
        "cursor-pointer hover:shadow-md transition-all duration-200 w-full overflow-hidden",
        question.isLearned
          ? "border-green-500 bg-green-50"
          : "border-gray-200 bg-white"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        {/* Main Row - Metadata and Theory side by side */}
        <div className="flex items-start gap-4">
          {/* Left Section - Status and Metadata */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink-0 flex-wrap">
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

            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-medium">{question.subject.name}</span>
              <span className="text-gray-400 hidden sm:inline">•</span>
              <span className="hidden sm:inline">{question.topic.name}</span>
            </div>

            <Badge className={cn("text-xs px-2 py-1 whitespace-nowrap", getTypeColor(question.type))}>
              {getTypeLabel(question.type)}
            </Badge>
          </div>

          {/* Center Section - Theory Text */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className={cn(
              "text-sm text-gray-700 leading-relaxed break-all",
              isExpanded ? "whitespace-pre-wrap" : "line-clamp-2"
            )}>
              {question.theory}
            </div>
          </div>

          {/* Right Section - Actions and Date */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Failure Counter */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-5 w-5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors duration-75 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFailureCountChange(-1);
                }}
                disabled={(question.failureCount || 0) === 0}
                type="button"
                aria-label="Decrease failure count"
              >
                −
              </Button>
              <span className={cn("text-xs font-medium min-w-[16px] text-center transition-colors duration-75", getFailureCountColor(question.failureCount || 0))}>
                {question.failureCount || 0}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-5 w-5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors duration-75 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFailureCountChange(1);
                }}
                type="button"
                aria-label="Increase failure count"
              >
                +
              </Button>
            </div>

            <div className="text-xs text-gray-500 flex items-center whitespace-nowrap hidden md:flex">
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

        {/* Mobile-only metadata row */}
        <div className="flex items-center gap-2 text-xs text-gray-600 mt-3 sm:hidden">
          <span>{question.topic.name}</span>
          <span className="text-gray-400">•</span>
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            {question.createdAt ? formatDate(question.createdAt) : ''}
          </div>
        </div>


      </CardContent>
    </Card>
  );
}