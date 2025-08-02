import { useState } from "react";
import { Filter, Search, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MockExamWithQuestionCount, Subject, Topic } from "@shared/schema";

interface FiltersState {
  mockExamIds: number[];
  subjectIds: number[];
  topicIds: number[];
  keywords: string;
  learningStatus: boolean[];
  failureCount: {
    min?: number;
    max?: number;
    exact?: number;
  };
}

interface AdvancedFiltersProps {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
  onApplyFilters: () => void;
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  onApplyFilters,
}: AdvancedFiltersProps) {
  const { t } = useLanguage();

  const { data: mockExams = [] } = useQuery<MockExamWithQuestionCount[]>({
    queryKey: ["/api/mock-exams"],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const mockExamOptions = mockExams.map((exam) => ({
    value: exam.id.toString(),
    label: exam.title,
  }));

  const subjectOptions = subjects.map((subject) => ({
    value: subject.id.toString(),
    label: subject.name,
  }));

  const topicOptions = topics.map((topic) => ({
    value: topic.id.toString(),
    label: topic.name,
  }));

  const handleMockExamChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      mockExamIds: values.map(Number),
    });
  };

  const handleSubjectChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      subjectIds: values.map(Number),
    });
  };

  const handleTopicChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      topicIds: values.map(Number),
    });
  };

  const handleLearningStatusChange = (value: boolean, checked: boolean) => {
    const newStatus = checked
      ? [...filters.learningStatus, value]
      : filters.learningStatus.filter((status) => status !== value);

    onFiltersChange({
      ...filters,
      learningStatus: newStatus,
    });
  };

  const handleReset = () => {
    onFiltersChange({
      mockExamIds: [],
      subjectIds: [],
      topicIds: [],
      keywords: "",
      learningStatus: [],
      failureCount: {
        min: undefined,
        max: undefined,
        exact: undefined,
      },
    });
  };

  return (
    <Card className="w-80 h-fit">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold text-gray-900">
          <Filter className="w-5 h-5 text-blue-600 mr-2" />
          {t("filters.advanced")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mock Exam Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("mockExam.title")}
          </Label>
          <MultiSelect
            options={mockExamOptions}
            value={filters.mockExamIds.map(String)}
            onChange={handleMockExamChange}
            placeholder={t("mockExam.selectMultiple")}
            searchPlaceholder={t("search")}
          />
        </div>

        {/* Subject Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("subject.title")}
          </Label>
          <MultiSelect
            options={subjectOptions}
            value={filters.subjectIds.map(String)}
            onChange={handleSubjectChange}
            placeholder={t("subject.selectMultiple")}
            searchPlaceholder={t("subject.search")}
          />
        </div>

        {/* Topic Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("topic.title")}
          </Label>
          <MultiSelect
            options={topicOptions}
            value={filters.topicIds.map(String)}
            onChange={handleTopicChange}
            placeholder={t("topic.selectMultiple")}
            searchPlaceholder={t("topic.search")}
          />
        </div>

        {/* Keyword Search */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("filters.keywords")}
          </Label>
          <Input
            placeholder={t("filters.keywordsPlaceholder")}
            value={filters.keywords}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                keywords: e.target.value,
              })
            }
          />
        </div>

        {/* Learning Status Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("filters.learningStatus")}
          </Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="learned"
                  checked={filters.learningStatus.includes(true)}
                  onCheckedChange={(checked) =>
                    handleLearningStatusChange(true, !!checked)
                  }
                />
                <Label htmlFor="learned" className="text-sm">
                  {t("question.learned")}
                </Label>
              </div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="unlearned"
                  checked={filters.learningStatus.includes(false)}
                  onCheckedChange={(checked) =>
                    handleLearningStatusChange(false, !!checked)
                  }
                />
                <Label htmlFor="unlearned" className="text-sm">
                  {t("question.unlearned")}
                </Label>
              </div>
              <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Failure Count Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("question.failureCount")}
          </Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="0"
                placeholder={t("filters.exactCount")}
                value={filters.failureCount.exact !== undefined ? filters.failureCount.exact.toString() : ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    failureCount: {
                      ...filters.failureCount,
                      exact: e.target.value !== "" ? parseInt(e.target.value) || 0 : undefined,
                      min: undefined,
                      max: undefined,
                    },
                  })
                }
                className="text-sm"
              />
            </div>
            <div className="text-xs text-gray-500 text-center">
              {t("filters.or")}
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                min="0"
                placeholder={t("filters.minCount")}
                value={filters.failureCount.min !== undefined ? filters.failureCount.min.toString() : ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    failureCount: {
                      ...filters.failureCount,
                      min: e.target.value !== "" ? parseInt(e.target.value) || 0 : undefined,
                      exact: undefined,
                    },
                  })
                }
                className="text-sm"
              />
              <span className="text-xs text-gray-500">-</span>
              <Input
                type="number"
                min="0"
                placeholder={t("filters.maxCount")}
                value={filters.failureCount.max !== undefined ? filters.failureCount.max.toString() : ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    failureCount: {
                      ...filters.failureCount,
                      max: e.target.value !== "" ? parseInt(e.target.value) || 0 : undefined,
                      exact: undefined,
                    },
                  })
                }
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleReset}
            variant="outline"
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t("filters.reset")}
          </Button>
          <Button
            onClick={onApplyFilters}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <Search className="w-4 h-4 mr-2" />
            {t("filters.apply")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}