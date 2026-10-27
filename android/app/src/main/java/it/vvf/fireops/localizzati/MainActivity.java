package it.vvf.fireops.localizzati;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.os.Handler;
import android.util.TypedValue;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

/**
 * FireOps Localizzati: contenitore Android che apre la pagina Localizzati di FireOps
 * e riceve coordinate e link di mappe da "Apri con", "Condividi" e dal menu del testo selezionato.
 * L'app web resta quella online (si aggiorna da sola): qui non c'e' logica, solo l'involucro.
 */
public class MainActivity extends Activity {

    static final String HOST = "vvfsendwhatsapp.github.io";
    private String BASE;

    private WebView web;
    private View avvio;
    private ValueCallback<Uri[]> sceltaFile;   // campo "scegli file" della pagina (galleria in Foto)
    private static final int RICHIESTA_FILE = 77;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        BASE = getString(R.string.pagina_base);
        getWindow().setStatusBarColor(Color.parseColor("#10141a"));
        getWindow().setNavigationBarColor(Color.parseColor("#10141a"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#10141a"));
        FrameLayout radice = new FrameLayout(this);
        radice.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        avvio = creaSchermataAvvio();
        radice.addView(avvio, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(radice);
        // se la pagina tarda o non arriva, la schermata di avvio sparisce comunque
        new Handler().postDelayed(new Runnable() { @Override public void run() { nascondiAvvio(); } }, 7000);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new Object() {
            /** Copia negli appunti dal sistema: non dipende dal focus della pagina né dai permessi del WebView. */
            @JavascriptInterface
            public boolean copia(final String testo) {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm == null || testo == null) return false;
                    cm.setPrimaryClip(ClipData.newPlainText("FireOps", testo));
                    return true;
                } catch (Exception e) { return false; }
            }

            @JavascriptInterface
            public String appunti() {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm == null || !cm.hasPrimaryClip()) return "";
                    ClipData d = cm.getPrimaryClip();
                    if (d == null || d.getItemCount() == 0) return "";
                    CharSequence c = d.getItemAt(0).coerceToText(MainActivity.this);
                    return c == null ? "" : c.toString();
                } catch (Exception e) { return ""; }
            }
        }, "FireOpsAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                nascondiAvvio();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                if ("tel".equals(u.getScheme())) { chiama(u); return true; }
                apriFuori(u);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback cb) {
                cb.invoke(origin, true, false);
            }

            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (sceltaFile != null) sceltaFile.onReceiveValue(null);
                sceltaFile = cb;
                try {
                    startActivityForResult(p.createIntent(), RICHIESTA_FILE);
                } catch (Exception e) {
                    sceltaFile = null;
                    return false;
                }
                return true;
            }

            @Override
            public void onPermissionRequest(final PermissionRequest req) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() { req.grant(req.getResources()); }
                });
            }
        });

        chiediPermessi();
        gestisci(getIntent());
    }

    @Override
    protected void onActivityResult(int codice, int esito, Intent dati) {
        super.onActivityResult(codice, esito, dati);
        if (codice == RICHIESTA_FILE && sceltaFile != null) {
            sceltaFile.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(esito, dati));
            sceltaFile = null;
        }
    }

    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        setIntent(i);
        gestisci(i);
    }

    private void chiediPermessi() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.CAMERA}, 1);
        }
    }

    /** Ricava il testo ricevuto (link, coordinate, testo selezionato) e lo passa a Localizzati. */
    private void gestisci(Intent i) {
        String testo = null;
        String act = i == null ? null : i.getAction();
        if (Intent.ACTION_VIEW.equals(act) && i.getData() != null) {
            testo = i.getData().toString();
        } else if (Intent.ACTION_SEND.equals(act)) {
            CharSequence c = i.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (c != null) testo = c.toString();
        } else if (Intent.ACTION_PROCESS_TEXT.equals(act)) {
            CharSequence c = i.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
            if (c != null) testo = c.toString();
        }
        if (testo == null || testo.trim().isEmpty()) {
            if (web.getUrl() == null) web.loadUrl(BASE);   // avvio normale: home dell'app
            return;
        }
        gestisciTesto(testo.trim());
    }

    private void gestisciTesto(final String t) {
        if (corto(t)) {
            // i link abbreviati (maps.app.goo.gl) non contengono le coordinate: si segue il reindirizzamento
            web.loadUrl(BASE + "#/localizzati");
            new Thread(new Runnable() {
                @Override
                public void run() {
                    final String finale = risolvi(t);
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() { carica(finale); }
                    });
                }
            }).start();
        } else {
            carica(t);
        }
    }


    /** Aperta dall'icona: se negli appunti c'e' un link di mappe o delle coordinate nuove, le usa. */
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (!hasFocus || web == null) return;
        Intent in = getIntent();
        if (in != null && in.getAction() != null && !Intent.ACTION_MAIN.equals(in.getAction())) return;
        try {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm == null || !cm.hasPrimaryClip()) return;
            ClipData d = cm.getPrimaryClip();
            if (d == null || d.getItemCount() == 0) return;
            CharSequence c = d.getItemAt(0).coerceToText(this);
            if (c == null) return;
            String t = c.toString().trim();
            if (t.length() < 6 || t.length() > 600) return;
            if (!(corto(t) || t.matches("(?s).*(maps|geo:|openstreetmap|waze).*") || t.matches("(?s).*-?\\d{1,3}[.,]\\d{3,}\\D{1,4}-?\\d{1,3}[.,]\\d{3,}.*"))) return;
            SharedPreferences sp = getSharedPreferences("fo", MODE_PRIVATE);
            if (t.equals(sp.getString("ultimo", ""))) return;
            sp.edit().putString("ultimo", t).apply();
            gestisciTesto(t);
        } catch (Exception ignora) { }
    }

    private void carica(String testo) {
        web.loadUrl(BASE + "?text=" + Uri.encode(testo));
    }

    private static boolean corto(String t) {
        String x = t.toLowerCase(Locale.ROOT);
        return x.contains("maps.app.goo.gl") || x.contains("goo.gl/maps") || x.contains("//goo.gl/");
    }

    private static String risolvi(String u) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setInstanceFollowRedirects(true);
            c.setConnectTimeout(7000);
            c.setReadTimeout(7000);
            c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
            c.connect();
            String f = c.getURL().toString();
            c.disconnect();
            return f;
        } catch (Exception e) {
            return u;
        }
    }

    /** Link esterni al sito: si aprono con un'altra app, mai con questa (evita il giro su se stessa). */
    private Uri numeroInSospeso;

    /** Avvia la chiamata subito con l'app telefono predefinita (senza scelta app); se manca il permesso lo chiede. */
    /** Schermata di avvio con logo e nome dell'app (Pro o Lite), sopra la pagina finche' non e' pronta. */
    private View creaSchermataAvvio() {
        LinearLayout l = new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        l.setGravity(Gravity.CENTER);
        l.setBackgroundColor(getResources().getColor(R.color.sfondo_avvio));
        l.setClickable(true);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.ic_launcher_fg);
        int dp = getResources().getDimensionPixelSize(R.dimen.logo_avvio);
        l.addView(logo, new LinearLayout.LayoutParams(dp, dp));
        TextView nome = new TextView(this);
        nome.setText(getString(R.string.app_name));
        nome.setTextColor(getResources().getColor(R.color.testo_avvio));
        nome.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        nome.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        nome.setGravity(Gravity.CENTER);
        nome.setPadding(0, dp / 8, 0, 0);
        l.addView(nome, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        return l;
    }

    private void nascondiAvvio() {
        final View v = avvio;
        if (v == null) return;
        avvio = null;
        v.animate().alpha(0f).setDuration(250).withEndAction(new Runnable() {
            @Override public void run() { v.setVisibility(View.GONE); }
        }).start();
    }

    private void chiama(Uri u) {
        if (checkSelfPermission(Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED) {
            try {
                Intent c = new Intent(Intent.ACTION_CALL, u);
                startActivity(c);
                return;
            } catch (Exception ignora) { }
        } else {
            numeroInSospeso = u;
            requestPermissions(new String[]{Manifest.permission.CALL_PHONE}, 2);
            return;
        }
        try { startActivity(new Intent(Intent.ACTION_DIAL, u)); } catch (Exception ignora) { }
    }

    @Override
    public void onRequestPermissionsResult(int codice, String[] perm, int[] esiti) {
        super.onRequestPermissionsResult(codice, perm, esiti);
        if (codice == 2 && numeroInSospeso != null) {
            Uri u = numeroInSospeso;
            numeroInSospeso = null;
            try {
                boolean ok = esiti.length > 0 && esiti[0] == PackageManager.PERMISSION_GRANTED;
                startActivity(new Intent(ok ? Intent.ACTION_CALL : Intent.ACTION_DIAL, u));
            } catch (Exception ignora) { }
        }
    }

    private void apriFuori(Uri u) {
        try {
            Intent v = new Intent(Intent.ACTION_VIEW, u);
            Intent ch = Intent.createChooser(v, null);
            ch.putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, new ComponentName[]{new ComponentName(this, MainActivity.class)});
            startActivity(ch);
        } catch (Exception ignora) { }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
