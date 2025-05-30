import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/navigation/header";
import { AdvancedFilters } from "@/components/filters/advanced-filters";
import { QuestionGrid } from "@/components/questions/question-grid";
import { AddQuestionModal } from "@/components/modals/add-question-modal";
import { UserProfileModal } from "@/components/modals/user-profile-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MockExamWithQuestionCount } from "@shared/schema";

interface FiltersState {
  mockExamIds: number[];
  subjectIds: number[];
  topicIds: number[];
  keywords: string;
  learningStatus: boolean[];
}

export default function Dashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("");
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [filters, setFilters] = useState<FiltersState>({
    mockExamIds: [],
    subjectIds: [],
    topicIds: [],
    keywords: "",
    learningStatus: [],
  });
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(filters);

  const { data: mockExams = [], isLoading: isLoadingExams } = useQuery<MockExamWithQuestionCount[]>({
    queryKey: ["/api/mock-exams"],
  });

  const createExamMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/mock-exams", { title });
      return response.json();
    },
    onSuccess: (newExam) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      setActiveTab(newExam.id.toString());
      setNewExamTitle("");
      setIsCreateExamModalOpen(false);
      toast({
        title: t("mockExam.created"),
        description: t("mockExam.createdDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("error.title"),
        description: t("error.createExam"),
        variant: "destructive",
      });
    },
  });

  // Set active tab to first exam when exams load
  if (!isLoadingExams && mockExams.length > 0 && !activeTab) {
    setActiveTab(mockExams[0].id.toString());
  }

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const handleCreateExam = () => {
    if (newExamTitle.trim()) {
      createExamMutation.mutate(newExamTitle.trim());
    }
  };

  const activeExam = mockExams.find(exam => exam.id.toString() === activeTab);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onUserProfileClick={() => setIsUserProfileModalOpen(true)} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <AdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={handleApplyFilters}
          />

          {/* Main Content */}
          <div className="flex-1">
            {/* Mock Exam Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="border-b border-gray-200">
                  <div className="flex flex-wrap items-center">
                    <TabsList className="h-auto p-0 bg-transparent">
                      {mockExams.map((exam) => (
                        <TabsTrigger
                          key={exam.id}
                          value={exam.id.toString()}
                          className="px-6 py-3 text-sm font-medium data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-blue-50 rounded-none border-b-2 border-transparent"
                        >
                          {exam.title}
                          <Badge className="ml-2 bg-blue-600 text-white text-xs">
                            {exam.questionCount}
                          </Badge>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {/* Add New Mock Exam */}
                    <Dialog
                      open={isCreateExamModalOpen}
                      onOpenChange={setIsCreateExamModalOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          className="px-6 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          {t("mockExam.new")}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t("mockExam.create")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="exam-title">{t("mockExam.title")}</Label>
                            <Input
                              id="exam-title"
                              value={newExamTitle}
                              onChange={(e) => setNewExamTitle(e.target.value)}
                              placeholder={t("mockExam.titlePlaceholder")}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsCreateExamModalOpen(false);
                                setNewExamTitle("");
                              }}
                            >
                              {t("cancel")}
                            </Button>
                            <Button
                              onClick={handleCreateExam}
                              disabled={!newExamTitle.trim() || createExamMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {t("create")}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={() => setIsAddQuestionModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("question.add")}
                    </Button>
                    {activeExam && (
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">{activeExam.questionCount}</span>{" "}
                        {t("questions.total")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tab Content */}
                {mockExams.map((exam) => (
                  <TabsContent key={exam.id} value={exam.id.toString()} className="p-6">
                    <QuestionGrid filters={appliedFilters} />
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddQuestionModal
        isOpen={isAddQuestionModalOpen}
        onClose={() => setIsAddQuestionModalOpen(false)}
      />
      
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
      />
    </div>
  );
}
