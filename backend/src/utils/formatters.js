import Decimal from 'decimal.js'
import { removeAcentos, somenteDigitos } from './stringUtils.js'

const TAMANHO = 126

/**
 * Alfanumérico: alinhado à esquerda, preenchido com espaços, sem acentos, maiúsculo.
 */
export function alfa(valor, tamanho) {
  const texto = removeAcentos(String(valor || '').toUpperCase())
  return texto.substring(0, tamanho).padEnd(tamanho)
}

/**
 * Numérico: alinhado à direita, preenchido com zeros.
 * Se decimais > 0, multiplica por 10^decimais antes de arredondar.
 */
export function num(valor, tamanho, decimais = 0) {
  try {
    const dec = new Decimal(String(valor || 0))
    let inteiro
    if (decimais) {
      inteiro = dec.mul(Math.pow(10, decimais)).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).abs().toNumber()
    } else {
      inteiro = dec.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).abs().toNumber()
    }
    return String(Math.round(inteiro)).slice(0, tamanho).padStart(tamanho, '0')
  } catch {
    return '0'.repeat(tamanho)
  }
}

/**
 * Formata Date ou string ISO para AAAAMMDD.
 * Usa UTC para evitar shift de fuso horário em datas vindas do banco.
 */
export function data(dt) {
  if (!dt) return '00000000'
  const d = dt instanceof Date ? dt : new Date(dt)
  if (isNaN(d.getTime())) return '00000000'
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * CNPJ: somente dígitos, 14 posições, preenchido com zeros.
 */
export function cnpj(valor) {
  return num(somenteDigitos(valor), 14)
}

/**
 * Número de dígitos da IE por UF.
 * Estados não listados usam 9 (padrão mais comum).
 */
const IE_DIGITOS_POR_UF = {
  MG: 13,
  SP: 12,
  MT: 11,
  RS: 10,
  PR: 10,
  RJ:  8,
  // 9 dígitos: AC AL AP AM BA CE DF ES GO MA MS PA PB PE PI RN RO RR SC SE TO
}

/**
 * Inscrição Estadual para Registro 50/53: campo de 14 chars.
 * - Numérico  → pad com zeros à esquerda até o tamanho correto da UF,
 *               depois completa com espaços até 14 (nenhuma IE tem 14 dígitos)
 * - Com letras (ex: "ISENTO") → alinha à esquerda com espaços até 14
 */
export function ie(valor, uf = '') {
  const v = removeAcentos(String(valor || '').toUpperCase().trim())
  const digits = somenteDigitos(v)
  if (v === '' || v !== digits) {
    // Contém letras (ex: "ISENTO") → alfa padrão
    return v.substring(0, 14).padEnd(14)
  }
  const estado = String(uf || '').toUpperCase().trim().slice(0, 2)
  const numDigitos = IE_DIGITOS_POR_UF[estado] ?? 9
  // Pad numérico ao tamanho do estado, depois preenche o restante com espaços
  return digits.slice(-numDigitos).padStart(numDigitos, '0').padEnd(14)
}

/**
 * Valida que o registro tem exatamente TAMANHO (126) chars.
 */
export function validar(registro, tipo) {
  if (registro.length !== TAMANHO) {
    throw new Error(`Registro Tipo ${tipo} tem ${registro.length} chars, esperado ${TAMANHO}`)
  }
}
