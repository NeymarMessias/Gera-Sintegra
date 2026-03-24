import { useState, useEffect, useRef } from 'react'
import { Upload, FileX, CheckCircle, AlertCircle, Download, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Archive, Files } from 'lucide-react'
import {
  createGeneration,
  uploadFiles,
  uploadZip,
  runGeneration,
  getGeneration,
} from '../../api/sintegra.api.js'
import { listCompanies } from '../../api/companies.api.js'
import { downloadGeneration } from '../../api/sintegra.api.js'
import { useAuth } from '../../hooks/useAuth.js'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function formatMonthDisplay(yearMonth) {
  if (!yearMonth) return ''
  const [year, month] = yearMonth.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]}/${year}`
}

function monthToPeriod(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0) // último dia do mês
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { periodStart: fmt(start), periodEnd: fmt(end) }
}

function defaultMonth() {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function FileUploadArea({ label, description, files, onChange }) {
  const inputRef = useRef(null)

  function handleChange(e) {
    const newFiles = Array.from(e.target.files || [])
    onChange((prev) => {
      const existingNames = prev.map((f) => f.name)
      const filtered = newFiles.filter((f) => !existingNames.includes(f.name))
      return [...prev, ...filtered]
    })
    // reset input so same files can be added after removal
    e.target.value = ''
  }

  function removeFile(name) {
    onChange((prev) => prev.filter((f) => f.name !== name))
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          Adicionar XMLs
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {files.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-blue-300 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Clique ou arraste arquivos XML aqui</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
          {files.map((file) => (
            <div key={file.name} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded-lg text-xs">
              <span className="text-gray-700 truncate flex-1 mr-2">{file.name}</span>
              <button
                onClick={() => removeFile(file.name)}
                className="text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                <FileX size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">{files.length} arquivo(s) selecionado(s)</p>
    </div>
  )
}

function ZipUploadArea({ file, onChange }) {
  const inputRef = useRef(null)

  function handleChange(e) {
    const f = e.target.files?.[0]
    if (f) onChange(f)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Arquivo compactado com todos os XMLs</p>
            <p className="text-xs text-gray-500">
              Aceita <strong>.zip</strong> e <strong>.rar</strong> — pode conter NF-e entrada/saída (mod. 55) e NFC-e (mod. 65) misturados.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload size={14} />
            Selecionar arquivo
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".zip,.rar"
            className="hidden"
            onChange={handleChange}
          />
        </div>

        {!file ? (
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Archive size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Clique ou arraste o arquivo .zip ou .rar aqui</p>
            <p className="text-xs text-gray-300 mt-1">Até 200 MB</p>
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2">
              <Archive size={16} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">{file.name}</p>
                <p className="text-xs text-blue-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={() => onChange(null)}
              className="text-blue-300 hover:text-red-500 flex-shrink-0"
            >
              <FileX size={16} />
            </button>
          </div>
        )}
      </div>

      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700 font-medium mb-1">Como funciona a classificação automática:</p>
        <ul className="text-xs text-blue-600 list-disc list-inside space-y-0.5">
          <li>Modelo 55 + tpNF=0 → NF-e de entrada</li>
          <li>Modelo 55 + tpNF=1 → NF-e de saída</li>
          <li>Modelo 65 → NFC-e de saída</li>
          <li>XMLs inválidos ou não reconhecidos são ignorados</li>
        </ul>
      </div>
    </div>
  )
}

function StepIndicator({ current }) {
  const steps = [
    { num: 1, label: 'Configuração' },
    { num: 2, label: 'Upload de XMLs' },
    { num: 3, label: 'Resultado' },
  ]

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className={[
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
              current === step.num
                ? 'bg-blue-600 text-white'
                : current > step.num
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500',
            ].join(' ')}>
              {current > step.num ? <CheckCircle size={14} /> : step.num}
            </div>
            <span className={[
              'text-sm font-medium',
              current === step.num ? 'text-blue-600' : current > step.num ? 'text-green-600' : 'text-gray-400',
            ].join(' ')}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <ChevronRight size={16} className="text-gray-300 mx-1" />
          )}
        </div>
      ))}
    </div>
  )
}

export default function GeneratePage() {
  const { user } = useAuth()
  const isMaster = user?.role === 'MASTER'

  const [step, setStep] = useState(1)

  // Step 1
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [codFinalidade, setCodFinalidade] = useState('1')
  const [codConvenio, setCodConvenio] = useState('3')
  const [codNatureza, setCodNatureza] = useState('3')
  const [step1Errors, setStep1Errors] = useState({})

  // Step 2
  const [uploadMode, setUploadMode] = useState('individual') // 'individual' | 'zip'
  const [entradaFiles, setEntradaFiles] = useState([])
  const [saida55Files, setSaida55Files] = useState([])
  const [saida65Files, setSaida65Files] = useState([])
  const [zipFile, setZipFile] = useState(null)
  const [zipClassificacao, setZipClassificacao] = useState(null) // resultado da classificação
  const [uploadError, setUploadError] = useState('')

  // Step 3
  const [processing, setProcessing] = useState(false)
  const [generationId, setGenerationId] = useState(null)
  const [result, setResult] = useState(null)
  const [resultError, setResultError] = useState('')
  const [errorDetails, setErrorDetails] = useState('')
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)

  useEffect(() => {
    if (isMaster) {
      listCompanies()
        .then(setCompanies)
        .catch(console.error)
    }
  }, [isMaster])

  function validateStep1() {
    const errs = {}
    if (isMaster && !selectedCompanyId) errs.company = 'Selecione uma empresa.'
    if (!selectedMonth) errs.month = 'Selecione o mês de referência.'
    return errs
  }

  function handleNextStep1() {
    const errs = validateStep1()
    if (Object.keys(errs).length > 0) {
      setStep1Errors(errs)
      return
    }
    setStep1Errors({})
    setStep(2)
  }

  async function handleGenerate() {
    setUploadError('')
    setProcessing(false)
    setResult(null)
    setResultError('')
    setStep(3)
    setProcessing(true)

    try {
      const { periodStart, periodEnd } = monthToPeriod(selectedMonth)
      const companyId = isMaster ? selectedCompanyId : user?.company?.id
      const gen = await createGeneration({
        companyId,
        periodStart,
        periodEnd,
      })
      const id = gen.id
      setGenerationId(id)

      if (uploadMode === 'zip') {
        // Upload do ZIP — classificação automática
        await uploadZip(id, zipFile)
      } else {
        // Upload individual por tipo
        const uploads = []
        if (entradaFiles.length > 0) uploads.push(uploadFiles(id, entradaFiles, 'entrada_55'))
        if (saida55Files.length > 0) uploads.push(uploadFiles(id, saida55Files, 'saida_55'))
        if (saida65Files.length > 0) uploads.push(uploadFiles(id, saida65Files, 'saida_65'))
        await Promise.all(uploads)
      }

      // Run generation — captura alertas de CNPJ retornados pelo servidor
      const runResult = await runGeneration(id, { codFinalidade, codConvenio, codNatureza })
      const alertasCnpj = runResult?.alertasCnpj || []

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const genData = await getGeneration(id)
          if (genData.status === 'DONE') {
            clearInterval(poll)
            setProcessing(false)
            setResult({ ...genData, alertasCnpj })
          } else if (genData.status === 'ERROR') {
            clearInterval(poll)
            setProcessing(false)
            const msg = genData.errorMsg || 'Ocorreu um erro durante o processamento.'
            setResultError(msg)
            setErrorDetails(msg)
          }
        } catch (err) {
          clearInterval(poll)
          setProcessing(false)
          setResultError('Erro ao verificar status da geração.')
        }
      }, 2000)

      // Cleanup after 5 minutes max — uses functional setter to avoid stale closure
      setTimeout(() => {
        clearInterval(poll)
        setProcessing((current) => {
          if (current) {
            setResultError('Tempo limite de processamento excedido. Verifique o histórico.')
            return false
          }
          return current
        })
      }, 300000)

    } catch (err) {
      setProcessing(false)
      const data = err?.response?.data
      const serverMsg = data?.error || data?.message
      const rawData = data ? (typeof data === 'string' ? data : JSON.stringify(data, null, 2)) : null
      const msg = serverMsg || rawData || err?.message || 'Erro ao iniciar geração do SINTEGRA.'
      setResultError(msg)
      setErrorDetails(rawData || err?.message || msg)
    }
  }

  async function handleDownload() {
    if (!generationId && !result?.id) return
    const id = result?.id || generationId
    setDownloadLoading(true)
    try {
      const blob = await downloadGeneration(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const periodDate = result?.periodStart ? new Date(result.periodStart) : null
      const mes = periodDate ? String(periodDate.getUTCMonth() + 1).padStart(2, '0') : '00'
      const ano = periodDate ? periodDate.getUTCFullYear() : '0000'
      a.download = `sintegra_${mes}_${ano}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Erro ao baixar:', err)
    } finally {
      setDownloadLoading(false)
    }
  }

  function handleReset() {
    setStep(1)
    setSelectedCompanyId('')
    setSelectedMonth(defaultMonth())
    setCodFinalidade('1')
    setCodConvenio('3')
    setCodNatureza('3')
    setStep1Errors({})
    setUploadMode('individual')
    setEntradaFiles([])
    setSaida55Files([])
    setSaida65Files([])
    setZipFile(null)
    setZipClassificacao(null)
    setUploadError('')
    setProcessing(false)
    setGenerationId(null)
    setResult(null)
    setResultError('')
    setErrorDetails('')
    setShowErrorDetails(false)
  }

  function formatPeriodDisplay(start, end) {
    if (!start || !end) return formatMonthDisplay(selectedMonth)
    try {
      const [sy, sm] = start.slice(0, 7).split('-').map(Number)
      return `${MONTH_NAMES[sm - 1]}/${sy}`
    } catch {
      return formatMonthDisplay(selectedMonth)
    }
  }

  return (
    <div className="max-w-2xl">
      <StepIndicator current={step} />

      {/* Step 1 */}
      {step === 1 && (
        <Card title="Configuração da Geração">
          <div className="p-6 flex flex-col gap-5">
            {isMaster && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Empresa *
                </label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className={[
                    'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
                    step1Errors.company
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                  ].join(' ')}
                >
                  <option value="">Selecione uma empresa...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {step1Errors.company && (
                  <p className="text-xs text-red-600 mt-1">{step1Errors.company}</p>
                )}
              </div>
            )}

            {!isMaster && user?.company && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-700">
                  Empresa: <strong>{user.company.name}</strong>
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Mês de Referência *
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={[
                  'w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors',
                  step1Errors.month
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
                ].join(' ')}
              />
              {selectedMonth && (
                <p className="text-xs text-gray-500 mt-1">
                  Período: 01/{selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                  {' '}até{' '}
                  {new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]), 0).getDate()}/
                  {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                </p>
              )}
              {step1Errors.month && (
                <p className="text-xs text-red-600 mt-1">{step1Errors.month}</p>
              )}
            </div>

            {/* Configurações SINTEGRA */}
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Configurações SINTEGRA</p>
              <div className="flex flex-col gap-3">

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Finalidade do Arquivo
                  </label>
                  <select
                    value={codFinalidade}
                    onChange={(e) => setCodFinalidade(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="1">1 - Normal</option>
                    <option value="2">2 - Retificação Total</option>
                    <option value="3">3 - Retificação Aditiva</option>
                    <option value="5">5 - Desfazimento</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Identificação do Convênio
                  </label>
                  <select
                    value={codConvenio}
                    onChange={(e) => setCodConvenio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="1">1 - Convênio ICMS 57/95 (original)</option>
                    <option value="2">2 - Convênio ICMS 69/02 e 142/02</option>
                    <option value="3">3 - Convênio ICMS 76/03 e 20/04</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Natureza das Operações
                  </label>
                  <select
                    value={codNatureza}
                    onChange={(e) => setCodNatureza(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="1">1 - Somente com débito do imposto</option>
                    <option value="2">2 - Somente com crédito do imposto</option>
                    <option value="3">3 - Totalidade das operações do informante</option>
                  </select>
                </div>

              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleNextStep1}>
                Próximo
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card title="Upload de Arquivos XML">
          <div className="p-6 flex flex-col gap-5">
            {/* Period summary */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              Mês de referência: <strong>{formatMonthDisplay(selectedMonth)}</strong>
              {isMaster && selectedCompanyId && (
                <> &bull; Empresa: <strong>{companies.find(c => c.id === selectedCompanyId)?.name}</strong></>
              )}
              {!isMaster && user?.company && (
                <> &bull; Empresa: <strong>{user.company.name}</strong></>
              )}
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                className={[
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors',
                  uploadMode === 'individual'
                    ? 'bg-white shadow text-blue-700'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
                onClick={() => { setUploadMode('individual'); setZipFile(null); setZipClassificacao(null) }}
              >
                <Files size={15} />
                Arquivos individuais
              </button>
              <button
                className={[
                  'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors',
                  uploadMode === 'zip'
                    ? 'bg-white shadow text-blue-700'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
                onClick={() => { setUploadMode('zip'); setEntradaFiles([]); setSaida55Files([]); setSaida65Files([]) }}
              >
                <Archive size={15} />
                Arquivo ZIP
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {uploadError}
              </div>
            )}

            {/* Individual mode */}
            {uploadMode === 'individual' && (
              <>
                <FileUploadArea
                  label="XMLs de Entrada (Modelo 55)"
                  description="Notas recebidas de fornecedores (NF-e de entrada)"
                  files={entradaFiles}
                  onChange={setEntradaFiles}
                />
                <FileUploadArea
                  label="XMLs de Saída (Modelo 55)"
                  description="NF-e emitidas pela empresa"
                  files={saida55Files}
                  onChange={setSaida55Files}
                />
                <FileUploadArea
                  label="XMLs de Saída (Modelo 65)"
                  description="NFC-e emitidas pela empresa"
                  files={saida65Files}
                  onChange={setSaida65Files}
                />
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    Pelo menos um grupo de arquivos deve ser informado para gerar o SINTEGRA.
                  </p>
                </div>
              </>
            )}

            {/* ZIP mode */}
            {uploadMode === 'zip' && (
              <ZipUploadArea
                file={zipFile}
                classificacao={zipClassificacao}
                onChange={(f) => { setZipFile(f); setZipClassificacao(null) }}
              />
            )}

            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>
                <ChevronLeft size={16} />
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={
                  uploadMode === 'individual'
                    ? entradaFiles.length === 0 && saida55Files.length === 0 && saida65Files.length === 0
                    : !zipFile
                }
              >
                Gerar SINTEGRA
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card title="Resultado da Geração">
          <div className="p-6 flex flex-col items-center gap-6">
            {processing && (
              <div className="flex flex-col items-center gap-4 py-8">
                <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div className="text-center">
                  <p className="text-base font-medium text-gray-900">Processando SINTEGRA...</p>
                  <p className="text-sm text-gray-500 mt-1">Aguarde enquanto os arquivos são processados.</p>
                </div>
                {/* Progress bar indeterminate */}
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-2 bg-blue-600 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}

            {!processing && result && (
              <div className="w-full flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <CheckCircle size={32} className="text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-base font-semibold text-gray-900">SINTEGRA gerado com sucesso!</p>
                    <p className="text-sm text-gray-500">
                      Referência: {formatPeriodDisplay(result.periodStart, result.periodEnd)}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                {result.stats && Object.keys(result.stats).length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registros gerados</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {Object.entries(result.stats).map(([tipo, count]) => (
                        <div key={tipo} className="flex items-center justify-between px-4 py-2 text-sm">
                          <span className="text-gray-600 font-medium">{tipo}</span>
                          <span className="text-gray-900 font-bold">{count}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-4 py-2 text-sm bg-blue-50">
                        <span className="text-blue-700 font-semibold">Total</span>
                        <span className="text-blue-900 font-bold">
                          {Object.values(result.stats).reduce((acc, v) => acc + (Number(v) || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {result.alertasCnpj && result.alertasCnpj.length > 0 && (
                  <div className="border border-yellow-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-50 border-b border-yellow-200">
                      <AlertCircle size={15} className="text-yellow-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-yellow-800">
                        {result.alertasCnpj.length} nota(s) com CNPJ emitente diferente da empresa cadastrada
                      </p>
                    </div>
                    <div className="divide-y divide-yellow-100 max-h-36 overflow-y-auto">
                      {result.alertasCnpj.map((a, i) => (
                        <div key={i} className="px-4 py-2 text-xs text-yellow-700 flex justify-between gap-4">
                          <span>NF {a.nNF}/{a.serie} mod.{a.modelo}</span>
                          <span className="font-mono">XML: {a.cnpjXml} | Empresa: {a.cnpjEmpresa}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 justify-center">
                  <Button variant="primary" loading={downloadLoading} onClick={handleDownload}>
                    <Download size={16} />
                    Baixar Arquivo SINTEGRA
                  </Button>
                  <Button variant="secondary" onClick={handleReset}>
                    Nova Geração
                  </Button>
                </div>
              </div>
            )}

            {!processing && resultError && (
              <div className="w-full flex flex-col gap-4">
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-red-800">Erro ao gerar SINTEGRA</p>
                    <p className="text-sm text-red-700 mt-1 break-words">{resultError}</p>
                  </div>
                </div>

                {errorDetails && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                      onClick={() => setShowErrorDetails((v) => !v)}
                    >
                      <span>Detalhes técnicos</span>
                      {showErrorDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showErrorDetails && (
                      <div className="p-4 bg-gray-900">
                        <pre className="text-xs text-green-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
                          {errorDetails}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <p className="text-xs text-yellow-800 font-medium mb-1">Causas comuns de erro:</p>
                  <ul className="text-xs text-yellow-700 list-disc list-inside space-y-0.5">
                    <li>Arquivo XML corrompido ou não é uma NF-e/NFC-e válida</li>
                    <li>XML de teste ou cancelado sem dados completos</li>
                    <li>Dados do emitente ausentes no XML (CNPJ, IE, endereço)</li>
                    <li>Empresa sem CNPJ ou IE cadastrados</li>
                  </ul>
                </div>

                <div className="flex justify-center gap-3">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    <ChevronLeft size={16} />
                    Voltar
                  </Button>
                  <Button variant="primary" onClick={handleReset}>
                    Tentar novamente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
