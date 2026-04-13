import fs from 'fs'
import path from 'path'
import Decimal from 'decimal.js'
import {
  registro10,
  registro11,
  registro50,
  registro53,
  registro54,
  registro61,
  registro61r,
  registro70,
  registro75,
  registro90,
  situacaoTrib,
} from './sintegraWriter.js'

/**
 * Converte string/number para Decimal de forma segura.
 */
function dec(val) {
  try {
    return new Decimal(String(val || 0))
  } catch {
    return new Decimal(0)
  }
}

/**
 * Retorna a data (YYYY-MM-DD) a partir de um objeto Date ou null.
 * Retorna string para facilitar comparacao.
 */
function dateToStr(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return null
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const day = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthYear6(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return null
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const y = String(dt.getFullYear())
  return `${m}${y}`
}

function aliqPercent(val) {
  const a = dec(val)
  if (a.gt(0) && a.lt(1)) return a.mul(100)
  return a
}

/**
 * Retorna apenas a parte da data (sem hora) de um objeto Date, em UTC.
 * Para uso em comparacoes de periodo.
 */
function getDatePart(dt) {
  if (!dt) return null
  const d = dt instanceof Date ? dt : new Date(dt)
  if (isNaN(d.getTime())) return null
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * Gerador de arquivo SINTEGRA a partir de documentos fiscais.
 */
export class GeradorSintegra {
  /**
   * @param {object} emitente  Objeto Emitente (ver models.js)
   * @param {Date} dtIni
   * @param {Date} dtFin
   */
  constructor(emitente, dtIni, dtFin, { codConvenio = '3', codNatureza = '3', codFinalidade = '1' } = {}) {
    this.emit = emitente
    this.dtIni = dtIni instanceof Date ? dtIni : new Date(dtIni)
    this.dtFin = dtFin instanceof Date ? dtFin : new Date(dtFin)
    this.codConvenio = codConvenio
    this.codNatureza = codNatureza
    this.codFinalidade = codFinalidade
  }

  /**
   * Verifica se a NF-e esta dentro do periodo configurado.
   * @param {object} nfe
   * @returns {boolean}
   */
  _noPeriodo(nfe) {
    if (!nfe.dhEmi) return true
    const dt = getDatePart(nfe.dhEmi)
    if (!dt) return true
    const ini = getDatePart(this.dtIni)
    const fin = getDatePart(this.dtFin)
    return dt >= ini && dt <= fin
  }

  /**
   * Determina se o documento é saída na perspectiva da empresa informante.
   * Prioriza comparação de CNPJ do emitente do XML com CNPJ da empresa.
   */
  _isSaida(doc) {
    const cnpjEmpresa = String(this.emit?.CNPJ || '').replace(/\D/g, '')
    const cnpjEmit = String(doc?.emit?.CNPJ || '').replace(/\D/g, '')
    if (cnpjEmpresa && cnpjEmit) {
      return cnpjEmit === cnpjEmpresa
    }
    return doc?.tpNF === '1'
  }

  /**
   * Ajusta o CFOP para a perspectiva da empresa informante.
   * XML destinado costuma vir com CFOP no sentido do emitente.
   */
  _cfopPerspectivaEmpresa(cfop, isSaida) {
    const raw = String(cfop || '').replace(/\D/g, '')
    if (!raw) return '0000'
    const cfop4 = raw.padStart(4, '0').slice(0, 4)
    const d1 = cfop4[0]
    let convertido = cfop4
    if (!isSaida && ['5', '6', '7'].includes(d1)) {
      convertido = String(Number(d1) - 4) + cfop4.slice(1)
    } else if (isSaida && ['1', '2', '3'].includes(d1)) {
      convertido = String(Number(d1) + 4) + cfop4.slice(1)
    }

    // Ajustes conhecidos para CFOPs que não possuem espelho 1:1 por subcódigo.
    // Ex.: 5405 -> 1403 e 6655 -> 2652.
    const ajustes = {
      '1405': '1403',
      '2405': '2403',
      '2655': '2652',
    }
    return ajustes[convertido] || convertido
  }

  /**
   * Gera o arquivo SINTEGRA e retorna objeto com estatisticas.
   *
   * @param {object[]} notas55  NF-e modelo 55 (entrada e saida)
   * @param {object[]} notas65  NFC-e modelo 65 (entrada e saida)
   * @param {object[]} notas57e67  CT-e/CT-e OS modelos 57/67 (entrada e saida)
   * @param {string}   caminhoSaida  Caminho completo do arquivo de saida
   * @returns {object} stats
   */
  async gerar(notas55, notas65, notas57e67, caminhoSaida) {
    const linhas = []
    const contadores = {}

    const incr = (tipo) => {
      contadores[tipo] = (contadores[tipo] || 0) + 1
    }

    // -- Tipo 10 e 11 --------------------------------------------------------
    linhas.push(registro10(this.emit, this.dtIni, this.dtFin, {
      codConvenio: this.codConvenio,
      codNatureza: this.codNatureza,
      codFinalidade: this.codFinalidade,
    }))
    incr('10')
    linhas.push(registro11(this.emit))
    incr('11')

    // -- Tipo 50 + 54: NF-e modelo 55 ----------------------------------------
    // Ordena por CNPJ da contraparte → data → número NF (exigência SINTEGRA)
    const notas55Validas = (notas55 || []).filter((n) => !n.cancelada)
    const notas55Ord = [...notas55Validas].sort((a, b) => {
      const cnpjA = (this._isSaida(a) ? a.dest?.CNPJ || a.dest?.CPF : a.emit?.CNPJ) || ''
      const cnpjB = (this._isSaida(b) ? b.dest?.CNPJ || b.dest?.CPF : b.emit?.CNPJ) || ''
      if (cnpjA !== cnpjB) return cnpjA.localeCompare(cnpjB)
      const dtA = a.dhEmi ? new Date(a.dhEmi).getTime() : 0
      const dtB = b.dhEmi ? new Date(b.dhEmi).getTime() : 0
      if (dtA !== dtB) return dtA - dtB
      return parseInt(a.nNF || '0', 10) - parseInt(b.nNF || '0', 10)
    })

    // cProd -> [xProd, ncm, uCom, aliqIpi, aliqIcms, cst]
    const produtosVistos = new Map()

    // O SINTEGRA exige que TODOS os R50 apareçam juntos, depois TODOS os R53,
    // depois TODOS os R54. Por isso coletamos em arrays separados.
    const linhas50 = []
    const linhas53 = []
    const linhas54 = []

    for (const nfe of notas55Ord) {
      if (!this._noPeriodo(nfe)) {
        console.warn(`[GeradorSintegra] NF-e n${nfe.nNF} fora do periodo - ignorada.`)
        continue
      }

      // Determina se e saida (P=proprio) ou entrada (T=terceiros)
      const isSaida = this._isSaida(nfe)
      const emitenteCode = isSaida ? 'P' : 'T'

      // CNPJ/IE/UF da contraparte para Registro 50
      let cnpjOp, ieOp, ufOp
      if (isSaida) {
        // Saida: contraparte e o destinatario
        cnpjOp = nfe.dest?.CNPJ || nfe.dest?.CPF || ''
        const indIE = nfe.dest?.indIEDest || ''
        const ieRaw = nfe.dest?.IE || ''
        // indIEDest: 1=contribuinte, 2=isento, 9=não contribuinte
        // IE vazia ou indicador de isento/não-contribuinte → 'ISENTO'
        ieOp = (ieRaw && indIE === '1') ? ieRaw : 'ISENTO'
        ufOp = nfe.dest?.enderDest?.UF || this.emit.enderEmit.UF
      } else {
        // Entrada: contraparte e o emitente do documento (fornecedor)
        cnpjOp = nfe.emit.CNPJ
        ieOp = nfe.emit.IE || 'ISENTO'
        ufOp = nfe.emit.enderEmit.UF || this.emit.enderEmit.UF
      }

      // Agrupa itens por CFOP + aliquota + situacao tributaria
      const cfopsMap = new Map()
      for (const item of nfe.itens) {
        const cfopAjustado = this._cfopPerspectivaEmpresa(item.CFOP, isSaida)
        const aliqNormalizada = aliqPercent(item.icms.pICMS).toString()
        const sit = situacaoTrib(item.icms.cst)
        const key = `${cfopAjustado}|${aliqNormalizada}|${sit}`
        if (!cfopsMap.has(key)) {
          cfopsMap.set(key, {
            cfop: cfopAjustado,
            aliq: aliqNormalizada,
            sit,
            itens: [],
          })
        }
        cfopsMap.get(key).itens.push(item)
      }

      for (const [, grupo] of cfopsMap.entries()) {
        const { cfop, itens, aliq } = grupo
        const vlTotal = itens.reduce((s, i) => s.plus(dec(i.vProd)), new Decimal(0))
        const vlBc = itens.reduce((s, i) => s.plus(dec(i.icms.vBC)), new Decimal(0))
        const vlIcms = itens.reduce((s, i) => s.plus(dec(i.icms.vICMS)), new Decimal(0))
        const vlIsen = itens.reduce((s, i) => {
          const cst = String(i.icms.cst || '').padStart(2, '0')
          return ['40', '41', '50', '60'].includes(cst) ? s.plus(dec(i.vProd)) : s
        }, new Decimal(0))
        const vlOut = Decimal.max(new Decimal(0), vlTotal.minus(vlBc).minus(vlIsen))
        linhas50.push(
          registro50({
            cnpjOp,
            ieOp,
            dtEmissao: nfe.dhEmi,
            ufOp,
            mod: nfe.modelo,
            serie: nfe.serie,
            numero: nfe.nNF,
            cfop,
            emitente: emitenteCode,
            vlTotal: vlTotal.toString(),
            vlBcIcms: vlBc.toString(),
            vlIcms: vlIcms.toString(),
            vlIsento: vlIsen.toString(),
            vlOutros: vlOut.toString(),
            aliqIcms: aliq,
          })
        )
        incr('50')

        // Registro 53 desativado temporariamente para evitar rejeições de layout no validador.

        for (const item of itens) {
          linhas54.push({
            cnpjEmit: cnpjOp,
            modelo: nfe.modelo,
            serie: nfe.serie,
            numero: nfe.nNF,
            numItem: parseInt(item.nItem || '0', 10),
            linha: registro54({
              cnpjEmit: cnpjOp,
              modelo: nfe.modelo,
              serie: nfe.serie,
              numero: nfe.nNF,
              cfop: this._cfopPerspectivaEmpresa(item.CFOP, isSaida),
              cst: item.icms.cst || '000',
              numItem: item.nItem,
              codProduto: item.cProd,
              qtd: item.qCom,
              vlProduto: item.vProd,
              vlDesconto: item.vDesc,
              vlBcIcms: item.icms.vBC,
              vlBcIcmsST: item.icms.vBCST || '0',
              vlIpi: item.ipi.vIPI || '0',
              aliqIcms: aliqPercent(item.icms.pICMS).toString(),
            }),
          })
          incr('54')

          // Apenas produtos de NF-e (modelo 55) entram no Tipo 75
          if (!produtosVistos.has(item.cProd)) {
            produtosVistos.set(item.cProd, [
              item.xProd,
              item.NCM,
              item.uCom,
              item.ipi.pIPI,
              aliqPercent(item.icms.pICMS).toString(),
              item.icms.cst,
            ])
          }
        }
      }
    }

    // Adiciona em ordem: todos R50, todos R53, todos R54
    for (const l of linhas50) linhas.push(l)
    for (const l of linhas53) linhas.push(l)
    linhas54.sort((a, b) => {
      if (a.cnpjEmit !== b.cnpjEmit) return a.cnpjEmit.localeCompare(b.cnpjEmit)
      if (a.modelo !== b.modelo) return String(a.modelo).localeCompare(String(b.modelo))
      if (a.serie !== b.serie) return String(a.serie).localeCompare(String(b.serie))
      const nA = parseInt(a.numero || '0', 10)
      const nB = parseInt(b.numero || '0', 10)
      if (nA !== nB) return nA - nB
      return a.numItem - b.numItem
    })
    for (const l of linhas54) linhas.push(l.linha)

    // -- Tipo 61 + 61R: NFC-e modelo 65 --------------------------------------
    const notas65Validas = (notas65 || []).filter((n) => !n.cancelada)
    let totalReg61 = 0
    let totalReg61R = 0

    const grupos61 = new Map() // key: "YYYY-MM-DD|serie|aliq|sit"
    const grupos61R = new Map() // key: "MMYYYY|codProduto|aliq"

    for (const nfe of notas65Validas) {
      if (!this._noPeriodo(nfe)) {
        console.warn(`[GeradorSintegra] NFC-e n${nfe.nNF} fora do periodo - ignorada.`)
        continue
      }

      const dtStr = dateToStr(nfe.dhEmi) || dateToStr(this.dtIni)
      const dtEmissao = new Date(`${dtStr}T00:00:00`)

      for (const item of nfe.itens) {
        if (!produtosVistos.has(item.cProd)) {
          produtosVistos.set(item.cProd, [
            item.xProd,
            item.NCM,
            item.uCom,
            item.ipi.pIPI,
            aliqPercent(item.icms.pICMS).toString(),
            item.icms.cst,
          ])
        }

        const sit = situacaoTrib(item.icms.cst)
        const aliq = aliqPercent(item.icms.pICMS).toString()
        const chave61 = `${dtStr}|${nfe.serie}|${aliq}|${sit}`

        if (!grupos61.has(chave61)) {
          grupos61.set(chave61, {
            dtEmissao,
            serie: nfe.serie,
            subserie: nfe.subserie || '',
            sit,
            aliq,
            numeros: [],
            vlTotal: new Decimal(0),
            vlBc: new Decimal(0),
            vlIcms: new Decimal(0),
            vlIsento: new Decimal(0),
            vlOutros: new Decimal(0),
          })
        }

        const g61 = grupos61.get(chave61)
        g61.numeros.push(parseInt(nfe.nNF || '0', 10))
        g61.vlTotal = g61.vlTotal.plus(dec(item.vProd))
        g61.vlBc = g61.vlBc.plus(dec(item.icms.vBC))
        g61.vlIcms = g61.vlIcms.plus(dec(item.icms.vICMS))
        if (['I', 'N', 'F'].includes(sit)) {
          g61.vlIsento = g61.vlIsento.plus(dec(item.vProd))
        } else {
          g61.vlOutros = g61.vlOutros.plus(dec(item.vProd).minus(dec(item.icms.vBC)))
        }

        const mesAno = monthYear6(nfe.dhEmi) || monthYear6(this.dtIni)
        const chave61r = `${mesAno}|${item.cProd}|${aliq}`
        if (!grupos61R.has(chave61r)) {
          grupos61R.set(chave61r, {
            mesAno,
            codProduto: item.cProd || 'SEM-COD',
            aliq,
            qtd: new Decimal(0),
            vlBruto: new Decimal(0),
            vlBc: new Decimal(0),
          })
        }

        const g61r = grupos61R.get(chave61r)
        g61r.qtd = g61r.qtd.plus(dec(item.qCom))
        g61r.vlBruto = g61r.vlBruto.plus(dec(item.vProd))
        const vlBcItem = dec(item.icms.vBC)
        g61r.vlBc = g61r.vlBc.plus(vlBcItem.gt(0) ? vlBcItem : dec(item.vProd))
      }
    }

    for (const [, g61] of [...grupos61.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const numIni = Math.min(...g61.numeros)
      const numFim = Math.max(...g61.numeros)
      linhas.push(
        registro61({
          dtEmissao: g61.dtEmissao,
          mod: '65',
          serie: 'U',
          subserie: g61.subserie,
          numOrdemIni: String(numIni),
          numOrdemFim: String(numFim),
          vlTotal: g61.vlTotal.toString(),
          vlBcIcms: g61.vlBc.toString(),
          vlIcms: g61.vlIcms.toString(),
          vlIsento: g61.vlIsento.toString(),
          vlOutros: g61.vlOutros.toString(),
          aliqIcms: g61.aliq,
        })
      )
      incr('61')
      totalReg61 += 1
    }

    for (const [, g61r] of [...grupos61R.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      linhas.push(
        registro61r({
          mesAno: g61r.mesAno,
          codProduto: g61r.codProduto,
          qtd: g61r.qtd.toString(),
          vlBruto: g61r.vlBruto.toString(),
          vlBcIcms: g61r.vlBc.toString(),
          aliqIcms: g61r.aliq,
        })
      )
      incr('61')
      totalReg61R += 1
    }

    // -- Tipo 70: CT-e / CT-e OS (modelos 57 e 67) ---------------------------
    const notasTransporteValidas = (notas57e67 || []).filter((n) => !n.cancelada)

    for (const doc of notasTransporteValidas) {
      if (!this._noPeriodo(doc)) {
        console.warn(`[GeradorSintegra] Documento transporte n${doc.nNF} fora do periodo - ignorado.`)
        continue
      }

      const emitCnpj = String(doc.emit?.CNPJ || '').replace(/\D/g, '')
      const empresaCnpj = String(this.emit?.CNPJ || '').replace(/\D/g, '')
      const isSaida = emitCnpj && empresaCnpj && emitCnpj === empresaCnpj

      let cnpjOp
      let ieOp
      let ufOp
      if (isSaida) {
        cnpjOp = doc.dest?.CNPJ || doc.dest?.CPF || ''
        ieOp = doc.dest?.IE || 'ISENTO'
        ufOp = doc.dest?.enderDest?.UF || this.emit.enderEmit.UF
      } else {
        cnpjOp = doc.emit?.CNPJ || ''
        ieOp = doc.emit?.IE || 'ISENTO'
        ufOp = doc.emit?.enderEmit?.UF || this.emit.enderEmit.UF
      }

      const vlTotal = dec(doc.total?.vNF || doc.total?.vProd || '0')
      const vlBc = dec(doc.total?.vBC || doc.itens?.[0]?.icms?.vBC || '0')
      const vlIcms = dec(doc.total?.vICMS || doc.itens?.[0]?.icms?.vICMS || '0')
      const vlIsento = new Decimal(0)
      const vlOutros = Decimal.max(new Decimal(0), vlTotal.minus(vlBc))

      linhas.push(
        registro70({
          cnpjOp,
          ieOp,
          dtEmissao: doc.dhEmi,
          ufOp,
          mod: doc.modelo,
          serie: doc.serie,
          subserie: doc.subserie || '',
          numero: doc.nNF,
          cfop: doc.cfop || doc.itens?.[0]?.CFOP || '0000',
          vlTotal: vlTotal.toString(),
          vlBcIcms: vlBc.toString(),
          vlIcms: vlIcms.toString(),
          vlIsento: vlIsento.toString(),
          vlOutros: vlOutros.toString(),
          cifFob: '1',
        })
      )
      incr('70')
    }

    // -- Tipo 75: produtos unicos do periodo (55 e 65) ------------------------
    const produtosOrdenados = [...produtosVistos.entries()].sort((a, b) =>
      a[0].localeCompare(b[0])
    )

    for (const [cod, [xProd, ncm, uCom, aliqIpi, aliqIcms, cst]] of produtosOrdenados) {
      linhas.push(
        registro75({
          dtIni: this.dtIni,
          dtFin: this.dtFin,
          codProduto: cod,
          ncm,
          descProduto: xProd,
          unidade: uCom,
          sitTrib: cst || '0',
          aliqIpi: aliqIpi || '0',
          aliqIcms: aliqIcms || '0',
        })
      )
      incr('75')
    }

    // -- Tipo 90: totalizador -------------------------------------------------
    const totalSem90 = Object.values(contadores).reduce((s, v) => s + v, 0)

    // Tipos 10 e 11 nao devem ser informados individualmente no R90
    const contadores90 = { ...contadores }
    delete contadores90['10']
    delete contadores90['11']

    // num_regs_90 = ceil(len(contadores90) / 9) - precisa incluir codigo 99 tambem
    const totalTypes = Object.keys(contadores90).length + 1 // +1 para o "99"
    const numRegs90 = Math.max(1, Math.ceil(totalTypes / 9))
    // '99' = total de todos os registros no arquivo (incluindo R10, R11 e R90)
    contadores90['99'] = totalSem90 + numRegs90

    const regs90 = registro90(this.emit.CNPJ, this.emit.IE, contadores90, numRegs90)
    for (const r of regs90) {
      linhas.push(r)
    }

    // -- Escrita do arquivo em latin-1, CRLF ----------------------------------
    const dirSaida = path.dirname(caminhoSaida)
    if (!fs.existsSync(dirSaida)) {
      fs.mkdirSync(dirSaida, { recursive: true })
    }

    // Converte para Buffer latin-1 (ISO-8859-1)
    // Sem CRLF final para evitar linha vazia apos o registro 90
    const conteudo = linhas.join('\r\n')
    const buf = Buffer.from(conteudo, 'latin1')
    fs.writeFileSync(caminhoSaida, buf)

    const stats = {
      reg10: contadores['10'] || 0,
      reg11: contadores['11'] || 0,
      reg50: contadores['50'] || 0,
      reg53: contadores['53'] || 0,
      reg54: contadores['54'] || 0,
      reg61: totalReg61,
      reg61R: totalReg61R,
      reg70: contadores['70'] || 0,
      reg75: contadores['75'] || 0,
      reg90: regs90.length,
      total: linhas.length,
    }

    console.log('[GeradorSintegra] Arquivo gerado:', caminhoSaida)
    console.log('[GeradorSintegra] Stats:', stats)

    return stats
  }
}
