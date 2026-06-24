  -- Perfil ADM para operador da plataforma
  DO $$ BEGIN
    ALTER TYPE "PerfilUsuario" ADD VALUE 'ADM';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END $$;