package com.hezh202.skychef;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.widget.FrameLayout;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;

public final class MainActivity extends Activity {
    private WebView webView;
    private static final String ORIGIN = "appassets.androidplatform.net";

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(29, 43, 83));
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(Color.rgb(29, 43, 83));
        frame.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(frame);
        // Android 15 强制 edge-to-edge，保留系统栏及刘海的可触摸安全区域。
        frame.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(
                    WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets;
        });
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse resource = loader.shouldInterceptRequest(request.getUrl());
                return resource != null ? resource : new WebResourceResponse("text/plain", "UTF-8", 404,
                    "Not Found", null, new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !("https".equals(uri.getScheme()) && ORIGIN.equals(uri.getHost())
                    && uri.getPath() != null && uri.getPath().startsWith("/assets/"));
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("https://" + ORIGIN + "/assets/index.html");
    }

    @Override protected void onPause() {
        webView.evaluateJavascript("window.dispatchEvent(new Event('skychef-background'));", null);
        webView.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.evaluateJavascript("window.dispatchEvent(new Event('skychef-foreground'));", null);
        }
    }

    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() {
        webView.evaluateJavascript("window.SC && SC.handleAndroidBack ? SC.handleAndroidBack() : false", handled -> {
            if (!"true".equals(handled) && !isFinishing()) {
                new AlertDialog.Builder(this).setTitle("退出云端大厨？")
                    .setMessage("已完成的航班进度会保留。")
                    .setNegativeButton("继续玩", null)
                    .setPositiveButton("退出", (dialog, which) -> finish()).show();
            }
        });
    }

    @Override protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }

    WebView getGameWebView() { return webView; }
}
