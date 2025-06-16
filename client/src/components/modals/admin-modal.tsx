
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Trash2, Plus, Save, X, Search } from "lucide-react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Subject, Topic, MockExam } from "@shared/schema";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
});

type FormData = z.infer<typeof formSchema>;

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [editingMockExam, setEditingMockExam] = useState<MockExam | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: 'subject' | 'topic' | 'mockExam'; item: Subject | Topic | MockExam } | null>(null);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [topicSearch, setTopicSearch] = useState("");
  const [mockExamSearch, setMockExamSearch] = useState("");

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
  });

  const { data: mockExams = [] } = useQuery<MockExam[]>({
    queryKey: ["/api/mock-exams"],
  });

  // Filter data based on search
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const filteredMockExams = mockExams.filter(exam =>
    exam.title.toLowerCase().includes(mockExamSearch.toLowerCase())
  );

  const subjectForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const topicForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const mockExamForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  // Subject mutations
  const createSubjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/subjects", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      subjectForm.reset();
      toast({
        title: "Asignatura creada",
        description: "La asignatura se ha creado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al crear la asignatura",
        variant: "destructive",
      });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/subjects/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setEditingSubject(null);
      toast({
        title: "Asignatura actualizada",
        description: "La asignatura se ha actualizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al actualizar la asignatura",
        variant: "destructive",
      });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/subjects/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subjects"] });
      setDeleteItem(null);
      toast({
        title: "Asignatura eliminada",
        description: "La asignatura se ha eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se puede eliminar la asignatura porque tiene preguntas asociadas",
        variant: "destructive",
      });
      setDeleteItem(null);
    },
  });

  // Topic mutations
  const createTopicMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/topics", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      topicForm.reset();
      toast({
        title: "Tema creado",
        description: "El tema se ha creado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al crear el tema",
        variant: "destructive",
      });
    },
  });

  const updateTopicMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/topics/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setEditingTopic(null);
      toast({
        title: "Tema actualizado",
        description: "El tema se ha actualizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al actualizar el tema",
        variant: "destructive",
      });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/topics/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/topics"] });
      setDeleteItem(null);
      toast({
        title: "Tema eliminado",
        description: "El tema se ha eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se puede eliminar el tema porque tiene preguntas asociadas",
        variant: "destructive",
      });
      setDeleteItem(null);
    },
  });

  // Mock Exam mutations
  const createMockExamMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/mock-exams", { title: data.name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      mockExamForm.reset();
      toast({
        title: "Examen simulacro creado",
        description: "El examen simulacro se ha creado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al crear el examen simulacro",
        variant: "destructive",
      });
    },
  });

  const updateMockExamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormData }) => {
      const response = await apiRequest("PUT", `/api/mock-exams/${id}`, { title: data.name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      setEditingMockExam(null);
      toast({
        title: "Examen simulacro actualizado",
        description: "El examen simulacro se ha actualizado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Error al actualizar el examen simulacro",
        variant: "destructive",
      });
    },
  });

  const deleteMockExamMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/mock-exams/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mock-exams"] });
      setDeleteItem(null);
      toast({
        title: "Examen simulacro eliminado",
        description: "El examen simulacro se ha eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se puede eliminar el examen simulacro porque tiene preguntas asociadas",
        variant: "destructive",
      });
      setDeleteItem(null);
    },
  });

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
  };

  const handleEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
  };

  const handleEditMockExam = (mockExam: MockExam) => {
    setEditingMockExam(mockExam);
  };

  const handleSaveSubject = (data: FormData) => {
    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, data });
    }
  };

  const handleSaveTopic = (data: FormData) => {
    if (editingTopic) {
      updateTopicMutation.mutate({ id: editingTopic.id, data });
    }
  };

  const handleSaveMockExam = (data: FormData) => {
    if (editingMockExam) {
      updateMockExamMutation.mutate({ id: editingMockExam.id, data });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteItem) {
      if (deleteItem.type === 'subject') {
        deleteSubjectMutation.mutate(deleteItem.item.id);
      } else if (deleteItem.type === 'topic') {
        deleteTopicMutation.mutate(deleteItem.item.id);
      } else if (deleteItem.type === 'mockExam') {
        deleteMockExamMutation.mutate(deleteItem.item.id);
      }
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Administrar Asignaturas, Temas y Exámenes Simulacro
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="subjects" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subjects">Asignaturas</TabsTrigger>
              <TabsTrigger value="topics">Temas</TabsTrigger>
              <TabsTrigger value="mockExams">Exámenes Simulacro</TabsTrigger>
            </TabsList>

            {/* Subjects Tab */}
            <TabsContent value="subjects" className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar asignaturas..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Agregar Nueva Asignatura</h3>
                <Form {...subjectForm}>
                  <form onSubmit={subjectForm.handleSubmit((data) => createSubjectMutation.mutate(data))} className="flex gap-2">
                    <FormField
                      control={subjectForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Nombre de la asignatura" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createSubjectMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </form>
                </Form>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha de Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>
                          {editingSubject?.id === subject.id ? (
                            <Form {...subjectForm}>
                              <form onSubmit={subjectForm.handleSubmit(handleSaveSubject)} className="flex gap-2">
                                <FormField
                                  control={subjectForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input {...field} defaultValue={subject.name} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" size="sm" disabled={updateSubjectMutation.isPending}>
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingSubject(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </form>
                            </Form>
                          ) : (
                            subject.name
                          )}
                        </TableCell>
                        <TableCell>
                          {subject.createdAt ? new Date(subject.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingSubject?.id !== subject.id && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSubject(subject)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteItem({ type: 'subject', item: subject })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Topics Tab */}
            <TabsContent value="topics" className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar temas..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Agregar Nuevo Tema</h3>
                <Form {...topicForm}>
                  <form onSubmit={topicForm.handleSubmit((data) => createTopicMutation.mutate(data))} className="flex gap-2">
                    <FormField
                      control={topicForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Nombre del tema" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createTopicMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </form>
                </Form>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha de Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTopics.map((topic) => (
                      <TableRow key={topic.id}>
                        <TableCell>
                          {editingTopic?.id === topic.id ? (
                            <Form {...topicForm}>
                              <form onSubmit={topicForm.handleSubmit(handleSaveTopic)} className="flex gap-2">
                                <FormField
                                  control={topicForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input {...field} defaultValue={topic.name} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" size="sm" disabled={updateTopicMutation.isPending}>
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingTopic(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </form>
                            </Form>
                          ) : (
                            topic.name
                          )}
                        </TableCell>
                        <TableCell>
                          {topic.createdAt ? new Date(topic.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingTopic?.id !== topic.id && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTopic(topic)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteItem({ type: 'topic', item: topic })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Mock Exams Tab */}
            <TabsContent value="mockExams" className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar exámenes simulacro..."
                  value={mockExamSearch}
                  onChange={(e) => setMockExamSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-4">Agregar Nuevo Examen Simulacro</h3>
                <Form {...mockExamForm}>
                  <form onSubmit={mockExamForm.handleSubmit((data) => createMockExamMutation.mutate(data))} className="flex gap-2">
                    <FormField
                      control={mockExamForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input {...field} placeholder="Nombre del examen simulacro" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={createMockExamMutation.isPending}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar
                    </Button>
                  </form>
                </Form>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha de Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMockExams.map((mockExam) => (
                      <TableRow key={mockExam.id}>
                        <TableCell>
                          {editingMockExam?.id === mockExam.id ? (
                            <Form {...mockExamForm}>
                              <form onSubmit={mockExamForm.handleSubmit(handleSaveMockExam)} className="flex gap-2">
                                <FormField
                                  control={mockExamForm.control}
                                  name="name"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormControl>
                                        <Input {...field} defaultValue={mockExam.title} />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <Button type="submit" size="sm" disabled={updateMockExamMutation.isPending}>
                                  <Save className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingMockExam(null)}>
                                  <X className="w-4 h-4" />
                                </Button>
                              </form>
                            </Form>
                          ) : (
                            mockExam.title
                          )}
                        </TableCell>
                        <TableCell>
                          {mockExam.createdAt ? new Date(mockExam.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingMockExam?.id !== mockExam.id && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditMockExam(mockExam)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteItem({ type: 'mockExam', item: mockExam })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente{" "}
              {deleteItem?.type === 'subject' ? 'la asignatura' : 
               deleteItem?.type === 'topic' ? 'el tema' : 'el examen simulacro'}{" "}
              "{deleteItem?.type === 'mockExam' ? (deleteItem.item as MockExam).title : deleteItem?.item.name}".
              {deleteItem && (
                <span className="block mt-2 text-sm text-gray-600">
                  Nota: No se puede eliminar si tiene preguntas asociadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
