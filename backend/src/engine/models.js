export const createImpostoICMS = () => ({
  orig: '',
  cst: '',
  modBC: '',
  vBC: '0',
  pICMS: '0',
  vICMS: '0',
  modBCST: '',
  vBCST: '0',
  vICMSST: '0',
})

export const createImpostoIPI = () => ({
  cst: '',
  vIPI: '0',
  pIPI: '0',
})

export const createImpostoPIS = () => ({
  cst: '',
  vBC: '0',
  pPIS: '0',
  vPIS: '0',
})

export const createImpostoCOFINS = () => ({
  cst: '',
  vBC: '0',
  pCOFINS: '0',
  vCOFINS: '0',
})

export const createEndereco = () => ({
  xLgr: '',
  nro: '',
  xCpl: '',
  xBairro: '',
  cMun: '',
  xMun: '',
  UF: '',
  CEP: '',
  fone: '',
})

export const createEmitente = () => ({
  CNPJ: '',
  xNome: '',
  xFant: '',
  IE: '',
  CRT: '',
  enderEmit: createEndereco(),
})

export const createDestinatario = () => ({
  CNPJ: '',
  CPF: '',
  xNome: '',
  IE: '',
  indIEDest: '',
  enderDest: createEndereco(),
})

export const createItem = () => ({
  nItem: 0,
  cProd: '',
  cEAN: '',
  xProd: '',
  NCM: '',
  CFOP: '',
  uCom: '',
  qCom: '0',
  vUnCom: '0',
  vProd: '0',
  vDesc: '0',
  icms: createImpostoICMS(),
  ipi: createImpostoIPI(),
  pis: createImpostoPIS(),
  cofins: createImpostoCOFINS(),
})

export const createTotal = () => ({
  vBC: '0',
  vICMS: '0',
  vICMSDeson: '0',
  vBCST: '0',
  vST: '0',
  vProd: '0',
  vFrete: '0',
  vSeg: '0',
  vDesc: '0',
  vIPI: '0',
  vPIS: '0',
  vCOFINS: '0',
  vOutro: '0',
  vNF: '0',
})

export const createNFe = () => ({
  tipoDoc: 'NFE',
  chave: '',
  cNF: '',
  nNF: '',
  serie: '',
  subserie: '',
  cfop: '',
  modelo: '',
  tpNF: '',
  dhEmi: null,
  dhSaiEnt: null,
  natOp: '',
  cUF: '',
  cMunFG: '',
  tpEmis: '',
  finNFe: '',
  emit: createEmitente(),
  dest: createDestinatario(),
  itens: [],
  total: createTotal(),
  nProt: '',
  cStat: '',
  cancelada: false,
})
