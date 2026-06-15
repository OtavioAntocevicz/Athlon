import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function ProfessorAvisosButton() {
  const { user } = useAuth();

  if (user?.perfil !== "PROFESSOR" && !user?.professorId) return null;

  return (
    <Link
      to="/avisos"
      className="relative rounded-full p-2 hover:bg-muted"
      aria-label="Enviar avisos aos alunos"
    >
      <Megaphone className="h-5 w-5 text-primary" />
    </Link>
  );
}
