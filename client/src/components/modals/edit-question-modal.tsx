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
import type { QuestionWithRelations, MockExam, Subject, Topic } from "@shared/schema";

const formSchema = z.object({
  mockExamId: z.number(),
  subjectName: z.string().min(1, "Subject is required"),
  topicName: z.string().min(1, "Topic is required"),
  type: z.enum(["error", "doubt"]),
  theory: z.string().min(1, "Theory is required"),
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
  const [subjectSearch, setSubjectSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");

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
    },
  });

  // Reset form when question changes
  useEffect(() => {
    if (question) {
      form.reset({
        mockExamId: question.mockExamId,
        subjectName: question.subject.name,
        topicName: question.topic.name,
        type: question.type as "error" | "doubt",
        theory: question.theory,
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
        mockExamId: data.mockExamId,
        subjectId,
        topicId,
        type: data.type,
        theory: data.theory,
        isLearned: data.isLearned,
      });
      return response.json();
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/questions"] });

      // Snapshot the previous value
      const previousQuestions = queryClient.getQueriesData({ queryKey: ["/api/questions"] });

      // Create optimistic subject and topic objects
      const optimisticSubject = subjects.find(s => s.name === data.subjectName) || { 
        id: 0, 
        name: data.subjectName, 
        createdAt: new Date().toISOString() 
      };
      const optimisticTopic = topics.find(t => t.name === data.topicName) || { 
        id: 0, 
        name: data.topicName, 
        createdAt: new Date().toISOString() 
      };

      // Optimistically update to the new value
      queryClient.setQueriesData({ queryKey: ["/api/questions"] }, (old: any) => {
        if (!old || !question) return old;
        return old.map((q: any) => 
          q.id === question.id 
            ? { 
                ...q, 
                mockExamId: data.mockExamId,
                type: data.type,
                theory: data.theory,
                isLearned: data.isLearned,
                subject: optimisticSubject,
                topic: optimisticTopic
              } 
            : q
        );
      });

      return { previousQuestions };
    },
    onSuccess: () => {
      // Close modal immediately for better UX
      onClose();
      toast({
        title: t("question.updated"),
        description: t("question.updatedDescription"),
      });
      // Only invalidate questions query in background
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousQuestions) {
        context.previousQuestions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast({
        title: t("error.title"),
        description: t("error.updateQuestion"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // No need to refetch here since we handle it in onSuccess and onError
    },
  });

  const onSubmit = (data: FormData) => {
    updateQuestionMutation.mutate(data);
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(topicSearch.toLowerCase())
  );

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
              name="mockExamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mockExam.label")}</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t("mockExam.select")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockExams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id.toString()}>
                          {exam.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
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
                        options={filteredSubjects.map(s => ({ label: s.name, value: s.name }))}
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
                        options={filteredTopics.map(t => ({ label: t.name, value: t.name }))}
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