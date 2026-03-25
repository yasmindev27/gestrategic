# Script para importar DISC resultados no Supabase
$SUPABASE_URL = "https://dwbfhfjsayrswmdzkjlb.supabase.co"
$SUPABASE_KEY = "sb_secret_0XPE0F3HQVxCzBxb9HgSlA_0TQRvhYk"
$CSV_FILE = "public\data\disc_results-export.csv"

$csvPath = (Resolve-Path $CSV_FILE).Path
if (-not (Test-Path $csvPath)) {
    Write-Host "Arquivo nao encontrado: $csvPath"
    exit 1
}

Write-Host "Lendo arquivo: $csvPath"
$lines = Get-Content $csvPath | Select-Object -Skip 1
$records = @()

foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    
    $values = $line -split ';' | ForEach-Object { $_.Trim() }
    
    if ($values.Count -lt 14) { continue }
    
    $nomeCompleto = $values[1]
    if (-not $nomeCompleto -or $nomeCompleto.Length -lt 3) { continue }
    
    $scoreD = [int]$values[7]
    $scoreI = [int]$values[8]
    $scoreS = [int]$values[9]
    $scoreC = [int]$values[10]
    $leadershipScore = [int]$values[13]
    
    if ($scoreD -lt 0 -or $scoreD -gt 24) { continue }
    if ($scoreI -lt 0 -or $scoreI -gt 24) { continue }
    if ($scoreS -lt 0 -or $scoreS -gt 24) { continue }
    if ($scoreC -lt 0 -or $scoreC -gt 24) { continue }
    if ($leadershipScore -lt 10 -or $leadershipScore -gt 50) { continue }
    
    $record = @{
        nome_completo = $nomeCompleto
        cargo_atual = $values[2]
        setor = $values[3]
        tempo_atuacao = $values[4]
        formacao = $values[5]
        experiencia_lideranca = $values[6]
        score_d = $scoreD
        score_i = $scoreI
        score_s = $scoreS
        score_c = $scoreC
        perfil_predominante = $values[11]
        perfil_secundario = $values[12]
        leadership_score = $leadershipScore
    }
    
    $records += $record
}

Write-Host "Registros encontrados: $($records.Count)"

if ($records.Count -eq 0) {
    Write-Host "Nenhum registro valido encontrado"
    exit 1
}

$body = ConvertTo-Json $records -Depth 10
Write-Host "Enviando para Supabase..."
Write-Host "URL: $SUPABASE_URL/rest/v1/disc_results"
Write-Host "Registros: $($records.Count) records"

$headers = @{
    'apikey' = $SUPABASE_KEY
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/rest/v1/disc_results" -Method POST -Headers $headers -Body $body -TimeoutSec 30
    Write-Host "Sucesso! $($records.Count) registros importados"
    Write-Host "Status: $($response.StatusCode)"
}
catch {
    Write-Host "Erro ao importar: $($_.Exception.Message)"
    Write-Host "Response Status Code: $($_.Exception.Response.StatusCode)"
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $resp = $streamReader.ReadToEnd()
        Write-Host "Response Body: $resp"
    }
    exit 1
}
