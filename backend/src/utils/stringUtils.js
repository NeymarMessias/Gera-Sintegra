export function removeAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function somenteDigitos(str) {
  return (str || '').replace(/\D/g, '')
}

// Mapa IBGE → sigla UF (para normalizar uf numérico vindo do banco/XML)
const IBGE_PARA_UF = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA',
  '16': 'AP', '17': 'TO', '21': 'MA', '22': 'PI', '23': 'CE',
  '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL', '28': 'SE',
  '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP',
  '41': 'PR', '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT',
  '52': 'GO', '53': 'DF',
}

/**
 * Garante que o valor de UF é sempre a sigla de 2 letras (ex: "MG").
 * Aceita tanto "MG" quanto o código IBGE "31".
 */
export function normalizarUF(valor) {
  const v = String(valor || '').trim().toUpperCase()
  if (v.length === 2 && /^[A-Z]{2}$/.test(v)) return v // já é sigla
  return IBGE_PARA_UF[v] || v
}
