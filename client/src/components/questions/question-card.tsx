import { useState } from "react";
import { CheckCircle, Circle, Calendar } from "lucide-react";
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
  onClick: () => void;
}

export function QuestionCard({ question, onClick }: QuestionCardProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const handleToggleLearned = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLearnedMutation.mutate(!question.isLearned);
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
        "cursor-pointer hover:shadow-md transition-shadow w-full",
        question.isLearned
          ? "border-green-500 bg-green-50"
          : "border-gray-200 bg-white"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <Badge
            className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded-full",
              question.isLearned
                ? "bg-green-500 text-white"
                : "bg-gray-300 text-gray-700"
            )}
          >
            {question.isLearned ? t("question.learned") : t("question.unlearned")}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto text-gray-400 hover:text-gray-600"
            onClick={handleToggleLearned}
            disabled={toggleLearnedMutation.isPending}
          >
            {question.isLearned ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Subject and Topic */}
        <div className="mb-1">
          <span className="text-xs text-gray-600 font-medium truncate">
            {question.subject.name}
          </span>
          <span className="text-xs text-gray-400 mx-1">•</span>
          <span className="text-xs text-gray-600 truncate">{question.topic.name}</span>
        </div>

        {/* Type Badge */}
        <div className="mb-2">
          <Badge className={cn("text-xs px-1.5 py-0.5", getTypeColor(question.type))}>
            {getTypeLabel(question.type)}
          </Badge>
        </div>

        {/* Theory Text */}
        <p className="text-xs text-gray-700 line-clamp-4 mb-2">
          {question.theory}
        </p>

        {/* Date */}
        <div className="text-xs text-gray-500 flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          {question.createdAt ? formatDate(question.createdAt) : ''}
        </div>
      </CardContent>
    </Card>
  );
}
