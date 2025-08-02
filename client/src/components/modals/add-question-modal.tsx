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
import type { MockExam, Subject, Topic } from "@shared/schema";

const formSchema = z.object({
  mockExamId: z.number().min(1, "Mock exam is required"),
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
}

export function AddQuestionModal({ isOpen, onClose }: AddQuestionModalProps) {
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
      mockExamId: 0,
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
      form.reset({
        mockExamId: 0,
        subjectName: "",
        topicName: "",
        type: "error",
        theory: "",
        isLearned: false,
        failureCount: 0,
      });
    }
  }, [isOpen, form]);

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
      const [subjectResult, topicResult] = await Promise.all([
        (async () => {
          const existing = subjects.find(s => s.name === data.subjectName);
          if (existing) return existing;
          return await createSubjectMutation.mutateAsync(data.subjectName);
        })(),
        (async () => {
          const existing = topics.find(t => t.name === data.topicName);
          if (existing) return existing;
          return await createTopicMutation.mutateAsync(data.topicName);
        })()
      ]);

      const response = await apiRequest("POST", "/api/questions", {
        mockExamId: data.mockExamId,
        subjectId: subjectResult.id,
        topicId: topicResult.id,
        type: data.type,
        theory: data.theory,
        isLearned: data.isLearned,
      });
      return response.json();
    },
    onSuccess: async (serverQuestion, data) => {
      // Invalidate all questions queries to ensure fresh data
      await queryClient.invalidateQueries({ 
        queryKey: ["/api/questions"],
        exact: false 
      });

      // Update mock exam question counts for all associated mock exams
      queryClient.setQueryData(["/api/mock-exams"], (old: any[] = []) => {
        return old.map(exam => 
          data.mockExamIds.includes(exam.id)
            ? { ...exam, questionCount: (exam.questionCount || 0) + 1 }
            : exam
        );
      });

      toast({
        title: t("success.title"),
        description: t("success.questionAdded"),
      });

      onClose();
      form.reset();
    },
    onError: (error) => {
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



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            {t("question.addNew")}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Mock Exam */}
            <FormField
              control={form.control}
              name="mockExamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("mockExam.title")} *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={mockExams.map(exam => ({ label: exam.title, value: exam.id.toString() }))}
                      value={field.value?.toString() || ""}
                      onSelect={(value) => field.onChange(Number(value))}
                      placeholder={t("mockExam.select")}
                      searchPlaceholder="Buscar simulacro..."
                      emptyText="No se encontró el simulacro"
                      allowCustom={false}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
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
              <Button type="button" variant="outline" onClick={onClose}>
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