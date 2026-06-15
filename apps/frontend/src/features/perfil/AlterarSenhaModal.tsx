import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { changePasswordSchema, type ChangePasswordInput } from "@athlon/shared-types";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AlterarSenhaModalProps {
  open: boolean;
  onClose: () => void;
}

export function AlterarSenhaModal({ open, onClose }: AlterarSenhaModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { senhaAtual: "", senhaNova: "", confirmarSenha: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordInput) =>
      api("/auth/me/senha", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => handleClose(),
  });

  const handleClose = () => {
    reset();
    mutation.reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Alterar senha">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium">Senha atual</label>
          <Input type="password" autoComplete="current-password" {...register("senhaAtual")} />
          {errors.senhaAtual && (
            <p className="mt-1 text-sm text-destructive">{errors.senhaAtual.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Nova senha</label>
          <Input type="password" autoComplete="new-password" {...register("senhaNova")} />
          {errors.senhaNova && (
            <p className="mt-1 text-sm text-destructive">{errors.senhaNova.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Repetir nova senha</label>
          <Input type="password" autoComplete="new-password" {...register("confirmarSenha")} />
          {errors.confirmarSenha && (
            <p className="mt-1 text-sm text-destructive">{errors.confirmarSenha.message}</p>
          )}
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Erro ao alterar senha"}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
