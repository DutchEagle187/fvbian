"use client";

import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Category = "length" | "weight" | "temperature";

// Factors are relative to a base unit (meter / gram). Temperature is special.
const UNITS: Record<
  Category,
  { label: string; units: { key: string; label: string; factor?: number }[] }
> = {
  length: {
    label: "Länge",
    units: [
      { key: "mm", label: "Millimeter", factor: 0.001 },
      { key: "cm", label: "Zentimeter", factor: 0.01 },
      { key: "m", label: "Meter", factor: 1 },
      { key: "km", label: "Kilometer", factor: 1000 },
      { key: "in", label: "Zoll", factor: 0.0254 },
      { key: "ft", label: "Fuß", factor: 0.3048 },
      { key: "mi", label: "Meile", factor: 1609.344 },
    ],
  },
  weight: {
    label: "Gewicht",
    units: [
      { key: "mg", label: "Milligramm", factor: 0.001 },
      { key: "g", label: "Gramm", factor: 1 },
      { key: "kg", label: "Kilogramm", factor: 1000 },
      { key: "t", label: "Tonne", factor: 1_000_000 },
      { key: "oz", label: "Unze", factor: 28.3495 },
      { key: "lb", label: "Pfund", factor: 453.592 },
    ],
  },
  temperature: {
    label: "Temperatur",
    units: [
      { key: "c", label: "Celsius" },
      { key: "f", label: "Fahrenheit" },
      { key: "k", label: "Kelvin" },
    ],
  },
};

function toCelsius(value: number, unit: string): number {
  if (unit === "c") return value;
  if (unit === "f") return ((value - 32) * 5) / 9;
  return value - 273.15; // kelvin
}

function fromCelsius(celsius: number, unit: string): number {
  if (unit === "c") return celsius;
  if (unit === "f") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

function convert(
  value: number,
  from: string,
  to: string,
  category: Category
): number {
  if (category === "temperature") {
    return fromCelsius(toCelsius(value, from), to);
  }
  const units = UNITS[category].units;
  const fromFactor = units.find((u) => u.key === from)?.factor ?? 1;
  const toFactor = units.find((u) => u.key === to)?.factor ?? 1;
  return (value * fromFactor) / toFactor;
}

function round(n: number): string {
  if (!Number.isFinite(n)) return "–";
  return parseFloat(n.toFixed(6)).toString();
}

export default function ConverterPage() {
  const [category, setCategory] = React.useState<Category>("length");
  const [value, setValue] = React.useState("1");
  const [from, setFrom] = React.useState(UNITS.length.units[2].key); // m
  const [to, setTo] = React.useState(UNITS.length.units[1].key); // cm

  function selectCategory(next: Category) {
    setCategory(next);
    setFrom(UNITS[next].units[0].key);
    setTo(UNITS[next].units[1].key);
  }

  const numeric = parseFloat(value.replace(",", "."));
  const result = Number.isNaN(numeric)
    ? "–"
    : round(convert(numeric, from, to, category));

  return (
    <div>
      <PageHeader
        title="Einheiten-Konverter"
        description="Längen, Gewichte und Temperaturen umrechnen."
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(UNITS) as Category[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={category === key ? "default" : "outline"}
            onClick={() => selectCategory(key)}
          >
            {UNITS[key].label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{UNITS[category].label} umrechnen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="value">Wert</Label>
            <Input
              id="value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <UnitSelect
              value={from}
              onChange={setFrom}
              units={UNITS[category].units}
            />
          </div>

          <div className="space-y-2">
            <Label>Ergebnis</Label>
            <div
              className={cn(
                "flex h-9 items-center rounded-md border bg-muted/40 px-3 font-mono text-sm"
              )}
            >
              {result}
            </div>
            <UnitSelect
              value={to}
              onChange={setTo}
              units={UNITS[category].units}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UnitSelect({
  value,
  onChange,
  units,
}: {
  value: string;
  onChange: (v: string) => void;
  units: { key: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {units.map((u) => (
        <option key={u.key} value={u.key}>
          {u.label}
        </option>
      ))}
    </select>
  );
}
