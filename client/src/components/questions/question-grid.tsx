import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { QuestionCard } from "./question-card";
import { EditQuestionModal } from "@/components/modals/edit-question-modal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestionWithRelations } from "@shared/schema";

interface FiltersState {
  mockExamIds: number[];
  subjectIds: number[];
  topicIds: number[];
  keywords: string;
  learningStatus: boolean[];
  failureCount: {
    min: number | undefined;
    max: number | undefined;
    exact: number | undefined;
  };
}

interface QuestionGridProps {
  filters: FiltersState;
  groupByExam?: boolean;
  sortBy?: "newest" | "oldest" | "nameAsc";
  isAllTab?: boolean;
}

export function QuestionGrid({ filters, groupByExam = false, sortBy = "newest", isAllTab = false }: QuestionGridProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [editingQuestion, setEditingQuestion] = useState<QuestionWithRelations | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(() => isAllTab ? 75 : 25);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(isAllTab ? 75 : 25);
  }, [filters, isAllTab]);

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
  if (filters.failureCount?.exact !== undefined && filters.failureCount.exact !== null) {
    queryParams.append('failureCountExact', filters.failureCount.exact.toString());
  }
  if (filters.failureCount?.min !== undefined && filters.failureCount.min !== null) {
    queryParams.append('failureCountMin', filters.failureCount.min.toString());
  }
  if (filters.failureCount?.max !== undefined && filters.failureCount.max !== null) {
    queryParams.append('failureCountMax', filters.failureCount.max.toString());
  }

  // Mock isLoadingUser to be false for the purpose of this example as it's not provided
  const isLoadingUser = false; 

  const { data: questions = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/questions", queryParams.toString()],
    queryFn: async () => {
      const url = `/api/questions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiRequest("GET", url);
      return response.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 30 * 1000, // 30 segundos - menor tiempo para ver cambios más rápido
    gcTime: 2 * 60 * 1000, // 2 minutos
    enabled: true,
    retry: 1,
    retryDelay: 1000,
  });

  // Eliminar el refetch automático al cambiar filtros - usar solo el cache de React Query
  // Esto evita solicitudes innecesarias

  const currentQuestions = questions.slice(0, visibleCount);
  const hasMore = questions.length > visibleCount;
  
  const handleLoadMore = () => {
    const increment = isAllTab ? 75 : 25;
    setVisibleCount(prev => prev + increment);
  };

  const handleQuestionClick = (question: QuestionWithRelations) => {
    // Question click is now handled by the card itself for expansion
  };

  const handleQuestionEdit = (question: QuestionWithRelations) => {
    console.log("Edit button clicked for question:", question.id);
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

  // Debug: log the first question to see its structure
  if (questions.length > 0) {
    
  }

  if (groupByExam) {
    // Group questions by mock exam
    const questionsByExam = questions.reduce((acc, question) => {
      // Check if question has mockExams array (for questions belonging to multiple exams)
      if (question.mockExams && Array.isArray(question.mockExams) && question.mockExams.length > 0) {
        // Add question to each mock exam it belongs to
        question.mockExams.forEach(mockExam => {
          if (mockExam && mockExam.title) {
            const examTitle = mockExam.title;
            if (!acc[examTitle]) {
              acc[examTitle] = [];
            }
            acc[examTitle].push(question);
          }
        });
      } else if (question.mockExam && question.mockExam.title) {
        // Fallback to single mockExam if mockExams array is not available
        const examTitle = question.mockExam.title;
        if (!acc[examTitle]) {
          acc[examTitle] = [];
        }
        acc[examTitle].push(question);
      }

      return acc;
    }, {} as Record<string, typeof questions>);

      // Get exam order based on sorting criteria
    const examOrder = Object.keys(questionsByExam).sort((examTitleA, examTitleB) => {
      const questionsA = questionsByExam[examTitleA];
      const questionsB = questionsByExam[examTitleB];

      if (questionsA.length === 0 || questionsB.length === 0) return 0;

      // Use the first question's mockExam data to compare
      const examA = questionsA[0]?.mockExam;
      const examB = questionsB[0]?.mockExam;

      // Safety check: ensure both exams exist
      if (!examA || !examB) return 0;

      if (sortBy === "newest") {
        return new Date(examB.createdAt).getTime() - new Date(examA.createdAt).getTime();
      } else if (sortBy === "oldest") {
        return new Date(examA.createdAt).getTime() - new Date(examB.createdAt).getTime();
      } else if (sortBy === "nameAsc") {
        return examA.title.localeCompare(examB.title);
      }
      return 0;
    });

    return (
      <>
        <div className="space-y-8">
          {examOrder.map((examTitle) => {
            const examQuestions = questionsByExam[examTitle];
            return (
            <div key={examTitle}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                {examTitle} ({examQuestions.length} {examQuestions.length === 1 ? t("question.single") : t("questions.label")})
              </h3>
              <div className="space-y-2">
                {examQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    onClick={() => handleQuestionClick(question)}
                    onEdit={() => handleQuestionEdit(question)}
                  />
                ))}
              </div>
            </div>
            );
          })}
        </div>

        {/* Edit Question Modal for grouped view */}
        <EditQuestionModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          question={editingQuestion}
        />
      </>
    );
  }

  return (
    <div className="space-y-3">
      {/* Total Questions Counter */}
      {(filters.mockExamIds?.length || filters.subjectIds?.length || filters.topicIds?.length || filters.keywords || filters.learningStatus?.length) ? (
        <div className="flex items-center justify-between -mt-2">
          <span className="text-sm text-gray-600">
            <span className="font-medium">{questions.length}</span>{" "}
            {questions.length === 1 ? t("question.single") : t("questions.found")}
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

      {/* Load More Button */}
      {hasMore && (
        <div className="flex items-center justify-center border-t border-gray-200 pt-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-3">
              {t("pagination.showing")}{" "}
              <span className="font-medium">{currentQuestions.length}</span>{" "}
              {t("pagination.of")}{" "}
              <span className="font-medium">{questions.length}</span>{" "}
              {t("pagination.questions")}
            </div>
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              {t("loadMore")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}