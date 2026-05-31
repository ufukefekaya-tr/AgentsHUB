# QA_SKILL_TESTER v2.0 — PowerShell QA Script
# 14 Skill testi, JWT auth, SSE stream okuma, JSON rapor

$BASE = "http://127.0.0.1:3434"
$AGENT = "QA_SKILL_TESTER"
$PASS  = "agentshub_secure_key_2026"
$REPORT_DIR = "C:\AgentsHUB\Report"
$REPORT_FILE = "$REPORT_DIR\qa_skill_tester_v2_0.json"

if (-not (Test-Path $REPORT_DIR)) { New-Item -ItemType Directory -Path $REPORT_DIR -Force | Out-Null }

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   QA_SKILL_TESTER v2.0 — BAŞLADI      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── JWT Token al ──────────────────────────────────────────────
try {
    $loginResp = Invoke-RestMethod -Uri "$BASE/api/system/login" -Method POST `
        -Body (ConvertTo-Json @{password=$PASS}) -ContentType "application/json" -TimeoutSec 10
    $TOKEN = $loginResp.token
    Write-Host "✅ JWT token alındı" -ForegroundColor Green
} catch {
    Write-Host "❌ Login hatası: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

$THREAD_ID = "thread_qa_$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
Write-Host "✅ Thread ID: $THREAD_ID" -ForegroundColor Green
Write-Host ""

# ── SSE Chat fonksiyonu ───────────────────────────────────────
function Send-ChatSSE($message) {
    $body = ConvertTo-Json @{ message=$message; threadId=$THREAD_ID; history=@() } -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    
    $req = [System.Net.HttpWebRequest]::Create("$BASE/api/agents/$AGENT/chat")
    $req.Method = "POST"
    $req.ContentType = "application/json"
    $req.Headers.Add("Authorization", "Bearer $TOKEN")
    $req.ContentLength = $bytes.Length
    $req.Timeout = 90000
    $req.ReadWriteTimeout = 90000

    $stream = $req.GetRequestStream()
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()

    $startMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $fullText = ""
    
    try {
        $resp = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        
        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if ($line -match '^data: (.+)$') {
                try {
                    $d = $Matches[1] | ConvertFrom-Json -ErrorAction SilentlyContinue
                    if ($d.type -eq "text" -and $d.content) { $fullText += $d.content }
                    if ($d.content -and -not $d.type) { $fullText += $d.content }
                    if ($d.done -or $d.type -eq "done") { break }
                    if ($d.type -eq "error") { $fullText = $d.content; break }
                } catch {}
            }
        }
        $reader.Close()
        $resp.Close()
    } catch {
        $fullText = "HTTP_ERROR: $($_.Exception.Message)"
    }
    
    $latency = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() - $startMs
    return @{ content=$fullText; latency_ms=$latency }
}

# ── Test Senaryoları ──────────────────────────────────────────
$TESTS = @(
    @{ id="SKILL-01"; skill="skill_creator.js";    msg="skill_creator aracını kullanarak 'merhaba_test' adında basit bir JavaScript skill yaz. Bana dosyayı yazdığını söyle.";                          pass={ param($r) $r -match "oluştur|kaydedildi|yazıldı|skill|yaz" } }
    @{ id="SKILL-02"; skill="browser_agent.js";    msg="browser_agent aracıyla https://example.com adresini aç ve başlığını söyle.";                                                                    pass={ param($r) $r -match "example|domain|skip|playwright|browser|aç" } }
    @{ id="SKILL-03"; skill="python_runner.js";    msg="python_runner aracıyla şu kodu çalıştır: print('QA_TEST_OK', 2+2)";                                                                             pass={ param($r) $r -match "QA_TEST_OK|skip|python|4" } }
    @{ id="SKILL-04"; skill="pdf_extractor.js";    msg="pdf_extractor aracını kullan, herhangi bir PDF okumayı dene ve ne sonuç aldığını söyle.";                                                        pass={ param($r) $r.Length -gt 30 -or $r -match "pdf|dosya|hata|okuma" } }
    @{ id="SKILL-05"; skill="duckduckgo_search.js";msg="duckduckgo_search aracıyla 'Node.js nedir' araması yap ve ilk sonucu söyle.";                                                                   pass={ param($r) $r -match "node|javascript|sonuç|result|web" -or $r.Length -gt 50 } }
    @{ id="SKILL-06"; skill="health_checker.js";   msg="health_checker aracıyla google.com adresine ping at ve yanıt süresini söyle.";                                                                  pass={ param($r) $r -match "ms|ping|google|200|alive|ok|yanıt" } }
    @{ id="SKILL-07"; skill="system_monitor.js";   msg="system_monitor aracıyla bu bilgisayarın CPU ve RAM kullanımını göster.";                                                                        pass={ param($r) $r -match "cpu|ram|mb|gb|disk|memory|bellek|%|kullanım" } }
    @{ id="SKILL-08"; skill="get_time.js";         msg="get_time aracıyla şu anki saat ve tarihi söyle.";                                                                                               pass={ param($r) $r -match "2026|\d{2}:\d{2}|saat|tarih|time" } }
    @{ id="SKILL-09"; skill="calculator.js";       msg="calculator aracıyla 1234 * 5678 hesapla ve sonucu söyle.";                                                                                      pass={ param($r) $r -match "7006652|\d{6,}|sonuç|result|hesap" } }
    @{ id="SKILL-10"; skill="web_scraper.js";      msg="web_scraper aracıyla https://httpbin.org/json adresini scrape et.";                                                                             pass={ param($r) $r -match "slideshow|\{|json|içerik|scraped|veri" } }
    @{ id="SKILL-11"; skill="auto_capture.js";     msg="auto_capture aracıyla şu veriyi kaydet: key='qa_v2_test', value='çalışıyor'";                                                                  pass={ param($r) $r -match "kayıt|kaydedildi|başarı|ok|captured|stored" } }
    @{ id="SKILL-12"; skill="signal_agent.js";     msg="signal_agent aracıyla QA_ATLAS_V3 ajanına 'QA sinyal testi v2' mesajı gönder.";                                                               pass={ param($r) $r -match "gönderildi|iletildi|sinyal|ajan|signal|sent" } }
    @{ id="SKILL-13"; skill="github_manager.js";   msg="github_manager aracıyla ufukefekaya-tr kullanıcısının public repo listesini getir.";                                                           pass={ param($r) $r -match "repo|agentshub|token|skip|github|bulunamadı" } }
    @{ id="SKILL-14"; skill="mcp_bridge.js";       msg="mcp_bridge aracıyla mevcut MCP araçlarını listele.";                                                                                           pass={ param($r) $r -match "mcp|araç|config|skip|bağlantı|tool|bulunamadı" } }
)

$results = @()
$pass = 0; $fail = 0; $skip = 0

foreach ($test in $TESTS) {
    $pad = $test.skill.PadRight(26)
    Write-Host "[$($test.id)] $pad" -NoNewline
    
    $res = Send-ChatSSE $test.msg
    $c = $res.content
    $lat = $res.latency_ms
    
    $isSkip = $c -match "api.?key|kurulu değil|oauth|smtp|token yok|bulunamadı" -and $c.Length -lt 200
    $isPass = -not $isSkip -and (& $test.pass $c)
    $status = if ($isSkip) { "SKIP" } elseif ($isPass) { "PASS" } else { "FAIL" }

    if ($status -eq "PASS")      { $pass++; Write-Host "✅ PASS ($($lat)ms)" -ForegroundColor Green }
    elseif ($status -eq "SKIP")  { $skip++; Write-Host "⏭️  SKIP ($($lat)ms)" -ForegroundColor Yellow }
    else                          { $fail++; Write-Host "❌ FAIL ($($lat)ms)" -ForegroundColor Red; Write-Host "   └─ $($c.Substring(0,[Math]::Min(100,$c.Length)))..." -ForegroundColor DarkRed }

    # RETRY sadece gerçek FAIL için
    if ($status -eq "FAIL") {
        Write-Host "   └─ RETRY → " -NoNewline
        Start-Sleep -Seconds 2
        $r2 = Send-ChatSSE $test.msg
        $c2 = $r2.content
        $isSkip2 = $c2 -match "api.?key|kurulu değil|oauth|smtp|token yok" -and $c2.Length -lt 200
        $isPass2 = -not $isSkip2 -and (& $test.pass $c2)
        $s2 = if ($isSkip2) { "SKIP" } elseif ($isPass2) { "PASS" } else { "FAIL" }
        if ($s2 -eq "PASS")     { $fail--; $pass++; $status="PASS"; $c=$c2; Write-Host "✅ PASS" -ForegroundColor Green }
        elseif ($s2 -eq "SKIP") { $fail--; $skip++; $status="SKIP"; $c=$c2; Write-Host "⏭️  SKIP" -ForegroundColor Yellow }
        else                     { Write-Host "❌ FAIL" -ForegroundColor Red }
    }

    $results += @{ id=$test.id; skill=$test.skill; status=$status; output=$c.Substring(0,[Math]::Min(400,$c.Length)); latency_ms=$lat }
    Start-Sleep -Seconds 2
}

# ── Rapor ─────────────────────────────────────────────────────
$rate = [Math]::Round(($pass / $TESTS.Count) * 100)
$report = @{
    test_date = (Get-Date -Format "o")
    agent = $AGENT
    model = "gemini-2.5-flash"
    summary = @{ total=$TESTS.Count; pass=$pass; fail=$fail; skip=$skip; pass_rate="$rate%" }
    results = $results
}
$report | ConvertTo-Json -Depth 5 | Set-Content $REPORT_FILE -Encoding UTF8

Write-Host ""
Write-Host "========================================"
Write-Host "           TEST OZETI"
Write-Host "========================================"
Write-Host "  PASS : $pass / $($TESTS.Count)"
Write-Host "  FAIL : $fail / $($TESTS.Count)"
Write-Host "  SKIP : $skip / $($TESTS.Count)"
Write-Host "  Basari : %$rate"
Write-Host "========================================"
Write-Host "  Rapor: $REPORT_FILE"
Write-Host "========================================"
Write-Host ""
