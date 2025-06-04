import { useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  // Set active tab to "all" when exams load
  if (!isLoadingExams && mockExams.length > 0 && !activeTab) {
    setActiveTab("all");
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
            {appliedFilters.mockExamIds.length > 0 ? (
              /* Filtered Mock Exams View */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                {/* Selected Exams Header */}
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("mockExam.selected")}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {appliedFilters.mockExamIds.map(examId => {
                      const exam = mockExams.find(e => e.id === examId);
                      return exam ? (
                        <Badge key={examId} className="bg-blue-100 text-blue-800 px-3 py-1">
                          {exam.title}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <div className="flex items-center space-x-4">
                    <Button
                      onClick={() => setIsAddQuestionModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t("question.add")}
                    </Button>
                  </div>
                </div>

                {/* Questions Content */}
                <div className="p-6">
                  <QuestionGrid filters={appliedFilters} />
                </div>
              </div>
            ) : (
              /* Mock Exam Tabs */
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      {/* Tab Navigation */}
                      <div className="flex items-center space-x-1">
                        {/* All Mock Exams Tab - Always visible */}
                        <button
                          onClick={() => setActiveTab("all")}
                          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === "all"
                              ? "text-blue-600 border-blue-600 bg-blue-50"
                              : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
                          }`}
                        >
                          {t("mockExam.all")}
                          <Badge className="ml-2 bg-blue-600 text-white text-xs">
                            {mockExams.reduce((total, exam) => total + exam.questionCount, 0)}
                          </Badge>
                        </button>

                        {/* First 3 mock exams as visible tabs */}
                        {mockExams.slice(0, 3).map((exam) => (
                          <button
                            key={exam.id}
                            onClick={() => setActiveTab(exam.id.toString())}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                              activeTab === exam.id.toString()
                                ? "text-blue-600 border-blue-600 bg-blue-50"
                                : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
                            }`}
                          >
                            {exam.title}
                            <Badge className="ml-2 bg-blue-600 text-white text-xs">
                              {exam.questionCount}
                            </Badge>
                          </button>
                        ))}

                        {/* Dropdown for remaining mock exams */}
                        {mockExams.length > 3 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center ${
                                  mockExams.slice(3).some(exam => exam.id.toString() === activeTab)
                                    ? "text-blue-600 border-blue-600 bg-blue-50"
                                    : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
                                }`}
                              >
                                {mockExams.slice(3).some(exam => exam.id.toString() === activeTab) ? (
                                  <>
                                    {mockExams.find(exam => exam.id.toString() === activeTab)?.title}
                                    <Badge className="ml-2 bg-blue-600 text-white text-xs">
                                      {mockExams.find(exam => exam.id.toString() === activeTab)?.questionCount}
                                    </Badge>
                                  </>
                                ) : (
                                  `+${mockExams.length - 3} más`
                                )}
                                <ChevronDown className="w-4 h-4 ml-1" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="min-w-[200px]">
                              {mockExams.slice(3).map((exam) => (
                                <DropdownMenuItem
                                  key={exam.id}
                                  onClick={() => setActiveTab(exam.id.toString())}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <span>{exam.title}</span>
                                  <Badge className="bg-blue-600 text-white text-xs">
                                    {exam.questionCount}
                                  </Badge>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      {/* Add New Mock Exam */}
                      <Dialog
                        open={isCreateExamModalOpen}
                        onOpenChange={setIsCreateExamModalOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-50 flex-shrink-0"
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
                      {activeTab === "all" ? (
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">{mockExams.reduce((total, exam) => total + exam.questionCount, 0)}</span>{" "}
                          {t("questions.total")}
                        </span>
                      ) : activeExam && (
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">{activeExam.questionCount}</span>{" "}
                          {t("questions.total")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* All Mock Exams Tab Content */}
                  <TabsContent value="all" className="p-6">
                    <QuestionGrid 
                      filters={appliedFilters}
                      groupByExam={true}
                    />
                  </TabsContent>

                  {/* Individual Mock Exam Tab Content */}
                  {mockExams.map((exam) => (
                    <TabsContent key={exam.id} value={exam.id.toString()} className="p-6">
                      <QuestionGrid 
                        filters={{
                          ...appliedFilters,
                          mockExamIds: [exam.id]
                        }} 
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
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
