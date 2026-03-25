$files = @(
  'src/components/rhdp/AvaliacaoDesempenhoSection.tsx',
  'src/components/rhdp/AvaliacaoExperienciaSection.tsx',
  'src/components/rhdp/BancoHorasSection.tsx',
  'src/components/rhdp/CentralAtestadosSection.tsx',
  'src/components/rhdp/FormulariosSection.tsx',
  'src/components/rhdp/MovimentacoesDisciplinarSection.tsx',
  'src/components/rhdp/TrocasPlantcoesHistorico.tsx',
  'src/components/rhdp/JustificativaDeHorasHistorico.tsx',
  'src/components/enfermagem/EscalaTecEnfermagem.tsx',
  'src/components/faturamento/DashboardFaturamento.tsx',
  'src/components/gerencia/GestaoTalentos.tsx'
)

foreach ($file in $files) {
  $content = Get-Content $file -Raw
  
  # Extrair nome do componente
  if ($content -match 'export const (\w+) = ') {
    $componentName = $matches[1]
    Write-Host "✓ Processing $componentName..."
    
    # Adicionar memo ao import se não tiver
    $content = $content -replace '(import \{[^}]*?)(from ["\']react["\'])', "$1, memo$2"
   
    # Mudar o export
    $content = $content -replace "export const $componentName = \(\) => \{", "export const $componentName = memo(() => {"
    
    # Adicionar displayName no final  
    $content = $content -replace "(  \}\);?)$", "

$componentName.displayName = '$componentName';"
    
    Set-Content $file -Value $content
  }
}

Write-Host "
✓ Memoização concluída!"
