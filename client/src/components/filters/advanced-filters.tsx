import { useState } from "react";
import { Filter, Search } from "lucide-react";
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
  const [subjectSearch, setSubjectSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");

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

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const handleMockExamChange = (values: string[]) => {
    onFiltersChange({
      ...filters,
      mockExamIds: values.map(Number),
    });
  };

  const handleSubjectChange = (subjectId: number, checked: boolean) => {
    const newSubjectIds = checked
      ? [...filters.subjectIds, subjectId]
      : filters.subjectIds.filter((id) => id !== subjectId);
    
    onFiltersChange({
      ...filters,
      subjectIds: newSubjectIds,
    });
  };

  const handleTopicChange = (topicId: number, checked: boolean) => {
    const newTopicIds = checked
      ? [...filters.topicIds, topicId]
      : filters.topicIds.filter((id) => id !== topicId);
    
    onFiltersChange({
      ...filters,
      topicIds: newTopicIds,
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
          <div className="relative mb-2">
            <Input
              placeholder={t("subject.search")}
              value={subjectSearch}
              onChange={(e) => setSubjectSearch(e.target.value)}
              className="pr-8"
            />
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {filteredSubjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`subject-${subject.id}`}
                  checked={filters.subjectIds.includes(subject.id)}
                  onCheckedChange={(checked) =>
                    handleSubjectChange(subject.id, !!checked)
                  }
                />
                <Label htmlFor={`subject-${subject.id}`} className="text-sm">
                  {subject.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Filter */}
        <div>
          <Label className="text-sm font-medium text-gray-700 mb-2 block">
            {t("topic.title")}
          </Label>
          <div className="relative mb-2">
            <Input
              placeholder={t("topic.search")}
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              className="pr-8"
            />
            <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {filteredTopics.map((topic) => (
              <div key={topic.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`topic-${topic.id}`}
                  checked={filters.topicIds.includes(topic.id)}
                  onCheckedChange={(checked) =>
                    handleTopicChange(topic.id, !!checked)
                  }
                />
                <Label htmlFor={`topic-${topic.id}`} className="text-sm">
                  {topic.name}
                </Label>
              </div>
            ))}
          </div>
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

        <Button
          onClick={onApplyFilters}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Search className="w-4 h-4 mr-2" />
          {t("filters.apply")}
        </Button>
      </CardContent>
    </Card>
  );
}
