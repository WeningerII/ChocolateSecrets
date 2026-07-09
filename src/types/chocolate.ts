export interface TemperingCurve {
  meltCelsius: [number, number]; // [min, max]
  coolCelsius: [number, number];
  workCelsius: [number, number];
  method?: 'seeding' | 'tabling' | 'mycryo' | 'machine' | 'other';
  notes?: string;
}

export interface ChocolateSpec {
  type?: 'dark' | 'milk' | 'white' | 'ruby' | 'gianduja' | 'compound';
  cocoaPercentage?: number;
  brand?: string;
  productName?: string;
  tempering?: TemperingCurve;
  origin?: string;
  flavorNotes?: string;
}

export interface EnrobingSpec {
  method?: 'shell_mold' | 'hand_dipped' | 'rolled' | 'enrobed_machine' | 'enrobed_fork' | 'coated_dusted' | 'glazed' | 'velvet_spray' | 'none';
  coating?: string; // "tempered dark 66%", "cocoa powder", "chopped pistachios"
  decoration?: {
    technique?: 'painted' | 'airbrushed' | 'splattered' | 'transfer_sheet' | 'embossed' | 'dusted' | 'none';
    colors?: string[];
    tools?: string[]; // ["airbrush", "#4 round tip", "dipping fork"]
  };
}

export interface DesignLayer {
  order: number;
  technique: string;
  colors: string[];
  tool: string;
  temperatures?: { cocoaButter?: number };
  notes: string;
}
