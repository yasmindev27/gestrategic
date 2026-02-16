import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Mic, MicOff, Video, VideoOff, Circle, Square,
  Shield, Phone, Loader2, LogOut, XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SalaReuniaoProps {
  reuniaoId: string;
  isHost: boolean;
  onEnd: (transcricao: string) => void;
  onLeave: () => void;
}

const SalaReuniao = ({ reuniaoId, isHost, onEnd, onLeave }: SalaReuniaoProps) => {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcricao, setTranscricao] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  // Initialize camera and microphone
  useEffect(() => {
    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setMediaReady(true);
      } catch (err) {
        toast({ title: "Aviso", description: "Não foi possível acessar câmera/microfone. Verifique as permissões.", variant: "destructive" });
      }
    };
    initMedia();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
    };
  }, []);

  // Start speech recognition
  const startRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Aviso", description: "Transcrição em tempo real não suportada neste navegador." });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) setTranscricao((prev) => [...prev, text]);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech") {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      if (isRecording) recognition.start();
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [isRecording]);

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
      setIsCameraOn(!isCameraOn);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    startRecognition();
    toast({ title: "Gravação iniciada", description: "A reunião está sendo gravada e transcrita." });
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleEndMeeting = async () => {
    stopRecording();
    setIsUploading(true);

    try {
      // Upload recording if available
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const fileName = `${reuniaoId}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage.from("reunioes").upload(fileName, blob);

        if (!uploadError) {
          await supabase.from("reunioes").update({
            gravacao_url: fileName,
            status: "encerrada",
          }).eq("id", reuniaoId);
        }
      } else {
        await supabase.from("reunioes").update({ status: "encerrada" }).eq("id", reuniaoId);
      }

      const fullTranscricao = transcricao.join(". ");
      await supabase.from("reunioes").update({ transcricao: fullTranscricao }).eq("id", reuniaoId);

      streamRef.current?.getTracks().forEach((t) => t.stop());
      onEnd(fullTranscricao);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* LGPD Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
        <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Esta reunião está sendo gravada e transcrita para fins de registro institucional conforme a LGPD.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Video Area */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0 relative aspect-video bg-muted">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <VideoOff className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              {isRecording && (
                <Badge className="absolute top-3 left-3 bg-red-500 text-white animate-pulse gap-1">
                  <Circle className="h-2 w-2 fill-current" /> REC
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant={isMuted ? "destructive" : "outline"}
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={!isCameraOn ? "destructive" : "outline"}
              size="icon"
              className="rounded-full h-12 w-12"
              onClick={toggleCamera}
            >
              {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
            {!isRecording ? (
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-12 w-12 border-red-500 text-red-500 hover:bg-red-500/10"
                onClick={startRecording}
                disabled={!mediaReady}
              >
                <Circle className="h-5 w-5 fill-red-500" />
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="icon"
                className="rounded-full h-12 w-12"
                onClick={stopRecording}
              >
                <Square className="h-4 w-4 fill-current" />
              </Button>
            )}
            {/* Sair button - visible to all */}
            <Button
              variant="outline"
              className="rounded-full h-12 px-6"
              onClick={() => {
                streamRef.current?.getTracks().forEach((t) => t.stop());
                recognitionRef.current?.stop();
                onLeave();
              }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sair
            </Button>

            {/* Encerrar button - host only */}
            {isHost && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="rounded-full h-12 px-6"
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
                    Encerrar Reunião
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Encerrar reunião?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Essa ação encerrará a reunião para todos os participantes. A gravação e a transcrição serão salvas automaticamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndMeeting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirmar Encerramento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Transcription Sidebar */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 h-full flex flex-col">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Transcrição em Tempo Real</h3>
            <ScrollArea className="flex-1 min-h-[300px]">
              {transcricao.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {isRecording
                    ? "Aguardando fala..."
                    : "Inicie a gravação para começar a transcrição."}
                </p>
              ) : (
                <div className="space-y-2">
                  {transcricao.map((t, i) => (
                    <p key={i} className="text-xs text-foreground bg-muted/50 p-2 rounded">
                      {t}
                    </p>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalaReuniao;
