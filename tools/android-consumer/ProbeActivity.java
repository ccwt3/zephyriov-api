package dev.zephyriov.domainprobe;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class ProbeActivity extends Activity {
    private static final String TAG = "ZephyriovDomainProbe";

    public final class ResultBridge {
        @JavascriptInterface
        public void report(String result) {
            String encoded = Base64.encodeToString(result.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                Base64.NO_WRAP);
            int chunkSize = 2500;
            int total = (encoded.length() + chunkSize - 1) / chunkSize;
            for (int index = 0; index < total; index++) {
                int start = index * chunkSize;
                Log.i(TAG, "PARITY:" + index + ":" + total + ":" + encoded.substring(start,
                    Math.min(start + chunkSize, encoded.length())));
            }
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        Log.i(TAG, "RUN:" + getIntent().getStringExtra("run"));
        WebView view = new WebView(this);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setAllowFileAccessFromFileURLs(false);
        view.getSettings().setAllowUniversalAccessFromFileURLs(false);
        view.getSettings().setAllowContentAccess(false);
        view.addJavascriptInterface(new ResultBridge(), "AndroidResult");
        view.setWebViewClient(new WebViewClient());
        setContentView(view);
        view.loadUrl("file:///android_asset/index.html");
    }
}
