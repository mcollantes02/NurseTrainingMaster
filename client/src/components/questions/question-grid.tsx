import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { QuestionCard } from "./question-card";
import { EditQuestionModal } from "@/components/modals/edit-question-modal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestionWithRelations } from "@shared/schema";

interface QuestionGridProps {
  filters: {
    mockExamIds?: number[];
    subjectIds?: number[];
    topicIds?: number[];
    keywords?: string;
    learningStatus?: boolean[];
  };
}

export function QuestionGrid({ filters }: QuestionGridProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithRelations | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const itemsPerPage = 12;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const queryParams = new URLSearchParams();
  if (filters.mockExamIds?.length) {
    filters.mockExamIds.forEach(id => queryParams.append('mockExamIds', id.toString()));
  }
  if (filters.subjectIds?.length) {
    filters.subjectIds.forEach(id => queryParams.append('subjectIds', id.toString()));
  }
  if (filters.topicIds?.length) {
    filters.topicIds.forEach(id => queryParams.append('topicIds', id.toString()));
  }
  if (filters.keywords) {
    queryParams.append('keywords', filters.keywords);
  }
  if (filters.learningStatus?.length) {
    filters.learningStatus.forEach(status => queryParams.append('learningStatus', status.toString()));
  }

  const { data: questions = [], isLoading } = useQuery<QuestionWithRelations[]>({
    queryKey: ["/api/questions", queryParams.toString()],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/questions?${queryParams.toString()}`);
      return response.json();
    },
  });

  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentQuestions = questions.slice(startIndex, endIndex);

  const handleQuestionClick = (question: QuestionWithRelations) => {
    // Question click is now handled by the card itself for expansion
  };

  const handleQuestionEdit = (question: QuestionWithRelations) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setEditingQuestion(null);
    setIsEditModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">{t("questions.noResults")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Questions Counter */}
      {(filters.mockExamIds?.length || filters.subjectIds?.length || filters.topicIds?.length || filters.keywords || filters.learningStatus?.length) ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            <span className="font-medium">{questions.length}</span>{" "}
            {t("questions.found")}
          </span>
        </div>
      ) : null}

      {/* Questions List - Single column vertical layout */}
      <div className="space-y-3">
        {currentQuestions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            onClick={() => handleQuestionClick(question)}
            onEdit={() => handleQuestionEdit(question)}
          />
        ))}
      </div>

      {/* Edit Question Modal */}
      <EditQuestionModal
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        question={editingQuestion}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            {t("pagination.showing")}{" "}
            <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, questions.length)}</span>{" "}
            {t("pagination.of")}{" "}
            <span className="font-medium">{questions.length}</span>{" "}
            {t("pagination.questions")}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className={currentPage === pageNum ? "bg-blue-600 text-white" : ""}
                >
                  {pageNum}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
