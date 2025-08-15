import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/hooks/useLanguage";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import type { MockExam, Subject, Topic } from "@shared/schema";

const formSchema = z.object({
  mockExamIds: z.array(z.number()).min(1, "At least one mock exam is required"),
  subjectName: z.string().min(1, "Subject is required"),
  topicName: z.string().min(1, "Topic is required"),
  type: z.enum(["error", "doubt"], { required_error: "Type is required" }),
  theory: z.string().min(1, "Theory is required"),
  isLearned: z.boolean().default(false),
  failureCount: z.number().default(0),
});

type FormData = z.infer<typeof formSchema>;

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedMockExamId?: number;
}

export function AddQuestionModal({ isOpen, onClose, preSelectedMockExamId }: AddQuestionModalProps) {
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
      mockExamIds: [],
      subjectName: "",
      topicName: "",
      type: "error",
      theory: "",
      isLearned: false,
      failureCount: 0,
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultMockExamIds = preSelectedMockExamId ? [preSelectedMockExamId] : [];
      form.reset({
        mockExamIds: defaultMockExamIds,
        subjectName: "",
        topicName: "",
        type: "error",
        isLearned: false,
        failureCount: 0,
      });
    }
  }, [isOpen, form, preSelectedMockExamId]);

  const createSubjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/subjects", { name });
      return response.json();
    },
    onSuccess: (newSubject) => {
      // Optimistically update cache instead of invalidating
      queryClient.setQueryData(["/api/subjects"], (old: Subject[] = []) => {
        const exists = old.find(s => s.name === newSubject.name);
        return exists ? old : [...old, newSubject];
      });
    },
  });

  const createTopicMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/topics", { name });
      return response.json();
    },
    onSuccess: (newTopic) => {
      // Optimistically update cache instead of invalidating
      queryClient.setQueryData(["/api/topics"], (old: Topic[] = []) => {
        const exists = old.find(t => t.name === newTopic.name);
        return exists ? old : [...old, newTopic];
      });
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: FormData) => {
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

      const response = await apiRequest("POST", "/api/questions", {
        mockExamIds: data.mockExamIds,
        subjectId,
        topicId,
        type: data.type,
        theory: data.theory,
        isLearned: data.isLearned,
        failureCount: data.failureCount,
      });
      return response.json();
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/questions"] });

      // Snapshot previous state
      const previousQuestions = queryClient.getQueriesData({ queryKey: ["/api/questions"] });

      // Generate temporary ID for optimistic update
      const tempId = Date.now();

      // Create optimistic question immediately
      const optimisticQuestion = {
        id: tempId,
        subjectId: subjects.find(s => s.name === variables.subjectName)?.id || 0,
        topicId: topics.find(t => t.name === variables.topicName)?.id || 0,
        type: variables.type,
        theory: variables.theory,
        isLearned: variables.isLearned,
        failureCount: variables.failureCount,
        createdBy: { uid: "current-user" },
        createdAt: new Date().toISOString(),
        mockExam: mockExams.find(exam => variables.mockExamIds.includes(exam.id)) || null,
        mockExams: mockExams.filter(exam => variables.mockExamIds.includes(exam.id)),
        subject: subjects.find(s => s.name === variables.subjectName) || { name: variables.subjectName },
        topic: topics.find(t => t.name === variables.topicName) || { name: variables.topicName }
      };

      // Optimistically update all question queries
      queryClient.setQueriesData({ queryKey: ["/api/questions"] }, (old: any) => {
        if (!old) return [optimisticQuestion];
        return [optimisticQuestion, ...old];
      });

      return { previousQuestions, tempId };
    },
    onSuccess: (newQuestion, variables, context) => {
      // Replace the optimistic update with real data
      queryClient.setQueriesData({ queryKey: ["/api/questions"] }, (old: any) => {
        if (!old) return [newQuestion];

        const questionWithRelations = {
          ...newQuestion,
          mockExam: mockExams.find(exam => variables.mockExamIds.includes(exam.id)) || null,
          mockExams: mockExams.filter(exam => variables.mockExamIds.includes(exam.id)),
          subject: subjects.find(s => s.name === variables.subjectName) || { name: variables.subjectName },
          topic: topics.find(t => t.name === variables.topicName) || { name: variables.topicName },
          createdBy: { uid: newQuestion.createdBy }
        };

        // Replace temp question with real one
        return old.map((q: any) => q.id === context?.tempId ? questionWithRelations : q);
      });

      // Invalidate cache to sync in background
      queryClient.invalidateQueries({
        queryKey: ["/api/questions"],
        refetchType: "none"
      });

      queryClient.invalidateQueries({
        queryKey: ["/api/mock-exams"],
        refetchType: "none"
      });

      form.reset({
        mockExamIds: preSelectedMockExamId ? [preSelectedMockExamId] : [],
        subjectName: "",
        topicName: "",
        type: "error",
        isLearned: false,
        failureCount: 0,
      });
      onClose();
      toast({
        title: t("question.created"),
        description: t("question.createdDescription"),
      });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousQuestions) {
        context.previousQuestions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      console.error("Create question error:", error);
      toast({
        title: t("error.title"),
        description: t("error.createQuestion"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createQuestionMutation.mutate(data);
  };

  const handleClose = () => {
    const defaultMockExamIds = preSelectedMockExamId ? [preSelectedMockExamId] : [];
    form.reset({
      mockExamIds: defaultMockExamIds,
      subjectName: "",
      topicName: "",
      type: "error",
      theory: "",
      isLearned: false,
      failureCount: 0,
    });
    onClose();
  };



  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t("question.addNew")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mock Exams */}
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

            {/* Subject */}
            <FormField
              control={form.control}
              name="subjectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subject.title")} *</FormLabel>
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

            {/* Topic */}
            <FormField
              control={form.control}
              name="topicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("topic.title")} *</FormLabel>
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

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("question.type")} *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="error" id="error" />
                        <Label htmlFor="error">{t("question.error")}</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="doubt" id="doubt" />
                        <Label htmlFor="doubt">{t("question.doubt")}</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
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
                  <FormLabel>{t("question.theory")} *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder={t("question.theoryPlaceholder")}
                      className="resize-none"
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
                      placeholder="0"
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>{t("question.markAsLearned")}</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createQuestionMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("question.add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}