import { alfa, num, data, cnpj, ie, validar } from '../utils/formatters.js'
import { removeAcentos, somenteDigitos, normalizarUF } from '../utils/stringUtils.js'

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Converte CST ICMS para código de situação tributária do Tipo 60A.
 * @param {string} cst
 * @returns {string} 'T' | 'I' | 'F' | 'N'
 */
export function situacaoTrib(cst) {
  const c = String(cst || '').trim().padStart(2, '0')
  if (['00', '10', '20', '70', '90'].includes(c)) return 'T'
  if (['40', '41'].includes(c)) return 'I'
  if (['30', '60'].includes(c)) return 'F'
  return 'N'
}

// ---------------------------------------------------------------------------
// Registros SINTEGRA
// ---------------------------------------------------------------------------

/**
 * Tipo 10 - Mestre do Estabelecimento (1 por arquivo).
 * Layout 126 chars (Convênio ICMS 57/95, Portaria 22/2003):
 *  01-02  "10"          2N
 *  03-16  CNPJ         14N
 *  17-30  IE           14X
 *  31-65  Nome         35X
 *  66-95  Município    30X
 *  96-97  UF            2X
 *  98-107 Fax          10N
 * 108-115 DtIni         8N  AAAAMMDD
 * 116-123 DtFin         8N  AAAAMMDD
 * 124    CodEstrutura    1X  "2"=versão atual Convênio 57/95
 * 125    CodNatureza     1X  "3"=totalidade das operações
 * 126    CodFinalidade   1X  "1"=arquivo normal
 */
export function registro10(emit, dtIni, dtFin, {
  codConvenio = '3',
  codNatureza = '3',
  codFinalidade = '1',
} = {}) {
  const uf = normalizarUF(emit.enderEmit.UF)
  const reg =
    '10' +
    cnpj(emit.CNPJ) +
    alfa(emit.IE, 14) +
    alfa(emit.xNome, 35) +
    alfa(emit.enderEmit.xMun, 30) +
    alfa(uf, 2) +
    num(somenteDigitos(emit.enderEmit.fone || ''), 10) +
    data(dtIni) +
    data(dtFin) +
    alfa(codConvenio, 1) +
    alfa(codNatureza, 1) +
    alfa(codFinalidade, 1)
  validar(reg, '10')
  return reg
}

export function registro61({
  dtEmissao,
  mod = '65',
  serie,
  subserie = '',
  numOrdemIni,
  numOrdemFim,
  vlTotal,
  vlBcIcms,
  vlIcms,
  vlIsento,
  vlOutros,
  aliqIcms = '0',
}) {
  const reg =
    '61' +
    ' '.repeat(14) +
    ' '.repeat(14) +
    data(dtEmissao) +
    num(mod, 2) +
    alfa(serie, 3) +
    alfa(subserie, 2) +
    num(numOrdemIni, 6) +
    num(numOrdemFim, 6) +
    num(vlTotal, 13, 2) +
    num(vlBcIcms, 13, 2) +
    num(vlIcms, 12, 2) +
    num(vlIsento, 13, 2) +
    num(vlOutros, 13, 2) +
    num(aliqIcms, 4, 2) +
    ' '
  validar(reg, '61')
  return reg
}

export function registro61r({
  mesAno,
  codProduto,
  qtd,
  vlBruto,
  vlBcIcms,
  aliqIcms = '0',
}) {
  const reg =
    '61' +
    'R' +
    num(mesAno, 6) +
    alfa(codProduto, 14) +
    num(qtd, 13, 3) +
    num(vlBruto, 16, 2) +
    num(vlBcIcms, 16, 2) +
    num(aliqIcms, 4, 2) +
    ' '.repeat(54)
  validar(reg, '61R')
  return reg
}

export function registro70({
  cnpjOp,
  ieOp,
  dtEmissao,
  ufOp,
  mod,
  serie,
  subserie = '',
  numero,
  cfop,
  vlTotal,
  vlBcIcms,
  vlIcms,
  vlIsento,
  vlOutros,
  cifFob = '1',
  situacao = 'N',
}) {
  const reg =
    '70' +
    cnpj(cnpjOp) +
    ie(ieOp, ufOp) +
    data(dtEmissao) +
    alfa(normalizarUF(ufOp), 2) +
    num(mod, 2) +
    alfa(serie, 1) +
    alfa(subserie, 2) +
    num(numero, 6) +
    num(cfop, 3) +
    num(vlTotal, 14, 2) +
    num(vlBcIcms, 14, 2) +
    num(vlIcms, 14, 2) +
    num(vlIsento, 14, 2) +
    num(vlOutros, 14, 2) +
    num(cifFob, 1) +
    alfa(situacao, 1)
  validar(reg, '70')
  return reg
}

/**
 * Tipo 11 - Dados Complementares do Estabelecimento (1 por arquivo).
 * Layout 126 chars:
 *  01-02  "11"          2N
 *  03-36  Logradouro   34X
 *  37-41  Número        5X
 *  42-63  Complemento  22X
 *  64-78  Bairro       15X
 *  79-86  CEP           8N
 *  87-114 NomeContato  28X
 * 115-126 Telefone     12N
 */
export function registro11(emit) {
  const end = emit.enderEmit
  const reg =
    '11' +
    alfa(end.xLgr, 34) +
    num(somenteDigitos(end.nro || '0'), 5) +
    alfa(end.xCpl, 22) +
    alfa(end.xBairro, 15) +
    num(somenteDigitos(end.CEP || '0'), 8) +
    alfa(emit.xNome, 28) +
    num(somenteDigitos(end.fone || ''), 12)
  validar(reg, '11')
  return reg
}

/**
 * Tipo 50 - Total da Nota Fiscal (1 por NF por CFOP).
 * Layout 126 chars:
 *  01-02  "50"         2N
 *  03-16  CNPJ        14N  remetente (entrada) ou destinatário (saída)
 *  17-30  IE          14X
 *  31-38  Data         8N  AAAAMMDD
 *  39-40  UF           2X
 *  41-42  Modelo       2N
 *  43-45  Série        3X
 *  46-51  Número       6N
 *  52-55  CFOP         4N
 *  56     Emitente     1X  P=próprio (saída), T=terceiros (entrada)
 *  57-69  VlTotal     13N  2 dec
 *  70-82  VlBcIcms    13N  2 dec
 *  83-95  VlIcms      13N  2 dec
 *  96-108 VlIsento    13N  2 dec
 * 109-121 VlOutros    13N  2 dec
 * 122-125 AliqIcms     4N  2 dec
 * 126    Situação      1X  N=normal
 */
export function registro50({
  cnpjOp,
  ieOp,
  dtEmissao,
  ufOp,
  mod,
  serie,
  numero,
  cfop,
  emitente,
  vlTotal,
  vlBcIcms,
  vlIcms,
  vlIsento,
  vlOutros,
  aliqIcms = '0',
  situacao = 'N',
}) {
  const reg =
    '50' +
    cnpj(cnpjOp) +
    ie(ieOp, ufOp) +
    data(dtEmissao) +
    alfa(normalizarUF(ufOp), 2) +
    num(mod, 2) +
    alfa(serie, 3) +
    num(numero, 6) +
    num(cfop, 4) +
    alfa(emitente, 1) +
    num(vlTotal, 13, 2) +
    num(vlBcIcms, 13, 2) +
    num(vlIcms, 13, 2) +
    num(vlIsento, 13, 2) +
    num(vlOutros, 13, 2) +
    num(aliqIcms, 4, 2) +
    alfa(situacao, 1)
  validar(reg, '50')
  return reg
}

/**
 * Tipo 53 - Substituição Tributária do ICMS (1 por NF por CFOP com ST).
 * Layout 126 chars:
 *  01-02  "53"          2N
 *  03-16  CNPJ         14N  remetente (entrada) ou destinatário (saída)
 *  17-30  IE           14X
 *  31-38  Data          8N  AAAAMMDD
 *  39-40  UF            2X
 *  41-42  Modelo        2N
 *  43-45  Série         3X
 *  46-51  Número        6N
 *  52-55  CFOP          4N
 *  56     Emitente      1X  P=próprio (saída), T=terceiros (entrada)
 *  57-69  VlBcIcmsST   13N  2 dec
 *  70-82  VlIcmsST     13N  2 dec
 *  83-95  VlBcSTRet    13N  2 dec  (ST retido anteriormente)
 *  96-108 VlIcmsSTRet  13N  2 dec  (ST retido anteriormente)
 * 109-121 VlRedBcST    13N  2 dec  (redução da BC ST)
 * 122-124 CodST         3N  código da situação tributária
 * 125    Situação       1X  N=normal
 * 126    Brancos        1X
 */
export function registro53({
  cnpjOp,
  ieOp,
  dtEmissao,
  ufOp,
  mod,
  serie,
  numero,
  cfop,
  vlBcIcmsST,
  vlIcmsST,
  vlBcSTRet = '0',
  vlIcmsSTRet = '0',
  vlRedBcST = '0',
  codST = '0',
  situacao = 'N',
}) {
  const reg =
    '53' +
    cnpj(cnpjOp) +
    ie(ieOp, ufOp) +
    data(dtEmissao) +
    alfa(normalizarUF(ufOp), 2) +
    num(mod, 2) +
    alfa(serie, 3) +
    num(numero, 6) +
    num(cfop, 4) +
    num(vlBcIcmsST, 13, 2) +
    num(vlIcmsST, 13, 2) +
    num(vlBcSTRet, 13, 2) +
    num(vlIcmsSTRet, 13, 2) +
    num(vlRedBcST, 13, 2) +
    alfa(situacao, 1) +
    num(codST, 3) +
    '  '
  validar(reg, '53')
  return reg
}

/**
 * Tipo 54 - Produto/Serviço da Nota Fiscal (1 por item).
 * Layout 126 chars:
 *  01-02  "54"          2N
 *  03-16  CNPJ         14N  emitente do documento
 *  17-18  Modelo        2N
 *  19-21  Série         3X
 *  22-27  Número        6N
 *  28-31  CFOP          4N
 *  32-34  CST           3N
 *  35-37  NumItem       3N
 *  38-51  CodProduto   14X
 *  52-62  Qtd          11N  3 dec
 *  63-74  VlProduto    12N  2 dec
 *  75-86  VlDesconto   12N  2 dec
 *  87-98  VlBcIcms     12N  2 dec
 *  99-110 VlBcIcmsST   12N  2 dec
 * 111-122 VlIpi        12N  2 dec
 * 123-126 AliqIcms      4N  2 dec
 */
export function registro54({
  cnpjEmit,
  modelo,
  serie,
  numero,
  cfop,
  cst,
  numItem,
  codProduto,
  qtd,
  vlProduto,
  vlDesconto,
  vlBcIcms,
  vlBcIcmsST = '0',
  vlIpi = '0',
  aliqIcms,
}) {
  const reg =
    '54' +
    cnpj(cnpjEmit) +
    num(modelo, 2) +
    alfa(serie, 3) +
    num(numero, 6) +
    num(cfop, 4) +
    num(cst, 3) +
    num(numItem, 3) +
    alfa(codProduto, 14) +
    num(qtd, 11, 3) +
    num(vlProduto, 12, 2) +
    num(vlDesconto, 12, 2) +
    num(vlBcIcms, 12, 2) +
    num(vlBcIcmsST, 12, 2) +
    num(vlIpi, 12, 2) +
    num(aliqIcms, 4, 2)
  validar(reg, '54')
  return reg
}

/**
 * Tipo 60M - Mestre de Equipamento / NFC-e (1 por dia por série).
 * Layout 126 chars:
 *  01-02  "60"           2N
 *  03     "M"            1X
 *  04-11  Data           8N  AAAAMMDD
 *  12-31  NumSerie      20X
 *  32-34  NumOrdem       3N  sequencial por série (CRZ)
 *  35-36  Modelo         2X  "2D" para NFC-e emulando ECF
 *  37-42  COOIni         6N  menor número de NF do grupo
 *  43-48  COOFim         6N  maior número de NF do grupo
 *  49-54  CRZ            6N  contador de redução Z
 *  55-57  CRO            3N  contador de reinício de operação
 *  58-73  VlVendaBruta  16N  2 dec
 *  74-89  VlTotGeral    16N  2 dec
 *  90-126 Brancos       37X
 */
export function registro60m({
  dtEmissao,
  numSerie,
  numOrdem,
  modelo = '2D',
  cooIni,
  cooFim,
  crz,
  cro = 1,
  vlVendaBruta,
  vlTotGeral,
}) {
  const reg =
    '60' +
    'M' +
    data(dtEmissao) +
    alfa(numSerie, 20) +
    num(numOrdem, 3) +
    alfa(modelo, 2) +
    num(cooIni, 6) +
    num(cooFim, 6) +
    num(crz, 6) +
    num(cro, 3) +
    num(vlVendaBruta, 16, 2) +
    num(vlTotGeral, 16, 2) +
    ' '.repeat(37)
  validar(reg, '60M')
  return reg
}

/**
 * Tipo 60A - Analítico por alíquota de ICMS / NFC-e (1 por dia/série/situação).
 * Layout 126 chars:
 *  01-02  "60"          2N
 *  03     "A"           1X
 *  04-11  Data          8N  AAAAMMDD
 *  12-31  NumSerie     20X
 *  32-35  SitTribAliq   4X  alíquota 4N,2d se T; letra+espaços se I/F/N
 *  36-47  VlAcumulado  12N  2 dec
 *  48-126 Brancos      79X
 */
export function registro60a({
  dtEmissao,
  numSerie,
  sit,
  aliqIcms,
  vlAcumulado,
}) {
  // SitTribAliq: se tributado usa alíquota como 4N,2d; senão letra preenchida com espaços
  const sitTribAliq = sit === 'T'
    ? num(aliqIcms, 4, 2)
    : alfa(sit, 4)

  const reg =
    '60' +
    'A' +
    data(dtEmissao) +
    alfa(numSerie, 20) +
    sitTribAliq +
    num(vlAcumulado, 12, 2) +
    ' '.repeat(79)
  validar(reg, '60A')
  return reg
}

/**
 * Tipo 75 - Código de Produto/Serviço (1 por produto único no período).
 * Layout 126 chars:
 *  01-02  "75"           2N
 *  03-10  DtIni          8N  AAAAMMDD
 *  11-18  DtFin          8N  AAAAMMDD
 *  19-32  CodProduto    14X
 *  33-40  NCM            8X
 *  41-93  Descricao     53X
 *  94-99  Unidade        6X
 * 100-104 AliqIpi        5N  2 dec
 * 105-108 AliqIcms       4N  2 dec
 * 109-113 RedBcIcms      5N  2 dec
 * 114-126 BcIcmsST      13N  2 dec
 */
export function registro75({
  dtIni,
  dtFin,
  codProduto,
  ncm,
  descProduto,
  unidade,
  sitTrib = '0',
  aliqIpi = '0',
  aliqIcms = '0',
  redBcIcms = '0',
  bcIcmsST = '0',
}) {
  const ncmNum = somenteDigitos(ncm).padStart(8, '0').slice(0, 8)
  const reg =
    '75' +
    data(dtIni) +
    data(dtFin) +
    alfa(codProduto, 14) +
    ncmNum +
    alfa(descProduto, 53) +
    alfa(unidade, 6) +
    num(aliqIpi, 5, 2) +
    num(aliqIcms, 4, 2) +
    num(redBcIcms, 5, 2) +
    num(bcIcmsST, 13, 2)
  validar(reg, '75')
  return reg
}

/**
 * Tipo 90 - Totalizador do Arquivo.
 * Cada registro comporta 9 pares (tipo 2N + qtd 8N = 10 chars).
 * Layout por registro (126 chars):
 *  01-02  "90"        2N
 *  03-16  CNPJ       14N
 *  17-30  IE         14X
 *  31-120 Pares      90X  (até 9 pares de 10 chars cada)
 * 121-124 Brancos     4X
 * 125-126 QtdTipo90   2N
 *
 * @param {string} cnpjVal
 * @param {string} ieVal
 * @param {object} contadores  { "10": 1, "11": 1, ... }
 * @param {number} numTipo90
 * @returns {string[]}
 */
export function registro90(cnpjVal, ieVal, contadores, numTipo90) {
  const cab = '90' + cnpj(cnpjVal) + alfa(ieVal, 14) // 30 chars

  const pares = Object.entries(contadores).sort((a, b) => a[0].localeCompare(b[0]))
  const registros = []

  const chunkSize = 9
  const totalPares = Math.max(pares.length, 1)
  for (let i = 0; i < totalPares; i += chunkSize) {
    const chunk = pares.slice(i, i + chunkSize)
    let corpo = chunk.map(([t, q]) => num(t, 2) + num(q, 8)).join('')
    corpo = corpo.padEnd(90) // slots nao usados preenchidos com brancos
    const rodape = '     ' + num(numTipo90, 1) // 5 brancos + 1N = 6 chars (campo 06 é 1N na posição 126)
    const reg = cab + corpo + rodape // 30 + 90 + 6 = 126
    validar(reg, '90')
    registros.push(reg)
  }

  return registros
}
