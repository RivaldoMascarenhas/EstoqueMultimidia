"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  Save, 
  Sparkles, 
  Upload, 
  Trash2, 
  Crop,
  Eye,
  EyeOff
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AvatarCropperModal } from "@/components/users/avatar-cropper-modal";
import { toast } from "sonner";

export default function PerfilPage() {
  const { data: session, update } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profileData, setProfileData] = useState<any | null>(null);
  const [name, setName] = useState(session?.user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(session?.user?.avatarUrl || null);
  const [imageError, setImageError] = useState(false);
  
  // Cropper modal states
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName((prev) => prev || session.user.name || "");
      setAvatarUrl((prev) => prev || session.user.avatarUrl || null);
      setImageError(false);
    }
  }, [session?.user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/v1/auth/profile");
      const json = await res.json();

      if (json.success && json.data) {
        setProfileData(json.data);
        setName(json.data.name || "");
        setAvatarUrl(json.data.avatarUrl || null);
        setImageError(false);
      } else if (!res.ok) {
        console.warn("Erro ao buscar dados do perfil:", json.error);
      }
    } catch (e) {
      console.warn("Erro de conexão ao carregar perfil:", e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Upload de Imagem / Foto de Perfil
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageForCrop(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = "";
  };

  const handleOpenCropperWithCurrent = () => {
    if (avatarUrl) {
      setRawImageForCrop(avatarUrl);
      setCropperOpen(true);
    }
  };

  const handleApplyCroppedImage = (croppedBase64: string) => {
    setAvatarUrl(croppedBase64);
    setImageError(false);
    toast.success("Enquadramento aplicado! Clique em 'Salvar Alterações' para salvar.");
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    toast.info("Foto removida. Salve as alterações para confirmar.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("O nome não pode ficar vazio.");
      return;
    }

    if (newPassword) {
      if (!currentPassword) {
        toast.error("Informe sua senha atual para alterar a senha.");
        return;
      }
      if (newPassword.length < 6) {
        toast.error("A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (newPassword !== confirmPassword) {
        toast.error("As novas senhas digitadas não conferem.");
        return;
      }
    }

    try {
      setIsSaving(true);
      const payload: any = {
        name: name.trim(),
        avatarUrl,
      };

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch("/api/v1/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        toast.success("Foto e perfil atualizados com sucesso!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        // Atualizar sessão local do NextAuth
        await update({
          ...session,
          user: {
            ...session?.user,
            name: json.data.name,
            avatarUrl: json.data.avatarUrl,
          },
        });

        // Recarregar suavemente a página para garantir sincronização global
        window.location.reload();
      } else {
        toast.error(json.error || "Erro ao salvar perfil.");
      }
    } catch (e) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleVariant = (role: string) => {
    switch (role) {
      case "ADMIN": return "admin";
      case "GESTOR": return "gestor";
      case "OPERADOR": return "operador";
      case "ACADEMIC_SUPPORT": return "academic";
      default: return "consulta";
    }
  };

  const userRole = profileData?.role || session?.user?.role || "OPERADOR";
  const userEmail = profileData?.email || session?.user?.email || "usuario@fapce.edu.br";

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300 max-w-4xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-primary/15 via-indigo-600/10 to-transparent border border-primary/20 backdrop-blur-md shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Conta Pessoal • UniFAP
            </span>
            <Badge variant={getRoleVariant(userRole)} className="text-xs">
              {userRole}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Meu Perfil & Foto de Avatar
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Ajuste sua foto de perfil para aparecer perfeitamente no lugar da inicial, atualize seus dados e acompanhe suas atividades.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        
        {/* Card de Foto de Perfil & Identificação */}
        <Card className="rounded-3xl border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <span>Foto de Perfil & Enquadramento</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Personalize como você aparece na barra lateral, no cabeçalho e nos registros do sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              
              {/* Foto / Avatar Preview */}
              <div className="relative group">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-primary/40 bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg shadow-primary/20">
                  {avatarUrl && !imageError ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <span>{(name || session?.user?.name || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2 rounded-2xl bg-primary text-primary-foreground shadow-md hover:scale-110 transition-transform"
                  title="Alterar ou Ajustar Foto"
                >
                  <Camera className="w-4 h-4" />
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
              </div>

              {/* Botões de Ação da Foto */}
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="text-base font-bold text-foreground">
                  {name || "Seu Nome"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {userEmail}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 justify-center sm:justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl text-xs h-8 gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Nova Foto</span>
                  </Button>

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCropperWithCurrent}
                      className="rounded-xl text-xs h-8 gap-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 border-amber-500/30"
                    >
                      <Crop className="w-3.5 h-3.5" />
                      <span>Ajustar Enquadramento</span>
                    </Button>
                  )}

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      className="rounded-xl text-xs h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remover</span>
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Você pode dar zoom e arrastar a imagem para centralizar perfeitamente seu rosto.
                </p>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Card de Dados Cadastrais */}
        <Card className="rounded-3xl border-border/80 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <span>Informações Básicas</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Atualize o seu nome de exibição institucional
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nome Completo: *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="pl-9 h-10 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  E-mail Institucional:
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={userEmail}
                    disabled
                    className="pl-9 h-10 rounded-xl text-xs bg-muted/40 cursor-not-allowed opacity-75"
                  />
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Card de Segurança & Troca de Senha */}
        <Card className="rounded-3xl border-border/80 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-500" />
              <span>Segurança & Senha Pessoal</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Deixe em branco se não desejar alterar sua senha de acesso agora
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Senha Atual:
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    className="pr-10 h-10 rounded-xl text-xs bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nova Senha:
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 dígitos"
                    className="pr-10 h-10 rounded-xl text-xs bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Confirmar Nova Senha:
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="pr-10 h-10 rounded-xl text-xs bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Estatísticas Individuais do Operador */}
        {profileData?._count && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="rounded-2xl border-border/80 p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Empréstimos Feitos</span>
              <p className="text-xl font-extrabold text-foreground mt-0.5">{profileData._count.loansCreated || 0}</p>
            </Card>

            <Card className="rounded-2xl border-border/80 p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Devoluções Recebidas</span>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{profileData._count.loansReceived || 0}</p>
            </Card>

            <Card className="rounded-2xl border-border/80 p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400">Movimentações</span>
              <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{profileData._count.movements || 0}</p>
            </Card>

            <Card className="rounded-2xl border-border/80 p-4 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">Chamados OS</span>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{profileData._count.maintenances || 0}</p>
            </Card>
          </div>
        )}

        {/* Botão de Salvar Alterações */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSaving}
            className="rounded-xl text-xs h-10 px-6 bg-primary text-primary-foreground font-semibold gap-2 shadow-lg shadow-primary/25"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Salvando Alterações..." : "Salvar Foto e Dados do Perfil"}</span>
          </Button>
        </div>

      </form>

      {/* Modal de Recorte e Enquadramento de Foto */}
      <AvatarCropperModal
        isOpen={cropperOpen}
        imageSrc={rawImageForCrop}
        onClose={() => setCropperOpen(false)}
        onApplyCroppedImage={handleApplyCroppedImage}
      />

    </div>
  );
}
