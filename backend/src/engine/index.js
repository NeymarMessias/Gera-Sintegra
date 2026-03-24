import fs from 'fs'
import path from 'path'
import Decimal from 'decimal.js'
import {
  registro10,
  registro11,
  registro50,
  registro53,
  registro54,
  registro60m,
  registro60a,
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
 * Gerador de arquivo SINTEGRA a partir de listas de NF-e (modelo 55) e NFC-e (modelo 65).
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
   * Gera o arquivo SINTEGRA e retorna objeto com estatisticas.
   *
   * @param {object[]} notas55  NF-e modelo 55 (entrada e saida)
   * @param {object[]} notas65  NFC-e modelo 65 (saida)
   * @param {string}   caminhoSaida  Caminho completo do arquivo de saida
   * @returns {object} stats
   */
  async gerar(notas55, notas65, caminhoSaida) {
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
    const notas55Ord = [...notas55].sort((a, b) => {
      const cnpjA = (a.tpNF === '1' ? a.dest?.CNPJ || a.dest?.CPF : a.emit?.CNPJ) || ''
      const cnpjB = (b.tpNF === '1' ? b.dest?.CNPJ || b.dest?.CPF : b.emit?.CNPJ) || ''
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
      const isSaida = nfe.tpNF === '1'
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

      // Agrupa itens por CFOP
      const cfopsMap = new Map()
      for (const item of nfe.itens) {
        const cfop = item.CFOP
        if (!cfopsMap.has(cfop)) cfopsMap.set(cfop, [])
        cfopsMap.get(cfop).push(item)
      }

      for (const [cfop, itens] of cfopsMap.entries()) {
        const vlTotal = itens.reduce((s, i) => s.plus(dec(i.vProd)), new Decimal(0))
        const vlBc = itens.reduce((s, i) => s.plus(dec(i.icms.vBC)), new Decimal(0))
        const vlIcms = itens.reduce((s, i) => s.plus(dec(i.icms.vICMS)), new Decimal(0))
        const vlIsen = itens.reduce((s, i) => {
          const cst = String(i.icms.cst || '').padStart(2, '0')
          return ['40', '41', '50', '60'].includes(cst) ? s.plus(dec(i.vProd)) : s
        }, new Decimal(0))
        const vlOut = Decimal.max(new Decimal(0), vlTotal.minus(vlBc).minus(vlIsen))
        const aliq = dec(itens[0].icms.pICMS).toString()

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

        // Tipo 53: apenas quando há ICMS-ST (vBCST > 0) no grupo de CFOP
        const vlBcST = itens.reduce((s, i) => s.plus(dec(i.icms.vBCST)), new Decimal(0))
        const vlIcmsST = itens.reduce((s, i) => s.plus(dec(i.icms.vICMSST)), new Decimal(0))

        if (vlBcST.gt(0)) {
          linhas53.push(
            registro53({
              cnpjOp,
              ieOp,
              dtEmissao: nfe.dhEmi,
              ufOp,
              mod: nfe.modelo,
              serie: nfe.serie,
              numero: nfe.nNF,
              cfop,
              emitente: emitenteCode,
              vlBcIcmsST: vlBcST.toString(),
              vlIcmsST: vlIcmsST.toString(),
            })
          )
          incr('53')
        }

        for (const item of itens) {
          linhas54.push(
            registro54({
              cnpjEmit: cnpjOp,
              modelo: nfe.modelo,
              serie: nfe.serie,
              numero: nfe.nNF,
              cfop: item.CFOP,
              cst: item.icms.cst || '000',
              numItem: item.nItem,
              codProduto: item.cProd,
              qtd: item.qCom,
              vlProduto: item.vProd,
              vlDesconto: item.vDesc,
              vlBcIcms: item.icms.vBC,
              vlBcIcmsST: item.icms.vBCST || '0',
              vlIpi: item.ipi.vIPI || '0',
              aliqIcms: item.icms.pICMS,
            })
          )
          incr('54')

          // Apenas produtos de NF-e (modelo 55) entram no Tipo 75
          if (!produtosVistos.has(item.cProd)) {
            produtosVistos.set(item.cProd, [
              item.xProd,
              item.NCM,
              item.uCom,
              item.ipi.pIPI,
              item.icms.pICMS,
              item.icms.cst,
            ])
          }
        }
      }
    }

    // Adiciona em ordem: todos R50, todos R53, todos R54
    for (const l of linhas50) linhas.push(l)
    for (const l of linhas53) linhas.push(l)
    for (const l of linhas54) linhas.push(l)

    // -- Tipo 60M + 60A: NFC-e modelo 65 -------------------------------------
    // Agrupa por (dateStr, serie)
    const grupos65 = new Map() // key: "YYYY-MM-DD|serie" -> { dt, serie, notas[] }

    for (const nfe of notas65) {
      if (!this._noPeriodo(nfe)) {
        console.warn(`[GeradorSintegra] NFC-e n${nfe.nNF} fora do periodo - ignorada.`)
        continue
      }

      const dtStr = dateToStr(nfe.dhEmi) || dateToStr(this.dtIni)
      const key = `${dtStr}|${nfe.serie}`

      if (!grupos65.has(key)) {
        grupos65.set(key, { dtStr, serie: nfe.serie, notas: [] })
      }
      grupos65.get(key).notas.push(nfe)
    }

    // Contador CRZ por serie
    const crzPorSerie = new Map()

    // Ordena os grupos por chave (dtStr|serie)
    const gruposOrdenados = [...grupos65.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    for (const [, grupo] of gruposOrdenados) {
      const { dtStr, serie, notas } = grupo

      crzPorSerie.set(serie, (crzPorSerie.get(serie) || 0) + 1)
      const crz = crzPorSerie.get(serie)

      const nfNums = notas.map((n) => parseInt(n.nNF || '0', 10))
      const cooIni = Math.min(...nfNums)
      const cooFim = Math.max(...nfNums)

      // dtEmissao para os registros 60: usar Date a partir do dtStr
      const dtEmissao = new Date(dtStr + 'T00:00:00')

      // 60A: agrupa itens por situacao tributaria usando vProd (nao vBC)
      // O total do 60M deve ser igual a soma dos 60A
      const aliqMap = new Map() // key: "sit|aliq" -> { sit, aliq, vlAcum }

      for (const nfe of notas) {
        for (const item of nfe.itens) {
          const sit = situacaoTrib(item.icms.cst)
          const aliq = dec(item.icms.pICMS).toString()
          const mapKey = `${sit}|${aliq}`

          if (!aliqMap.has(mapKey)) {
            aliqMap.set(mapKey, { sit, aliq, vlAcum: new Decimal(0) })
          }
          aliqMap.get(mapKey).vlAcum = aliqMap.get(mapKey).vlAcum.plus(dec(item.vProd))
        }
      }

      // vlVendaBruta = soma de todos os 60A (garante consistencia com o validador)
      const vlBruta = [...aliqMap.values()].reduce((s, v) => s.plus(v.vlAcum), new Decimal(0))

      linhas.push(
        registro60m({
          dtEmissao,
          numSerie: serie,
          numOrdem: crz,
          modelo: '2D',
          cooIni: String(cooIni),
          cooFim: String(cooFim),
          crz,
          cro: 1,
          vlVendaBruta: vlBruta.toString(),
          vlTotGeral: vlBruta.toString(),
        })
      )
      incr('60')

      // Ordena por chave (sit|aliq)
      const aliqEntries = [...aliqMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))

      for (const [, { sit, aliq, vlAcum }] of aliqEntries) {
        linhas.push(
          registro60a({
            dtEmissao,
            numSerie: serie,
            sit,
            aliqIcms: aliq,
            vlAcumulado: vlAcum.toString(),
          })
        )
        incr('60')
      }
    }

    // -- Tipo 75: produtos unicos (somente de NF-e modelo 55) -----------------
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
      reg60: contadores['60'] || 0,
      reg75: contadores['75'] || 0,
      reg90: regs90.length,
      total: linhas.length,
    }

    console.log('[GeradorSintegra] Arquivo gerado:', caminhoSaida)
    console.log('[GeradorSintegra] Stats:', stats)

    return stats
  }
}
