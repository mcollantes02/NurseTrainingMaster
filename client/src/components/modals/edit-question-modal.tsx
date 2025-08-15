import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import type { QuestionWithRelations, MockExam, Subject, Topic } from "@shared/schema";

const formSchema = z.object({
  mockExamIds: z.array(z.number()).min(1, "At least one mock exam is required"),
  subjectName: z.string().min(1, "Subject is required"),
  topicName: z.string().min(1, "Topic is required"),
  type: z.enum(["error", "doubt"]),
  theory: z.string().min(1, "Theory is required"),
  failureCount: z.number().min(0).default(0),
  isLearned: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface EditQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: QuestionWithRelations | null;
}

export function EditQuestionModal({ isOpen, onClose, question }: EditQuestionModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: mockExams = [] } = useQuery<MockExam[]>({
    queryKey: ["/api/mock-exams"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      isLearned: false,
      failureCount: 0,
    },
  });

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      // Extract mock exam IDs from different possible sources
      let mockExamIds: number[] = [];

      if (question.mockExamIds && Array.isArray(question.mockExamIds)) {
        // Use mockExamIds if available (from server response)
        mockExamIds = question.mockExamIds;
      } else if (question.mockExams && Array.isArray(question.mockExams) && question.mockExams.length > 0) {
        // Extract from mockExams array
        mockExamIds = question.mockExams.map(exam => exam.id).filter(id => id != null);
      } else if (question.mockExamId) {
        // Fallback to single mockExamId
        mockExamIds = [question.mockExamId];
      }

      form.reset({
        mockExamIds: mockExamIds,
        subjectName: question.subject.name,
        topicName: question.topic.name,
        type: question.type as "error" | "doubt",
        theory: question.theory,
        failureCount: question.failureCount || 0,
        isLearned: question.isLearned,
      });
    }
  }, [question, form]);

  const createSubjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/subjects", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/topics", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!question) return;

      // Get or create subject and topic in parallel
      const [subjectId, topicId] = await Promise.all([
        (async () => {
          const existingSubject = subjects.find(s => s.name === data.subjectName);
          if (existingSubject) {
            return existingSubject.id;
          }
          const newSubject = await createSubjectMutation.mutateAsync(data.subjectName);
          return newSubject.id;
        })(),
        (async () => {
          const existingTopic = topics.find(t => t.name === data.topicName);
          if (existingTopic) {
            return existingTopic.id;
          }
          const newTopic = await createTopicMutation.mutateAsync(data.topicName);
          return newTopic.id;
        })()
      ]);

      const response = await apiRequest("PUT", `/api/questions/${question.id}`, {
        mockExamIds: data.mockExamIds,
        subjectId,
        topicId,
        type: data.type,
        theory: data.theory,
        failureCount: data.failureCount,
        isLearned: data.isLearned,
      });
      return response.json();
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches for all question queries
      await queryClient.cancelQueries({ queryKey: ["/api/questions"] });

      // Snapshot all question queries
      const previousQueries = queryClient.getQueriesData({ queryKey: ["/api/questions"] });

      // Find the optimistic subject and topic data
      const optimisticSubject = subjects?.find(s => s.name === data.subjectName) || question?.subject;
      const optimisticTopic = topics?.find(t => t.name === data.topicName) || question?.topic;

      // Create the updated question with relations for optimistic display
      const updatedQuestion = {
        ...question,
        mockExamIds: data.mockExamIds,
        type: data.type,
        theory: data.theory,
        failureCount: data.failureCount,
        isLearned: data.isLearned,
        subject: optimisticSubject,
        topic: optimisticTopic,
        // Update both mockExam and mockExams for compatibility
        mockExam: mockExams?.find(exam => data.mockExamIds.includes(exam.id)) || question?.mockExam,
        mockExams: mockExams?.filter(exam => data.mockExamIds.includes(exam.id)) || question?.mockExams
      };

      // Optimistically update ALL question queries instantly
      queryClient.setQueriesData({ queryKey: ["/api/questions"] }, (old: any) => {
        if (!old || !question) return old;
        return old.map((q: any) => 
          q.id === question.id ? updatedQuestion : q
        );
      });

      return { previousQueries };
    },
    onError: (err, newData, context) => {
      // On error, roll back to the previous queries state
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast({
        title: t("error.title"),
        description: t("error.updateQuestion"),
        variant: "destructive",
      });
    },
    onSuccess: async (updatedQuestion) => {
      // Update all question queries with the real response data
      queryClient.setQueriesData({ queryKey: ["/api/questions"] }, (old: any) => {
        if (!old || !question) return old;

        const questionWithRelations = {
          ...updatedQuestion,
          mockExam: mockExams?.find(exam => updatedQuestion.mockExamIds?.includes(exam.id)) || null,
          mockExams: mockExams?.filter(exam => updatedQuestion.mockExamIds?.includes(exam.id)) || [],
          subject: subjects?.find(s => s.id === updatedQuestion.subjectId) || question.subject,
          topic: topics?.find(t => t.id === updatedQuestion.topicId) || question.topic
        };

        return old.map((q: any) => 
          q.id === question.id ? questionWithRelations : q
        );
      });

      // Invalidate mock exams to update question counts
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/mock-exams"],
        refetchType: "active"
      });

      onClose();
      toast({
        title: t("question.updated"),
        description: t("question.updatedDescription"),
      });
    },
  });

  const onSubmit = (data: FormData) => {
    updateQuestionMutation.mutate(data);
  };



  if (!question) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t("question.edit")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mock Exam Selection */}
            <FormField
              control={form.control}
              name="mockExamIds"
              render={({ field }) => {
                const mockExamOptions = mockExams.map((exam) => ({
                  value: exam.id.toString(),
                  label: exam.title,
                }));

                const handleMockExamChange = (values: string[]) => {
                  field.onChange(values.map(Number));
                };

                return (
                  <FormItem>
                    <FormLabel>{t("mockExam.selectMultiple")} *</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={mockExamOptions}
                        value={field.value.map(String)}
                        onChange={handleMockExamChange}
                        placeholder={t("mockExam.selectMultiple")}
                        searchPlaceholder="Buscar simulacros..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Subject and Topic Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subjectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("subject.label")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={subjects.map(s => ({ label: s.name, value: s.name }))}
                        value={field.value}
                        onSelect={field.onChange}
                        placeholder={t("subject.select")}
                        searchPlaceholder={t("subject.search")}
                        emptyText={t("subject.notFound")}
                        allowCustom={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="topicName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("topic.label")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={topics.map(t => ({ label: t.name, value: t.name }))}
                        value={field.value}
                        onSelect={field.onChange}
                        placeholder={t("topic.select")}
                        searchPlaceholder={t("topic.search")}
                        emptyText={t("topic.notFound")}
                        allowCustom={true}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("question.type")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("question.selectType")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="error">{t("question.error")}</SelectItem>
                      <SelectItem value="doubt">{t("question.doubt")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Theory */}
            <FormField
              control={form.control}
              name="theory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("question.theory")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("question.theoryPlaceholder")}
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Failure Count */}
            <FormField
              control={form.control}
              name="failureCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("question.failureCount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Learning Status */}
            <FormField
              control={form.control}
              name="isLearned"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {t("question.markAsLearned")}
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      {t("question.markAsLearnedDescription")}
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateQuestionMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {t("question.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}