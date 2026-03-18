/**
 * Gestrategic — Upload de documentos reutilizável
 * Componente compartilhado para upload de arquivos via Supabase Storage.
 */

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { handleError, handleSuccess } from "@/lib/error-handler";
import { logAuditAction } from "@/lib/supabase-helpers";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  bucket: string;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete: (url: string, fileName: string) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export const FileUpload = ({
  bucket,
  folder = "",
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  maxSizeMB = 10,
  onUploadComplete,
  className,
  label = "Enviar arquivo",
  disabled = false,
}: FileUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      handleError(new Error(`Arquivo excede ${maxSizeMB}MB`));
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = folder
        ? `${folder}/${Date.now()}.${ext}`
        : `${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      setFileName(file.name);
      onUploadComplete(publicUrl, file.name);
      handleSuccess("Arquivo enviado com sucesso");

      await logAuditAction("upload_arquivo", bucket, {
        nome_arquivo: file.name,
        tamanho: file.size,
        caminho: path,
      });
    } catch (error) {
      handleError(error, "Upload de arquivo");
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, maxSizeMB, onUploadComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const clear = () => {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={disabled || uploading}
      />
      {fileName ? (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md text-sm">
          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="truncate flex-1">{fileName}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? "Enviando..." : label}
        </Button>
      )}
    </div>
  );
};

export default FileUpload;
