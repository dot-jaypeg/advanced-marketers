<?php
/**
 * AM HTML Host — paste or upload raw HTML, get a live link.
 * Single-file app. Runs as its own Railway service (root dir: htmlhost/),
 * backed by a Railway Volume so uploaded pages survive redeploys.
 */

// ---------- config ----------
$PASSWORD = getenv('HTMLHOST_PASSWORD') ?: 'apple';   // set HTMLHOST_PASSWORD in Railway env vars
$STORE_DIR = getenv('STORE_DIR') ?: (__DIR__ . '/p');  // mount the volume here in prod
$PUBLIC_BASE = 'p';                    // URL path (relative) to the store dir
$MAX_BYTES = 5 * 1024 * 1024;          // 5 MB cap per page
// ----------------------------

session_start();

// ---------- auth gate ----------
if (isset($_GET['logout'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

$loginError = null;
if (empty($_SESSION['auth'])) {
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['password'])) {
        if (hash_equals($PASSWORD, $_POST['password'])) {
            $_SESSION['auth'] = true;
            header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
            exit;
        }
        $loginError = 'Wrong password.';
    }
    render_login($loginError);
    exit;
}
// -------------------------------

if (!is_dir($STORE_DIR)) {
    @mkdir($STORE_DIR, 0755, true);
}

function render_login($err) {
    ?>
<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>AM · HTML Host</title>
<style>
  body{margin:0;background:#0a0b0d;color:#e8eaed;font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  form{background:#141619;border:1px solid #26292e;border-radius:12px;padding:28px;width:300px;text-align:center}
  .logo{font-weight:700;letter-spacing:.5px;font-size:18px;background:#3b82f6;color:#fff;padding:4px 10px;border-radius:6px;display:inline-block;margin-bottom:18px}
  input{width:100%;background:#0d0f12;color:#e8eaed;border:1px solid #26292e;border-radius:8px;padding:12px;font-size:14px;box-sizing:border-box}
  input:focus{outline:none;border-color:#3b82f6}
  button{margin-top:14px;width:100%;background:#3b82f6;color:#fff;border:0;padding:12px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
  button:hover{background:#2563eb}
  .err{color:#ef4444;font-size:13px;margin-top:12px}
</style></head><body>
  <form method="post">
    <div class="logo">AM</div>
    <input type="password" name="password" placeholder="Password" autofocus>
    <button type="submit">Enter</button>
    <?php if ($err): ?><p class="err"><?php echo htmlspecialchars($err); ?></p><?php endif; ?>
  </form>
</body></html>
    <?php
}

function slug() {
    // short url-safe id
    return substr(bin2hex(random_bytes(8)), 0, 10);
}

function base_url() {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/'), '/');
    return $scheme . '://' . $host . $dir;
}

// ---------- delete a deployed page ----------
if (isset($_GET['del'])) {
    $safe = strtolower(preg_replace('/[^a-zA-Z0-9\-_]/', '', $_GET['del']));
    if ($safe !== '') {
        @unlink($STORE_DIR . '/' . $safe . '.html');
    }
    header('Location: ' . strtok($_SERVER['REQUEST_URI'], '?'));
    exit;
}

// ---------- list deployed pages ----------
function deployed_pages($dir) {
    $out = [];
    foreach (glob($dir . '/*.html') as $f) {
        $out[] = ['name' => basename($f, '.html'), 'mtime' => filemtime($f), 'size' => filesize($f)];
    }
    usort($out, function ($a, $b) { return $b['mtime'] - $a['mtime']; });
    return $out;
}

$error = null;
$liveUrl = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['password'])) {
    $html = '';

    // Prefer uploaded file, fall back to pasted text
    if (!empty($_FILES['htmlfile']['tmp_name']) && is_uploaded_file($_FILES['htmlfile']['tmp_name'])) {
        if ($_FILES['htmlfile']['size'] > $MAX_BYTES) {
            $error = 'File too large (max 5 MB).';
        } else {
            $html = file_get_contents($_FILES['htmlfile']['tmp_name']);
        }
    } elseif (isset($_POST['html']) && trim($_POST['html']) !== '') {
        $html = $_POST['html'];
    } else {
        $error = 'Paste some HTML or choose a file first.';
    }

    if (!$error) {
        if (strlen($html) > $MAX_BYTES) {
            $error = 'Content too large (max 5 MB).';
        } else {
            // optional custom name
            $custom = trim($_POST['name'] ?? '');
            if ($custom !== '') {
                $custom = strtolower(preg_replace('/[^a-zA-Z0-9-_]/', '', $custom));
            }
            $name = $custom !== '' ? $custom : slug();

            $path = $STORE_DIR . '/' . $name . '.html';
            // avoid clobbering an existing custom name
            if ($custom !== '' && file_exists($path)) {
                $name = $custom . '-' . slug();
                $path = $STORE_DIR . '/' . $name . '.html';
            }

            if (file_put_contents($path, $html) === false) {
                $error = 'Could not write the file. Check folder permissions.';
            } else {
                $liveUrl = base_url() . '/' . $PUBLIC_BASE . '/' . $name . '.html';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>AM · HTML Host</title>
<style>
  :root{
    --bg:#0a0b0d; --panel:#141619; --line:#26292e;
    --text:#e8eaed; --muted:#8b9096; --accent:#3b82f6; --accent-2:#2563eb;
    --ok:#22c55e; --err:#ef4444;
  }
  *{box-sizing:border-box}
  body{
    margin:0; background:var(--bg); color:var(--text);
    font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    display:flex; flex-direction:column; align-items:center; min-height:100vh; padding:40px 20px;
  }
  .wrap{width:100%; max-width:720px}
  header{display:flex; align-items:center; gap:12px; margin-bottom:6px}
  .logo{
    font-weight:700; letter-spacing:.5px; font-size:18px;
    background:var(--accent); color:#fff; padding:4px 10px; border-radius:6px;
  }
  h1{font-size:20px; margin:0; font-weight:600}
  .sub{color:var(--muted); margin:4px 0 28px; font-size:14px}
  .panel{
    background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:22px;
  }
  label{display:block; font-size:13px; color:var(--muted); margin:0 0 8px; font-weight:500}
  textarea{
    width:100%; min-height:280px; resize:vertical; background:#0d0f12; color:var(--text);
    border:1px solid var(--line); border-radius:8px; padding:14px; font:13px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  textarea:focus,input:focus{outline:none; border-color:var(--accent)}
  .row{display:flex; gap:14px; margin-top:16px; flex-wrap:wrap; align-items:flex-end}
  .field{flex:1; min-width:200px}
  input[type=text],input[type=file]{
    width:100%; background:#0d0f12; color:var(--text);
    border:1px solid var(--line); border-radius:8px; padding:11px 12px; font-size:14px;
  }
  input[type=file]{padding:9px 12px}
  .divider{display:flex; align-items:center; gap:12px; color:var(--muted); font-size:12px; margin:18px 0; text-transform:uppercase; letter-spacing:1px}
  .divider::before,.divider::after{content:""; flex:1; height:1px; background:var(--line)}
  button{
    margin-top:20px; width:100%; background:var(--accent); color:#fff; border:0;
    padding:14px; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer;
  }
  button:hover{background:var(--accent-2)}
  .result{
    margin-top:22px; background:var(--panel); border:1px solid var(--ok);
    border-radius:12px; padding:20px;
  }
  .result h2{margin:0 0 12px; font-size:15px; color:var(--ok)}
  .linkbox{display:flex; gap:8px}
  .linkbox input{flex:1; font:13px ui-monospace,Menlo,monospace}
  .copy{width:auto; margin:0; padding:0 16px; white-space:nowrap; background:#20242a}
  .copy:hover{background:#2a2f36}
  .err{margin-top:18px; color:var(--err); font-size:14px}
  a.open{color:var(--accent); text-decoration:none; font-size:13px; display:inline-block; margin-top:10px}
  footer{color:var(--muted); font-size:12px; margin-top:28px; text-align:center}
  .pages{margin-top:26px}
  .pages h3{font-size:13px; color:var(--muted); font-weight:500; text-transform:uppercase; letter-spacing:1px; margin:0 0 12px}
  .page-item{display:flex; align-items:center; gap:12px; background:var(--panel); border:1px solid var(--line);
    border-radius:8px; padding:11px 14px; margin-bottom:8px}
  .page-item .nm{flex:1; min-width:0}
  .page-item .nm a{color:var(--text); text-decoration:none; font-weight:500; word-break:break-all}
  .page-item .nm a:hover{color:var(--accent)}
  .page-item .meta{color:var(--muted); font-size:12px; margin-top:2px}
  .page-item .act{display:flex; gap:8px; flex-shrink:0}
  .page-item .act a{font-size:12px; text-decoration:none; padding:5px 10px; border-radius:6px; border:1px solid var(--line); color:var(--muted)}
  .page-item .act a:hover{border-color:var(--accent); color:var(--accent)}
  .page-item .act a.del:hover{border-color:var(--err); color:var(--err)}
  .empty{color:var(--muted); font-size:13px; padding:10px 0}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <span class="logo">AM</span>
    <h1>HTML Host</h1>
  </header>
  <p class="sub">Paste raw HTML or upload a file. Get an instant live link.</p>

  <?php if ($liveUrl): ?>
    <div class="result">
      <h2>✓ Deployed</h2>
      <div class="linkbox">
        <input type="text" id="liveurl" value="<?php echo htmlspecialchars($liveUrl); ?>" readonly>
        <button type="button" class="copy" onclick="copyUrl()">Copy</button>
      </div>
      <a class="open" href="<?php echo htmlspecialchars($liveUrl); ?>" target="_blank">Open page →</a>
    </div>
  <?php endif; ?>

  <?php if ($error): ?>
    <p class="err">⚠ <?php echo htmlspecialchars($error); ?></p>
  <?php endif; ?>

  <form class="panel" method="post" enctype="multipart/form-data" style="margin-top:22px">
    <label for="html">Paste HTML</label>
    <textarea id="html" name="html" placeholder="&lt;!DOCTYPE html&gt;&#10;&lt;html&gt;...&lt;/html&gt;"><?php echo isset($_POST['html']) && !$liveUrl ? htmlspecialchars($_POST['html']) : ''; ?></textarea>

    <div class="divider">or</div>

    <label for="htmlfile">Upload .html file</label>
    <input type="file" id="htmlfile" name="htmlfile" accept=".html,.htm,text/html">

    <div class="row">
      <div class="field">
        <label for="name">Custom name (optional)</label>
        <input type="text" id="name" name="name" placeholder="my-page" pattern="[a-zA-Z0-9\-_]*">
      </div>
    </div>

    <button type="submit">Deploy →</button>
  </form>

  <?php $pages = deployed_pages($STORE_DIR); ?>
  <div class="pages">
    <h3>Deployed pages (<?php echo count($pages); ?>)</h3>
    <?php if (!$pages): ?>
      <p class="empty">Nothing deployed yet.</p>
    <?php else: foreach ($pages as $p):
      $url = base_url() . '/' . $PUBLIC_BASE . '/' . rawurlencode($p['name']) . '.html'; ?>
      <div class="page-item">
        <div class="nm">
          <a href="<?php echo htmlspecialchars($url); ?>" target="_blank"><?php echo htmlspecialchars($p['name']); ?>.html</a>
          <div class="meta"><?php echo date('M j, Y g:i A', $p['mtime']); ?> · <?php echo round($p['size'] / 1024, 1); ?> KB</div>
        </div>
        <div class="act">
          <a href="<?php echo htmlspecialchars($url); ?>" target="_blank">Open</a>
          <a class="del" href="?del=<?php echo rawurlencode($p['name']); ?>" onclick="return confirm('Delete <?php echo htmlspecialchars($p['name'], ENT_QUOTES); ?>.html?')">Delete</a>
        </div>
      </div>
    <?php endforeach; endif; ?>
  </div>

  <footer>Advanced Marketers · internal tool · <a href="?logout" style="color:var(--muted)">log out</a></footer>
</div>

<script>
function copyUrl(){
  var el = document.getElementById('liveurl');
  el.select(); el.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(el.value);
  var btn = document.querySelector('.copy');
  var t = btn.textContent; btn.textContent = 'Copied!';
  setTimeout(function(){ btn.textContent = t; }, 1500);
}
</script>
</body>
</html>
