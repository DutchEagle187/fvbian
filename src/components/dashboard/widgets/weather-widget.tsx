"use client";

import * as React from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Loader2,
  MapPin,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface WeatherData {
  temp: number;
  code: number;
  max: number;
  min: number;
  city: string;
}

// Maps WMO weather codes to a label + icon.
function describe(code: number): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: "Klar", Icon: Sun };
  if (code <= 2) return { label: "Leicht bewölkt", Icon: CloudSun };
  if (code === 3) return { label: "Bewölkt", Icon: Cloud };
  if (code <= 48) return { label: "Nebel", Icon: CloudFog };
  if (code <= 57) return { label: "Nieselregen", Icon: CloudDrizzle };
  if (code <= 67) return { label: "Regen", Icon: CloudRain };
  if (code <= 77) return { label: "Schnee", Icon: CloudSnow };
  if (code <= 82) return { label: "Regenschauer", Icon: CloudRain };
  if (code <= 86) return { label: "Schneeschauer", Icon: CloudSnow };
  return { label: "Gewitter", Icon: CloudLightning };
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: WeatherData };

export function WeatherWidget() {
  const [state, setState] = React.useState<State>({ status: "idle" });

  const load = React.useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({
        status: "error",
        message: "Standort wird von diesem Browser nicht unterstützt.",
      });
      return;
    }
    setState({ status: "loading" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const [wx, geo] = await Promise.all([
            fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
            ).then((r) => r.json()),
            fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=de`
            )
              .then((r) => r.json())
              .catch(() => null),
          ]);

          setState({
            status: "ready",
            data: {
              temp: Math.round(wx.current.temperature_2m),
              code: wx.current.weather_code,
              max: Math.round(wx.daily.temperature_2m_max[0]),
              min: Math.round(wx.daily.temperature_2m_min[0]),
              city:
                geo?.city || geo?.locality || geo?.principalSubdivision || "",
            },
          });
        } catch {
          setState({
            status: "error",
            message: "Wetterdaten konnten nicht geladen werden.",
          });
        }
      },
      () => {
        setState({
          status: "error",
          message: "Kein Standortzugriff. Erlaube ihn, um das Wetter zu sehen.",
        });
      },
      { timeout: 10000 }
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Wetter
        </CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col justify-center">
        {state.status === "loading" || state.status === "idle" ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Lädt…
          </div>
        ) : state.status === "error" ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Erneut versuchen
            </Button>
          </div>
        ) : (
          <WeatherReady data={state.data} />
        )}
      </CardContent>
    </Card>
  );
}

function WeatherReady({ data }: { data: WeatherData }) {
  const { label, Icon } = describe(data.code);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-4xl font-semibold tabular-nums">{data.temp}°</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-xs text-muted-foreground tabular-nums">
          ↑ {data.max}° · ↓ {data.min}°
        </p>
        {data.city ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" /> {data.city}
          </p>
        ) : null}
      </div>
      <Icon className="size-16 shrink-0 text-muted-foreground/70" />
    </div>
  );
}
