$files = @(
    "public\data\disc_results-export.csv"
)

foreach ($csvPath in $files) {
    if (-not (Test-Path $csvPath)) {
        Write-Host "Arquivo não encontrado: $csvPath"
        continue
    }

    Write-Host "═══════════════════════════════════════"
    Write-Host "Importando: $csvPath"
    Write-Host "═══════════════════════════════════════"

    # Ler arquivo com encoding UTF-8 correto
    $lines = Get-Content $csvPath -Encoding UTF8 | Select-Object -Skip 1
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

    Write-Host "Registros: $($records.Count) encontrados"

    if ($records.Count -eq 0) { continue }

    $SUPABASE_URL = "https://dwbfhfjsayrswmdzkjlb.supabase.co"
    $SUPABASE_KEY = "sb_secret_0XPE0F3HQVxCzBxb9HgSlA_0TQRvhYk"
    $csv =$csvPath

    for ($i = 0; $i -lt $records.Count; $i += 10) {
        $batch = $records[$i..([math]::Min($i+9, $records.Count-1))]
        $body = ConvertTo-Json $batch -Depth 10

        $headers = @{
            "apikey" = $SUPABASE_KEY
            "Content-Type" = "application/json"
        }

        try {
            $response = [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            $request = [System.Net.HttpWebRequest]::Create("$SUPABASE_URL/rest/v1/disc_results")
            $request.Method = "POST"
            $request.ContentType = "application/json"
            $request.Headers["apikey"] = $SUPABASE_KEY

            $stream = $request.GetRequestStream()
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()

            $response = $request.GetResponse()
            Write-Host "| [+] Batch $([math]::Ceiling(($i+1)/10)) enviado (Status: $($response.StatusCode))"
            $response.Close()
        }
        catch {
            Write-Host "| [-] Erro no batch: $($_.Exception.Message)"
            if ($_.Exception.InnerException) {
              Write-Host "|     Detalhes: $($_.Exception.InnerException.Message)"
            }
        }
    }
}

Write-Host "═══════════════════════════════════════"
Write-Host "Importacao concluida!"
Write-Host "═══════════════════════════════════════"
