import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Upload, Trash2, Download, Calendar,
  ClipboardList, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profissionalId: string;
  profissionalNome: string;
}

const tiposDocumento: Record<string, string> = {
  registro_classe: "Registro de Classe",
  contrato: "Contrato",
  certificado: "Certificado",
  outro: "Outro",
};

export const ProfissionalPerfilDialog = ({ open, onOpenChange, profissionalId, profissionalNome }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tipoDoc, setTipoDoc] = useState("registro_classe");
  const [uploading, setUploading] = useState(false);

  // Documents query
  const { data: documentos, isLoading: loadingDocs } = useQuery({
    queryKey: ["profissional_documentos", profissionalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profissionais_documentos")
        .select("*")
        .eq("profissional_id", profissionalId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Atestados linked by name (best-effort match)
  const { data: atestados, isLoading: loadingAtestados } = useQuery({
    queryKey: ["profissional_atestados", profissionalNome],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atestados")
        .select("*")
        .ilike("funcionario_nome", `%${profissionalNome}%`)
        .order("data_inicio", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: open && !!profissionalNome,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const ext = file.name.split(".").pop();
      const path = `${profissionalId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("profissionais-docs")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("profissionais_documentos")
        .insert({
          profissional_id: profissionalId,
          tipo_documento: tipoDoc,
          nome_arquivo: file.name,
          arquivo_url: path,
          uploaded_by: user.id,
          uploaded_by_nome: profile?.full_name || user.email || "Usuário",
        });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["profissional_documentos", profissionalId] });
      toast({ title: "Sucesso", description: "Documento anexado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Deseja excluir este documento?")) return;
    await supabase.storage.from("profissionais-docs").remove([path]);
    await supabase.from("profissionais_documentos").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["profissional_documentos", profissionalId] });
    toast({ title: "Documento removido" });
  };

  const handleDownload = async (path: string, nome: string) => {
    const { data } = await supabase.storage
      .from("profissionais-docs")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = nome;
      a.target = "_blank";
      a.click();
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pendente: { label: "Pendente", variant: "outline" },
      validado: { label: "Validado", variant: "default" },
      rejeitado: { label: "Rejeitado", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Perfil: {profissionalNome}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="documentos" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="documentos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="atestados" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Histórico de Atestados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documentos" className="mt-4 space-y-4">
            {/* Upload */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1">
                <Label>Tipo de Documento</Label>
                <Select value={tipoDoc} onValueChange={setTipoDoc}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tiposDocumento).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="cursor-pointer">
                  <Button variant="default" asChild disabled={uploading}>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Enviando..." : "Anexar"}
                      <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </span>
                  </Button>
                </Label>
              </div>
            </div>

            {/* Documents list */}
            {loadingDocs ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !documentos?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum documento anexado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Enviado por</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentos.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge variant="outline">{tiposDocumento[doc.tipo_documento] || doc.tipo_documento}</Badge>
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[200px]">{doc.nome_arquivo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.uploaded_by_nome}</TableCell>
                      <TableCell className="text-sm">{format(new Date(doc.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.arquivo_url, doc.nome_arquivo)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id, doc.arquivo_url)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="atestados" className="mt-4">
            {loadingAtestados ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !atestados?.length ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum atestado registrado para este profissional.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>CID</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atestados.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm">
                        {format(new Date(a.data_inicio), "dd/MM/yy")} — {format(new Date(a.data_fim), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.dias_afastamento > 10 ? "destructive" : "outline"}>
                          {a.dias_afastamento}d
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.tipo}</TableCell>
                      <TableCell className="text-sm">{a.cid || "-"}</TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
