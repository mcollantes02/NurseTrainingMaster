
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/hooks/useLanguage";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/navigation/header";
import { UserProfileModal } from "@/components/modals/user-profile-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BookOpen,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  ArrowLeft,
} from "lucide-react";

interface DetailedStats {
  totalQuestions: number;
  learnedQuestions: number;
  doubtQuestions: number;
  errorQuestions: number;
  progressPercentage: number;
  completedExams: number;
  totalSubjects: number;
  totalTopics: number;
  averageFailureRate: number;
  questionsByType: Array<{ type: string; count: number }>;
  questionsBySubject: Array<{ subject: string; total: number; learned: number; doubt: number; error: number }>;
  questionsByTopic: Array<{ topic: string; total: number; learned: number; doubt: number; error: number }>;
  learningProgress: Array<{ date: string; learned: number; total: number }>;
  failureDistribution: Array<{ range: string; count: number }>;
  weeklyActivity: Array<{ day: string; questions: number }>;
  theoryDistribution: Array<{ theory: string; count: number }>;
}

const COLORS = {
  learned: "#16A34A",
  doubt: "#FF9800",
  error: "#F44336",
  primary: "#1976D2",
  secondary: "#64748B",
};

const PIE_COLORS = [COLORS.learned, COLORS.doubt, COLORS.error, "#8B5CF6", "#06B6D4"];

export default function Statistics() {
  const { t } = useLanguage();
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);

  const { data: stats, isLoading } = useQuery<DetailedStats>({
    queryKey: ["/api/user/detailed-stats"],
  });

  const chartConfig = {
    learned: {
      label: t("question.learned"),
      color: COLORS.learned,
    },
    doubt: {
      label: t("question.doubt"),
      color: COLORS.doubt,
    },
    error: {
      label: t("question.error"),
      color: COLORS.error,
    },
  };

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: t("question.learned"), value: stats.learnedQuestions, color: COLORS.learned },
      { name: t("question.doubt"), value: stats.doubtQuestions, color: COLORS.doubt },
      { name: t("question.error"), value: stats.errorQuestions, color: COLORS.error },
    ];
  }, [stats, t]);

  const handleGoBack = () => {
    window.history.back();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onUserProfileClick={() => setIsUserProfileModalOpen(true)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header onUserProfileClick={() => setIsUserProfileModalOpen(true)} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-gray-500">{t("statistics.noData")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onUserProfileClick={() => setIsUserProfileModalOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("navigation.back")}
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("statistics.title")}</h1>
              <p className="text-sm text-gray-600">{t("statistics.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("statistics.totalQuestions")}</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedExams} {t("statistics.examsCompleted")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("statistics.progress")}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.progressPercentage}%</div>
              <Progress value={stats.progressPercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("statistics.learnedQuestions")}</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.learnedQuestions}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.learnedQuestions / stats.totalQuestions) * 100)}% {t("statistics.ofTotal")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("statistics.failureRate")}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.averageFailureRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.errorQuestions} {t("statistics.errorQuestions")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">{t("statistics.overview")}</TabsTrigger>
            <TabsTrigger value="subjects">{t("statistics.subjects")}</TabsTrigger>
            <TabsTrigger value="topics">{t("statistics.topics")}</TabsTrigger>
            <TabsTrigger value="trends">{t("statistics.trends")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Questions Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("statistics.questionsDistribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Question Types Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("statistics.questionTypes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={stats.questionsByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill={COLORS.primary} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>

            {/* Theory Sources */}
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics.theorySources")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.theoryDistribution.map((theory, index) => (
                    <div key={theory.theory} className="text-center">
                      <div className="text-2xl font-bold" style={{ color: PIE_COLORS[index % PIE_COLORS.length] }}>
                        {theory.count}
                      </div>
                      <div className="text-sm text-gray-600">{theory.theory}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics.subjectBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[400px]">
                  <BarChart data={stats.questionsBySubject} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="learned" stackId="a" fill={COLORS.learned} name={t("question.learned")} />
                    <Bar dataKey="doubt" stackId="a" fill={COLORS.doubt} name={t("question.doubt")} />
                    <Bar dataKey="error" stackId="a" fill={COLORS.error} name={t("question.error")} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Subject Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.questionsBySubject.map((subject) => (
                <Card key={subject.subject}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{subject.subject}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t("statistics.total")}</span>
                        <span className="font-medium">{subject.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-green-600">{t("question.learned")}</span>
                        <span className="font-medium text-green-600">{subject.learned}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-orange-600">{t("question.doubt")}</span>
                        <span className="font-medium text-orange-600">{subject.doubt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-red-600">{t("question.error")}</span>
                        <span className="font-medium text-red-600">{subject.error}</span>
                      </div>
                      <Progress 
                        value={(subject.learned / subject.total) * 100} 
                        className="mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics.topicBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {stats.questionsByTopic.map((topic) => (
                    <div key={topic.topic} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{topic.topic}</h3>
                        <Badge variant="outline">{topic.total} {t("questions.label")}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-green-600">{topic.learned}</div>
                          <div className="text-gray-600">{t("question.learned")}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-orange-600">{topic.doubt}</div>
                          <div className="text-gray-600">{t("question.doubt")}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-red-600">{topic.error}</div>
                          <div className="text-gray-600">{t("question.error")}</div>
                        </div>
                      </div>
                      <Progress 
                        value={(topic.learned / topic.total) * 100} 
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Learning Progress Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>{t("statistics.learningProgress")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={stats.learningProgress}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="learned" 
                      stroke={COLORS.learned} 
                      strokeWidth={2}
                      name={t("question.learned")}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke={COLORS.secondary} 
                      strokeWidth={2}
                      name={t("statistics.total")}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("statistics.weeklyActivity")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <BarChart data={stats.weeklyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="questions" fill={COLORS.primary} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Failure Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("statistics.failureDistribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[250px]">
                    <BarChart data={stats.failureDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill={COLORS.error} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
      />
    </div>
  );
}
