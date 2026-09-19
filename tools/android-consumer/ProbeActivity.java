package dev.zephyriov.domainprobe;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class ProbeActivity extends Activity {
    private static final String TAG = "ZephyriovDomainProbe";

    public final class ResultBridge {
        @JavascriptInterface
        public void report(String result) {
            Log.i(TAG, result);
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
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
