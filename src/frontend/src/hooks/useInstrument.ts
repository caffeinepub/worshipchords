import { useState } from "react";

export type Instrument = "guitar" | "bass" | "keys" | "vocals" | "other";

const STORAGE_KEY = "worshipchords_instrument";

export const INSTRUMENT_LABELS: Record<Instrument, string> = {
  guitar: "Guitar",
  bass: "Bass",
  keys: "Keys",
  vocals: "Vocals",
  other: "Other",
};

export const INSTRUMENTS: Instrument[] = [
  "guitar",
  "bass",
  "keys",
  "vocals",
  "other",
];

export function isGuitarInstrument(instrument: Instrument): boolean {
  return instrument === "guitar";
}

function readStored(): Instrument {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && INSTRUMENTS.includes(val as Instrument))
      return val as Instrument;
  } catch {
    // localStorage not available
  }
  return "guitar";
}

export function useInstrument() {
  const [instrument, setInstrumentState] = useState<Instrument>(readStored);

  const setInstrument = (value: Instrument) => {
    setInstrumentState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  return { instrument, setInstrument };
}
