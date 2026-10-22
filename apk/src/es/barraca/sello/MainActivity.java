package es.barraca.sello;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Envoltorio nativo mínimo de la PWA Sello (build.barraca.house/sello-a).
 *
 *  Existe porque los WebAPK de Chrome —el mecanismo que registra una PWA en
 *  la hoja de compartir de Android— requieren Google Play Services, y en los
 *  Huawei sin GMS no se generan: Chrome instala un atajo que nunca sale en
 *  «Compartir». Esta app sí es una app del sistema, así que el intent
 *  ACTION_SEND la registra siempre.
 *
 *  Todo lo demás lo hace la web: la app solo muestra el PWA y, cuando llega
 *  un texto compartido, abre /api/compartir?text=…, que redirige al
 *  verificador. No guarda nada ni procesa el texto: pasa directo a la web.
 */
public class MainActivity extends Activity {
  private static final String BASE = "https://build.barraca.house/sello-a";
  private WebView web;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    // sessionStorage: lo usa el traspaso del share target de la web.
    s.setDomStorageEnabled(true);
    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView vista, String url) {
        // Solo la PWA dentro de la app; cualquier otro enlace (la web oficial
        // del organismo, INCIBE…) en el navegador que el ciudadano use.
        if ("build.barraca.house".equals(Uri.parse(url).getHost())) return false;
        try {
          startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        } catch (Exception ignorado) {
          // Sin navegador que lo abra: no hacemos nada.
        }
        return true;
      }
    });
    setContentView(web);
    ir(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    ir(intent);
  }

  /** Abre la PWA; si el intent trae texto compartido, el verificador. */
  private void ir(Intent intent) {
    String url = BASE + "/";
    if (intent != null && Intent.ACTION_SEND.equals(intent.getAction())) {
      String texto = intent.getStringExtra(Intent.EXTRA_TEXT);
      if (texto != null && !texto.trim().isEmpty()) {
        url = BASE + "/api/compartir?text=" + Uri.encode(texto.trim());
      }
    }
    web.loadUrl(url);
  }

  @Override
  public void onBackPressed() {
    if (web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }
}
