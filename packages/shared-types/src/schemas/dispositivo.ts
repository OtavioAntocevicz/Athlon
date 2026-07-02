import { z } from "zod";

export const PlatformDispositivo = {
  WEB: "WEB",
  ANDROID: "ANDROID",
  IOS: "IOS",
} as const;

export const PushProvider = {
  WEB: "WEB",
  EXPO: "EXPO",
} as const;

export const NotificationPermission = {
  GRANTED: "granted",
  DENIED: "denied",
  DEFAULT: "default",
} as const;

export const registrarDispositivoSchema = z.object({
  platform: z.enum([PlatformDispositivo.WEB, PlatformDispositivo.ANDROID, PlatformDispositivo.IOS]),
  pushProvider: z.enum([PushProvider.WEB, PushProvider.EXPO]),
  pushToken: z.string().min(1),
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
  deviceModel: z.string().optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  notificationPermission: z
    .enum([
      NotificationPermission.GRANTED,
      NotificationPermission.DENIED,
      NotificationPermission.DEFAULT,
    ])
    .optional(),
});

export type RegistrarDispositivoInput = z.infer<typeof registrarDispositivoSchema>;
