import fs from 'fs'
import xml2js from 'xml2js'
import {
  createNFe,
  createEmitente,
  createDestinatario,
  createEndereco,
  createItem,
  createTotal,
  createImpostoICMS,
  createImpostoIPI,
  createImpostoPIS,
  createImpostoCOFINS,
} from './models.js'

const parseOptions = {
  explicitArray: false,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix],
}

function _get(obj, ...keys) {
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return ''
    cur = cur[k]
  }
  if (cur == null) return ''
  return String(cur).trim()
}

function _parseDate(valor) {
  if (!valor) return null
  const s = String(valor).trim().slice(0, 19)
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
}

function _parseEndereco(endObj) {
  if (!endObj) return createEndereco()
  return {
    xLgr: _get(endObj, 'xLgr'),
    nro: _get(endObj, 'nro'),
    xCpl: _get(endObj, 'xCpl'),
    xBairro: _get(endObj, 'xBairro'),
    cMun: _get(endObj, 'cMun'),
    xMun: _get(endObj, 'xMun'),
    UF: _get(endObj, 'UF'),
    CEP: _get(endObj, 'CEP'),
    fone: _get(endObj, 'fone'),
  }
}

function _parseEmitente(emitObj) {
  if (!emitObj) return createEmitente()
  return {
    CNPJ: _get(emitObj, 'CNPJ'),
    xNome: _get(emitObj, 'xNome'),
    xFant: _get(emitObj, 'xFant') || _get(emitObj, 'xNome'),
    IE: _get(emitObj, 'IE'),
    CRT: _get(emitObj, 'CRT'),
    enderEmit: _parseEndereco(emitObj.enderEmit),
  }
}

function _parseDestinatario(destObj) {
  if (!destObj) return createDestinatario()
  return {
    CNPJ: _get(destObj, 'CNPJ'),
    CPF: _get(destObj, 'CPF'),
    xNome: _get(destObj, 'xNome'),
    IE: _get(destObj, 'IE'),
    indIEDest: _get(destObj, 'indIEDest'),
    enderDest: _parseEndereco(destObj.enderDest),
  }
}

function _parseParteCTe(parteObj) {
  if (!parteObj) return createDestinatario()
  const ender = parteObj.enderToma || parteObj.enderReme || parteObj.enderDest || parteObj.enderReceb || parteObj.enderExped
  return {
    CNPJ: _get(parteObj, 'CNPJ'),
    CPF: _get(parteObj, 'CPF'),
    xNome: _get(parteObj, 'xNome'),
    IE: _get(parteObj, 'IE'),
    indIEDest: '1',
    enderDest: _parseEndereco(ender),
  }
}

function _parseICMS(impostoObj) {
  if (!impostoObj) return createImpostoICMS()
  const icmsContainer = impostoObj.ICMS
  if (!icmsContainer) return createImpostoICMS()

  const childKeys = Object.keys(icmsContainer).filter((k) => k !== '$')
  if (childKeys.length === 0) return createImpostoICMS()

  const child = icmsContainer[childKeys[0]]
  if (!child) return createImpostoICMS()

  return {
    orig: _get(child, 'orig'),
    cst: _get(child, 'CST') || _get(child, 'CSOSN'),
    modBC: _get(child, 'modBC'),
    vBC: _get(child, 'vBC') || '0',
    pICMS: _get(child, 'pICMS') || _get(child, 'pICMSSTRet') || '0',
    vICMS: _get(child, 'vICMS') || _get(child, 'vICMSSTRet') || '0',
    modBCST: _get(child, 'modBCST'),
    vBCST: _get(child, 'vBCST') || '0',
    vICMSST: _get(child, 'vICMSST') || '0',
  }
}

function _parseIPI(impostoObj) {
  if (!impostoObj) return createImpostoIPI()
  const ipiContainer = impostoObj.IPI
  if (!ipiContainer) return createImpostoIPI()

  const childKeys = Object.keys(ipiContainer).filter((k) => k !== '$')
  if (childKeys.length === 0) return createImpostoIPI()

  const child = ipiContainer[childKeys[0]]
  if (!child) return createImpostoIPI()

  return {
    cst: _get(child, 'CST'),
    vIPI: _get(child, 'vIPI') || '0',
    pIPI: _get(child, 'pIPI') || '0',
  }
}

function _parsePIS(impostoObj) {
  if (!impostoObj) return createImpostoPIS()
  const pisContainer = impostoObj.PIS
  if (!pisContainer) return createImpostoPIS()

  const childKeys = Object.keys(pisContainer).filter((k) => k !== '$')
  if (childKeys.length === 0) return createImpostoPIS()

  const child = pisContainer[childKeys[0]]
  if (!child) return createImpostoPIS()

  return {
    cst: _get(child, 'CST'),
    vBC: _get(child, 'vBC') || '0',
    pPIS: _get(child, 'pPIS') || '0',
    vPIS: _get(child, 'vPIS') || '0',
  }
}

function _parseCOFINS(impostoObj) {
  if (!impostoObj) return createImpostoCOFINS()
  const cofinsContainer = impostoObj.COFINS
  if (!cofinsContainer) return createImpostoCOFINS()

  const childKeys = Object.keys(cofinsContainer).filter((k) => k !== '$')
  if (childKeys.length === 0) return createImpostoCOFINS()

  const child = cofinsContainer[childKeys[0]]
  if (!child) return createImpostoCOFINS()

  return {
    cst: _get(child, 'CST'),
    vBC: _get(child, 'vBC') || '0',
    pCOFINS: _get(child, 'pCOFINS') || '0',
    vCOFINS: _get(child, 'vCOFINS') || '0',
  }
}

function _parseItem(detObj) {
  if (!detObj) return createItem()

  const prod = detObj.prod || {}
  const imposto = detObj.imposto || {}

  const nItemAttr = detObj.$ ? _get(detObj.$, 'nItem') : ''
  const nItem = parseInt(_get(prod, 'nItem') || nItemAttr || '0', 10)

  return {
    nItem,
    cProd: _get(prod, 'cProd'),
    cEAN: _get(prod, 'cEAN'),
    xProd: _get(prod, 'xProd'),
    NCM: _get(prod, 'NCM'),
    CFOP: _get(prod, 'CFOP'),
    uCom: _get(prod, 'uCom'),
    qCom: _get(prod, 'qCom') || '0',
    vUnCom: _get(prod, 'vUnCom') || '0',
    vProd: _get(prod, 'vProd') || '0',
    vDesc: _get(prod, 'vDesc') || '0',
    icms: _parseICMS(imposto),
    ipi: _parseIPI(imposto),
    pis: _parsePIS(imposto),
    cofins: _parseCOFINS(imposto),
  }
}

function _parseTotal(totalObj) {
  if (!totalObj) return createTotal()
  const icmsTot = totalObj.ICMSTot || {}
  return {
    vBC: _get(icmsTot, 'vBC') || '0',
    vICMS: _get(icmsTot, 'vICMS') || '0',
    vICMSDeson: _get(icmsTot, 'vICMSDeson') || '0',
    vBCST: _get(icmsTot, 'vBCST') || '0',
    vST: _get(icmsTot, 'vST') || '0',
    vProd: _get(icmsTot, 'vProd') || '0',
    vFrete: _get(icmsTot, 'vFrete') || '0',
    vSeg: _get(icmsTot, 'vSeg') || '0',
    vDesc: _get(icmsTot, 'vDesc') || '0',
    vIPI: _get(icmsTot, 'vIPI') || '0',
    vPIS: _get(icmsTot, 'vPIS') || '0',
    vCOFINS: _get(icmsTot, 'vCOFINS') || '0',
    vOutro: _get(icmsTot, 'vOutro') || '0',
    vNF: _get(icmsTot, 'vNF') || '0',
  }
}

function _hasCancelamentoEvento(node) {
  if (node == null) return false
  if (typeof node !== 'object') return false

  const tpEvento = _get(node, 'tpEvento')
  const xEvento = _get(node, 'xEvento').toUpperCase()
  const xMotivo = _get(node, 'xMotivo').toUpperCase()
  const cStat = _get(node, 'cStat')

  if (tpEvento === '110111') return true
  if (xEvento.includes('CANCEL')) return true
  if (['101', '151', '155'].includes(cStat) && (xMotivo.includes('CANCEL') || xEvento.includes('CANCEL'))) {
    return true
  }

  for (const value of Object.values(node)) {
    if (_hasCancelamentoEvento(value)) return true
  }
  return false
}

function _parseNFe(parsed, filePath) {
  const root = parsed
  let infNFe = null

  if (root.nfeProc) {
    infNFe = root.nfeProc?.NFe?.infNFe
  } else if (root.NFe) {
    infNFe = root.NFe?.infNFe
  } else if (root.infNFe) {
    infNFe = root.infNFe
  }
  if (!infNFe) return null

  const nfe = createNFe()
  nfe.tipoDoc = 'NFE'

  const chaveId = infNFe.$ ? (infNFe.$.Id || '') : ''
  nfe.chave = chaveId.startsWith('NFe') ? chaveId.slice(3) : chaveId

  const ide = infNFe.ide || {}
  nfe.cUF = _get(ide, 'cUF')
  nfe.cNF = _get(ide, 'cNF')
  nfe.natOp = _get(ide, 'natOp')
  nfe.modelo = _get(ide, 'mod')
  nfe.serie = _get(ide, 'serie')
  nfe.subserie = _get(ide, 'subserie')
  nfe.nNF = _get(ide, 'nNF')
  nfe.cfop = _get(ide, 'CFOP')
  nfe.dhEmi = _parseDate(_get(ide, 'dhEmi'))
  nfe.dhSaiEnt = _parseDate(_get(ide, 'dhSaiEnt'))
  nfe.tpNF = _get(ide, 'tpNF')
  nfe.cMunFG = _get(ide, 'cMunFG')
  nfe.tpEmis = _get(ide, 'tpEmis')
  nfe.finNFe = _get(ide, 'finNFe')

  nfe.emit = _parseEmitente(infNFe.emit)
  if (infNFe.dest) nfe.dest = _parseDestinatario(infNFe.dest)

  const detRaw = infNFe.det
  if (detRaw) {
    const detArray = Array.isArray(detRaw) ? detRaw : [detRaw]
    for (let i = 0; i < detArray.length; i++) {
      const det = detArray[i]
      const item = _parseItem(det)
      if (det.$ && det.$.nItem) {
        item.nItem = parseInt(det.$.nItem, 10)
      } else if (item.nItem === 0) {
        item.nItem = i + 1
      }
      nfe.itens.push(item)
    }
  }

  nfe.total = _parseTotal(infNFe.total)

  const infProt = root.nfeProc?.protNFe?.infProt || null
  if (infProt) {
    nfe.nProt = _get(infProt, 'nProt')
    nfe.cStat = _get(infProt, 'cStat')
  }

  const cStatProt = _get(root, 'nfeProc', 'protNFe', 'infProt', 'cStat')
  nfe.cancelada = ['101', '151', '155'].includes(cStatProt) || _hasCancelamentoEvento(root)

  if (nfe.cancelada) {
    console.warn(`[xmlReader] Documento cancelado detectado (modelo ${nfe.modelo}, numero ${nfe.nNF}) em '${filePath}'`)
  }

  return nfe
}

function _escolherTomadorCTe(infCte) {
  const toma4 = infCte?.infCteNorm?.toma4 || infCte?.infCTeNorm?.toma4 || infCte?.toma4
  if (toma4?.toma) return _parseParteCTe(toma4.toma)

  const toma3 = infCte?.infCteNorm?.toma3 || infCte?.infCTeNorm?.toma3 || infCte?.toma3
  const codigo = _get(toma3, 'toma')

  const rem = _parseParteCTe(infCte.rem)
  const exped = _parseParteCTe(infCte.exped)
  const receb = _parseParteCTe(infCte.receb)
  const dest = _parseParteCTe(infCte.dest)

  if (codigo === '0') return rem
  if (codigo === '1') return exped
  if (codigo === '2') return receb
  if (codigo === '3') return dest
  return dest.CNPJ || dest.CPF ? dest : rem
}

function _parseCTe(parsed, filePath) {
  const root = parsed
  const infCte =
    root.cteProc?.CTe?.infCte ||
    root.CTe?.infCte ||
    root.infCte ||
    root.cteOSProc?.CTeOS?.infCte ||
    root.CTeOS?.infCte
  if (!infCte) return null

  const cte = createNFe()
  cte.tipoDoc = 'CTE'

  const chaveId = infCte.$ ? (infCte.$.Id || '') : ''
  cte.chave = chaveId.startsWith('CTe') ? chaveId.slice(3) : chaveId

  const ide = infCte.ide || {}
  cte.cUF = _get(ide, 'cUF')
  cte.cNF = _get(ide, 'cCT') || _get(ide, 'cNF')
  cte.natOp = _get(ide, 'natOp')
  cte.modelo = _get(ide, 'mod')
  cte.serie = _get(ide, 'serie')
  cte.subserie = _get(ide, 'subser')
  cte.nNF = _get(ide, 'nCT') || _get(ide, 'nCTe') || _get(ide, 'nNF')
  cte.cfop = _get(ide, 'CFOP')
  cte.dhEmi = _parseDate(_get(ide, 'dhEmi'))
  cte.tpEmis = _get(ide, 'tpEmis')
  cte.finNFe = _get(ide, 'tpCTe')

  cte.emit = _parseEmitente(infCte.emit)
  cte.dest = _escolherTomadorCTe(infCte)

  const icms = _parseICMS(infCte.imp || {})
  const vPrestObj = infCte.vPrest || {}
  const totalPrest = _get(vPrestObj, 'vTPrest') || _get(vPrestObj, 'vRec') || '0'

  cte.total = createTotal()
  cte.total.vBC = icms.vBC || '0'
  cte.total.vICMS = icms.vICMS || '0'
  cte.total.vNF = totalPrest
  cte.total.vProd = totalPrest

  const item = createItem()
  item.nItem = 1
  item.cProd = 'SERVTRANSP'
  item.xProd = 'SERVICO DE TRANSPORTE'
  item.CFOP = cte.cfop || '0000'
  item.uCom = 'UN'
  item.qCom = '1'
  item.vProd = totalPrest
  item.vDesc = '0'
  item.icms = icms
  cte.itens.push(item)

  const infProt = root.cteProc?.protCTe?.infProt || root.cteOSProc?.protCTe?.infProt || null
  if (infProt) {
    cte.nProt = _get(infProt, 'nProt')
    cte.cStat = _get(infProt, 'cStat')
  }

  const cStatProt = _get(root, 'cteProc', 'protCTe', 'infProt', 'cStat') || _get(root, 'cteOSProc', 'protCTe', 'infProt', 'cStat')
  cte.cancelada = ['101', '151', '155'].includes(cStatProt) || _hasCancelamentoEvento(root)

  if (cte.cancelada) {
    console.warn(`[xmlReader] CT-e cancelado detectado (modelo ${cte.modelo}, numero ${cte.nNF}) em '${filePath}'`)
  }

  return cte
}

export async function parseXmlContent(xmlContent, sourceName = 'buffer.xml') {
  try {
    const parsed = await xml2js.parseStringPromise(xmlContent, parseOptions)

    const nfe = _parseNFe(parsed, sourceName)
    if (nfe) return nfe

    const cte = _parseCTe(parsed, sourceName)
    if (cte) return cte

    console.warn(`[xmlReader] XML sem estrutura reconhecida em '${sourceName}'`)
    return null
  } catch (err) {
    console.error(`[xmlReader] Erro ao parsear '${sourceName}':`, err.message)
    return null
  }
}

export async function parseXml(filePath) {
  try {
    const xmlContent = fs.readFileSync(filePath, 'utf8')
    return await parseXmlContent(xmlContent, filePath)
  } catch (err) {
    console.error(`[xmlReader] Erro ao ler '${filePath}':`, err.message)
    return null
  }
}

export async function lerPasta(dirPath) {
  const notas = []

  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    console.warn(`[xmlReader] Pasta nao encontrada: ${dirPath}`)
    return notas
  }

  const arquivos = fs
    .readdirSync(dirPath)
    .filter((f) => f.toLowerCase().endsWith('.xml'))
    .sort()

  console.log(`[xmlReader] Encontrados ${arquivos.length} arquivo(s) XML em '${dirPath}'`)

  for (const arquivo of arquivos) {
    const caminho = path.join(dirPath, arquivo)
    const doc = await parseXml(caminho)
    if (doc !== null) {
      notas.push(doc)
    } else {
      console.warn(`[xmlReader] Ignorado: ${arquivo}`)
    }
  }

  return notas
}
