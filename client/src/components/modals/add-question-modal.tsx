import { useState } from "react";
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
import type { MockExam, Subject, Topic } from "@shared/schema";

const formSchema = z.object({
  mockExamId: z.number().min(1, "Mock exam is required"),
  subjectName: z.string().min(1, "Subject is required"),
  topicName: z.string().min(1, "Topic is required"),
  type: z.enum(["error", "doubt"], { required_error: "Type is required" }),
  theory: z.string().min(1, "Theory is required"),
  isLearned: z.boolean().default(false),
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

  const createQuestionMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Ensure subject exists
      let subjectId: number;
      const existingSubject = subjects.find(s => s.name === data.subjectName);
      if (existingSubject) {
        subjectId = existingSubject.id;
      } else {
        const newSubject = await createSubjectMutation.mutateAsync(data.subjectName);
        subjectId = newSubject.id;
      }

      // Ensure topic exists
      let topicId: number;
      const existingTopic = topics.find(t => t.name === data.topicName);
      if (existingTopic) {
        topicId = existingTopic.id;
      } else {
        const newTopic = await createTopicMutation.mutateAsync(data.topicName);
        topicId = newTopic.id;
      }

      const response = await apiRequest("POST", "/api/questions", {
        mockExamId: data.mockExamId,
        subjectId,
        topicId,
        type: data.type,
        theory: data.theory,
        isLearned: data.isLearned,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      toast({
        title: t("question.added"),
        description: t("question.addedDescription"),
      });
      form.reset();
      onClose();
    },
    onError: (error) => {
      toast({
        title: t("error.title"),
        description: t("error.addQuestion"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createQuestionMutation.mutate(data);
  };

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(topicSearch.toLowerCase())
  );

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
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString()}
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

            {/* Subject */}
            <FormField
              control={form.control}
              name="subjectName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subject.title")} *</FormLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      placeholder={t("subject.searchOrAdd")}
                      value={subjectSearch || field.value || ""}
                      onChange={(e) => {
                        setSubjectSearch(e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                    {subjectSearch && filteredSubjects.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                        {filteredSubjects.map((subject) => (
                          <div
                            key={subject.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              field.onChange(subject.name);
                              setSubjectSearch("");
                            }}
                          >
                            {subject.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  <div className="relative">
                    <Input
                      {...field}
                      placeholder={t("topic.searchOrAdd")}
                      value={topicSearch || field.value || ""}
                      onChange={(e) => {
                        setTopicSearch(e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                    {topicSearch && filteredTopics.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                        {filteredTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              field.onChange(topic.name);
                              setTopicSearch("");
                            }}
                          >
                            {topic.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
