// ─── BIBLIOTECA DE MATERIAIS TÉCNICOS ────────────────────────────────────────
// Catálogo de referência para instalação/manutenção de ar-condicionado Split.
// O técnico escolhe daqui os materiais que usa e define os preços na Tabela de
// Preços. Preços começam zerados — cada profissional/região tem o seu.

export interface ItemCatalogo {
  nome: string
  unidade: string
}

export interface CategoriaCatalogo {
  categoria: string
  itens: ItemCatalogo[]
}

export const CATALOGO_MATERIAIS: CategoriaCatalogo[] = [
  {
    categoria: 'Tubulação frigorígena (cobre)',
    itens: [
      { nome: 'Tubo de cobre 1/4"', unidade: 'm' },
      { nome: 'Tubo de cobre 3/8"', unidade: 'm' },
      { nome: 'Tubo de cobre 1/2"', unidade: 'm' },
      { nome: 'Tubo de cobre 5/8"', unidade: 'm' },
      { nome: 'Tubo de cobre 3/4"', unidade: 'm' },
      { nome: 'Tubo de cobre 7/8"', unidade: 'm' },
      { nome: 'Tubo de cobre 1"', unidade: 'm' },
      { nome: 'Tubo de cobre 1.1/8"', unidade: 'm' },
      { nome: 'Tubo de cobre 1.3/8"', unidade: 'm' },
      { nome: 'Par de tubos isolados 1/4" + 3/8"', unidade: 'm' },
      { nome: 'Par de tubos isolados 1/4" + 5/8"', unidade: 'm' },
      { nome: 'Par de tubos isolados 3/8" + 5/8"', unidade: 'm' },
      { nome: 'Par de tubos isolados 3/8" + 3/4"', unidade: 'm' },
    ],
  },
  {
    categoria: 'Isolamento térmico',
    itens: [
      { nome: 'Isolamento elastomérico 1/4" (6mm)', unidade: 'm' },
      { nome: 'Isolamento elastomérico 3/8" (9mm)', unidade: 'm' },
      { nome: 'Isolamento elastomérico 1/2" (9mm)', unidade: 'm' },
      { nome: 'Isolamento elastomérico 5/8" (13mm)', unidade: 'm' },
      { nome: 'Isolamento elastomérico 3/4" (13mm)', unidade: 'm' },
      { nome: 'Isolamento elastomérico 7/8" (19mm)', unidade: 'm' },
      { nome: 'Fita PVC de acabamento (rolo)', unidade: 'rolo' },
      { nome: 'Fita aluminizada (rolo)', unidade: 'rolo' },
    ],
  },
  {
    categoria: 'Conexões frigorígenas',
    itens: [
      { nome: 'Porca flangeada 1/4"', unidade: 'un' },
      { nome: 'Porca flangeada 3/8"', unidade: 'un' },
      { nome: 'Porca flangeada 1/2"', unidade: 'un' },
      { nome: 'Porca flangeada 5/8"', unidade: 'un' },
      { nome: 'União (luva) 1/4"', unidade: 'un' },
      { nome: 'União (luva) 3/8"', unidade: 'un' },
      { nome: 'Curva 90° 3/8"', unidade: 'un' },
      { nome: 'Redução 3/8" x 1/2"', unidade: 'un' },
      { nome: 'Válvula de serviço', unidade: 'un' },
      { nome: 'Válvula de retenção', unidade: 'un' },
    ],
  },
  {
    categoria: 'Dreno de condensado',
    itens: [
      { nome: 'Tubo PVC dreno 16mm', unidade: 'm' },
      { nome: 'Tubo PVC dreno 20mm', unidade: 'm' },
      { nome: 'Tubo PVC dreno 25mm', unidade: 'm' },
      { nome: 'Tubo PVC dreno 32mm', unidade: 'm' },
      { nome: 'Mangueira cristal (dreno)', unidade: 'm' },
      { nome: 'Mangueira corrugada (dreno)', unidade: 'm' },
      { nome: 'Joelho 90° dreno', unidade: 'un' },
      { nome: 'Joelho 45° dreno', unidade: 'un' },
      { nome: 'Tê dreno', unidade: 'un' },
      { nome: 'Luva dreno', unidade: 'un' },
      { nome: 'Sifão anti-odor', unidade: 'un' },
      { nome: 'Bomba de dreno', unidade: 'un' },
    ],
  },
  {
    categoria: 'Instalação elétrica (cabos)',
    itens: [
      { nome: 'Cabo flexível 1,5mm²', unidade: 'm' },
      { nome: 'Cabo flexível 2,5mm²', unidade: 'm' },
      { nome: 'Cabo flexível 4mm²', unidade: 'm' },
      { nome: 'Cabo flexível 6mm²', unidade: 'm' },
      { nome: 'Cabo flexível 10mm²', unidade: 'm' },
      { nome: 'Cabo flexível 16mm²', unidade: 'm' },
      { nome: 'Cabo PP 3x1,5mm²', unidade: 'm' },
      { nome: 'Cabo PP 3x2,5mm²', unidade: 'm' },
      { nome: 'Cabo PP 4x2,5mm²', unidade: 'm' },
      { nome: 'Cabo de interligação (comunicação)', unidade: 'm' },
      { nome: 'Cabo de aterramento', unidade: 'm' },
    ],
  },
  {
    categoria: 'Proteção elétrica',
    itens: [
      { nome: 'Disjuntor curva C 10A', unidade: 'un' },
      { nome: 'Disjuntor curva C 16A', unidade: 'un' },
      { nome: 'Disjuntor curva C 20A', unidade: 'un' },
      { nome: 'Disjuntor curva C 25A', unidade: 'un' },
      { nome: 'Disjuntor curva C 32A', unidade: 'un' },
      { nome: 'Disjuntor bipolar 16A', unidade: 'un' },
      { nome: 'Disjuntor bipolar 20A', unidade: 'un' },
      { nome: 'Disjuntor bipolar 25A', unidade: 'un' },
      { nome: 'DR (diferencial residual) 25A', unidade: 'un' },
      { nome: 'DPS (protetor de surto)', unidade: 'un' },
      { nome: 'Seccionadora', unidade: 'un' },
    ],
  },
  {
    categoria: 'Eletrodutos e acessórios',
    itens: [
      { nome: 'Eletroduto PVC rígido 20mm', unidade: 'm' },
      { nome: 'Eletroduto PVC rígido 25mm', unidade: 'm' },
      { nome: 'Eletroduto corrugado 20mm', unidade: 'm' },
      { nome: 'Eletroduto corrugado 25mm', unidade: 'm' },
      { nome: 'Luva eletroduto', unidade: 'un' },
      { nome: 'Curva eletroduto', unidade: 'un' },
      { nome: 'Caixa de passagem', unidade: 'un' },
      { nome: 'Abraçadeira tipo D', unidade: 'un' },
    ],
  },
  {
    categoria: 'Fixação da evaporadora',
    itens: [
      { nome: 'Suporte plástico evaporadora', unidade: 'un' },
      { nome: 'Chapa/base de fixação', unidade: 'un' },
      { nome: 'Bucha nº 8 + parafuso', unidade: 'un' },
      { nome: 'Bucha nº 10 + parafuso', unidade: 'un' },
    ],
  },
  {
    categoria: 'Fixação da condensadora',
    itens: [
      { nome: 'Mão francesa (par)', unidade: 'par' },
      { nome: 'Suporte de parede condensadora (par)', unidade: 'par' },
      { nome: 'Base de piso condensadora', unidade: 'un' },
      { nome: 'Perfilado metálico', unidade: 'm' },
      { nome: 'Parabolt / chumbador', unidade: 'un' },
    ],
  },
  {
    categoria: 'Antivibração',
    itens: [
      { nome: 'Coxim de borracha', unidade: 'un' },
      { nome: 'Coxim metálico', unidade: 'un' },
      { nome: 'Calço antivibratório', unidade: 'un' },
      { nome: 'Base antivibratória', unidade: 'un' },
    ],
  },
  {
    categoria: 'Canaletas e acabamento',
    itens: [
      { nome: 'Canaleta PVC 50x30mm', unidade: 'm' },
      { nome: 'Canaleta PVC 60x40mm', unidade: 'm' },
      { nome: 'Canaleta PVC 80x50mm', unidade: 'm' },
      { nome: 'Canaleta PVC 110x75mm', unidade: 'm' },
      { nome: 'Curva interna canaleta', unidade: 'un' },
      { nome: 'Curva externa canaleta', unidade: 'un' },
      { nome: 'Tê canaleta', unidade: 'un' },
      { nome: 'Terminal/tampa canaleta', unidade: 'un' },
    ],
  },
  {
    categoria: 'Vedação',
    itens: [
      { nome: 'Silicone', unidade: 'un' },
      { nome: 'Selante PU', unidade: 'un' },
      { nome: 'Massa de vedação', unidade: 'un' },
      { nome: 'Fita veda-rosca', unidade: 'un' },
      { nome: 'Espuma expansiva', unidade: 'un' },
      { nome: 'Passa-muro (parede)', unidade: 'un' },
    ],
  },
  {
    categoria: 'Refrigerantes (gás)',
    itens: [
      { nome: 'Carga de gás R-32 (por grama)', unidade: 'g' },
      { nome: 'Carga de gás R-410A (por grama)', unidade: 'g' },
      { nome: 'Carga de gás R-454B (por grama)', unidade: 'g' },
      { nome: 'Cilindro de gás R-32', unidade: 'un' },
      { nome: 'Cilindro de gás R-410A', unidade: 'un' },
    ],
  },
  {
    categoria: 'Consumíveis e comissionamento',
    itens: [
      { nome: 'Vareta de solda (foscoper)', unidade: 'un' },
      { nome: 'Nitrogênio (teste de pressão)', unidade: 'un' },
      { nome: 'Fluido detector de vazamento', unidade: 'un' },
      { nome: 'Filtro secador', unidade: 'un' },
      { nome: 'Abraçadeira nylon (pacote)', unidade: 'pc' },
      { nome: 'Fita isolante', unidade: 'un' },
    ],
  },
]
