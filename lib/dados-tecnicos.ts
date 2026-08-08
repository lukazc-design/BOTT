// ─── TIPOS ──────────────────────────────────────────────────────────────────

export type TipoEquipamento = 'hi-wall' | 'piso-teto' | 'cassete' | 'bi-split' | 'tri-split' | 'quadri-split'

export interface EspecTecnica {
  capacidadeBtu: number
  liquido: string      // ex: "1/4\""
  succao: string       // ex: "3/8\""
  caboInterligacao: string  // ex: "1,5mm²"
  disjuntor: string    // ex: "10A"
  caboAlimentacao: string   // ex: "1,5mm²"
}

export interface TabelaMarca {
  marca: string
  tipo: TipoEquipamento
  specs: EspecTecnica[]
}

// ─── TABELAS POR MARCA ───────────────────────────────────────────────────────

export const TABELAS: TabelaMarca[] = [
  // ── SAMSUNG ──────────────────────────────────────────────────────────────
  {
    marca: 'Samsung', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── LG ───────────────────────────────────────────────────────────────────
  {
    marca: 'LG', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'LG', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'LG', tipo: 'bi-split', specs: [
      { capacidadeBtu: 24000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── GREE ─────────────────────────────────────────────────────────────────
  {
    marca: 'Gree', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 6000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Gree', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 42000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  {
    marca: 'Gree', tipo: 'cassete', specs: [
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 41000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  // ── SPRINGER ─────────────────────────────────────────────────────────────
  {
    marca: 'Springer', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 22000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── MIDEA ────────────────────────────────────────────────────────────────
  {
    marca: 'Midea', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 22000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 28000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Midea', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  // ── ELGIN ────────────────────────────────────────────────────────────────
  {
    marca: 'Elgin', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7500,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Elgin', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
      { capacidadeBtu: 80000, liquido: '1/2"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  {
    marca: 'Elgin', tipo: 'cassete', specs: [
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  // ── ELECTROLUX ───────────────────────────────────────────────────────────
  {
    marca: 'Electrolux', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Electrolux', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  {
    marca: 'Electrolux', tipo: 'cassete', specs: [
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
    ],
  },
  // ── HITACHI ──────────────────────────────────────────────────────────────
  {
    marca: 'Hitachi', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Hitachi', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 42000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  // ── FUJITSU ──────────────────────────────────────────────────────────────
  {
    marca: 'Fujitsu', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Fujitsu', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 39000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
    ],
  },
  // ── CARRIER ──────────────────────────────────────────────────────────────
  {
    marca: 'Carrier', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 22000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Carrier', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 58000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
      { capacidadeBtu: 80000, liquido: '1/2"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  {
    marca: 'Carrier', tipo: 'cassete', specs: [
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
    ],
  },
  // ── BRASTEMP ─────────────────────────────────────────────────────────────
  {
    marca: 'Brastemp', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 22000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── CONSUL ───────────────────────────────────────────────────────────────
  {
    marca: 'Consul', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 22000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── YORK ─────────────────────────────────────────────────────────────────
  {
    marca: 'York', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── KOMECO ───────────────────────────────────────────────────────────────
  {
    marca: 'Komeco', tipo: 'hi-wall', specs: [
      { capacidadeBtu: 7000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 9000,  liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 12000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 30000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '2,5mm²' },
    ],
  },
  {
    marca: 'Komeco', tipo: 'piso-teto', specs: [
      { capacidadeBtu: 24000, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
      { capacidadeBtu: 36000, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 48000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  },
      { capacidadeBtu: 60000, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  },
    ],
  },
  // ── BI-SPLIT GENÉRICO ────────────────────────────────────────────────────
  {
    marca: 'Genérico', tipo: 'bi-split', specs: [
      { capacidadeBtu: 18000, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' },
    ],
  },
  // ── TRI-SPLIT GENÉRICO ───────────────────────────────────────────────────
  {
    marca: 'Genérico', tipo: 'tri-split', specs: [
      { capacidadeBtu: 30000, liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
  // ── QUADRI-SPLIT GENÉRICO ────────────────────────────────────────────────
  {
    marca: 'Genérico', tipo: 'quadri-split', specs: [
      { capacidadeBtu: 28000, liquido: '1/4"', succao: '3/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' },
    ],
  },
]

// ─── FUNÇÃO DE CONSULTA ──────────────────────────────────────────────────────

// Spec genérica baseada só no BTU — garante que QUALQUER equipamento gere orçamento
// mesmo que a marca não esteja cadastrada (ex: Daikin, Trane, ou marca vazia)
export function especGenericaPorBtu(btu: number): EspecTecnica {
  if (btu <= 12000) return { capacidadeBtu: btu, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '10A', caboAlimentacao: '1,5mm²' }
  if (btu <= 18000) return { capacidadeBtu: btu, liquido: '1/4"', succao: '1/2"', caboInterligacao: '1,5mm²', disjuntor: '16A', caboAlimentacao: '1,5mm²' }
  if (btu <= 24000) return { capacidadeBtu: btu, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' }
  if (btu <= 30000) return { capacidadeBtu: btu, liquido: '3/8"', succao: '5/8"', caboInterligacao: '1,5mm²', disjuntor: '20A', caboAlimentacao: '2,5mm²' }
  if (btu <= 42000) return { capacidadeBtu: btu, liquido: '3/8"', succao: '3/4"', caboInterligacao: '2,5mm²', disjuntor: '25A', caboAlimentacao: '4mm²'  }
  if (btu <= 60000) return { capacidadeBtu: btu, liquido: '3/8"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²'  }
  return { capacidadeBtu: btu, liquido: '1/2"', succao: '7/8"', caboInterligacao: '2,5mm²', disjuntor: '32A', caboAlimentacao: '6mm²' }
}

export function buscarEspec(
  marca: string,
  tipo: TipoEquipamento,
  btu: number
): EspecTecnica | null {
  const tabela = TABELAS.find(
    t => t.marca.toLowerCase() === marca.toLowerCase() && t.tipo === tipo
  )

  // 1) Marca+tipo encontrados: tenta exato, depois superior, senão genérica por BTU
  if (tabela) {
    const exato = tabela.specs.find(s => s.capacidadeBtu === btu)
    if (exato) return exato
    const superior = tabela.specs
      .filter(s => s.capacidadeBtu >= btu)
      .sort((a, b) => a.capacidadeBtu - b.capacidadeBtu)[0]
    if (superior) return superior
  }

  // 2) Marca não cadastrada OU BTU acima do máximo: usa spec genérica por BTU.
  //    Isso garante que NENHUM equipamento seja descartado silenciosamente.
  return especGenericaPorBtu(btu)
}

export const MARCAS_DISPONIVEIS = [
  'Samsung', 'LG', 'Gree', 'Springer', 'Midea', 'Elgin',
  'Electrolux', 'Hitachi', 'Fujitsu', 'Carrier',
  'Brastemp', 'Consul', 'York', 'Komeco',
]

export const TIPOS_DISPONIVEIS: { value: TipoEquipamento; label: string }[] = [
  { value: 'hi-wall',     label: 'Hi-Wall' },
  { value: 'piso-teto',   label: 'Piso Teto' },
  { value: 'cassete',     label: 'Cassete' },
  { value: 'bi-split',    label: 'Bi-Split' },
  { value: 'tri-split',   label: 'Tri-Split' },
  { value: 'quadri-split',label: 'Quadri-Split' },
]
