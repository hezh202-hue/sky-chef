package com.hezh202.skychef;

import android.graphics.Bitmap;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class GameSmokeTest {
    private String js(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getGameWebView().evaluateJavascript(script, value -> {
            result.set(value); latch.countDown();
        }));
        assertTrue("JavaScript callback timed out", latch.await(15, TimeUnit.SECONDS));
        return result.get();
    }
    private void waitFor(ActivityScenario<MainActivity> scenario, String expression) throws Exception {
        long deadline = SystemClock.uptimeMillis() + 20000;
        while (SystemClock.uptimeMillis() < deadline) {
            if ("true".equals(js(scenario, expression))) return;
            SystemClock.sleep(150);
        }
        fail("Condition failed: " + expression);
    }
    private void screenshot(ActivityScenario<MainActivity> scenario, String name) throws Exception {
        CountDownLatch draw = new CountDownLatch(1);
        scenario.onActivity(activity -> activity.getGameWebView().postVisualStateCallback(1, new WebView.VisualStateCallback() {
            @Override public void onComplete(long id) { draw.countDown(); }
        }));
        assertTrue("WebView draw timed out", draw.await(15, TimeUnit.SECONDS));
        // 有持续动画时主线程可能一直不空闲，waitForIdleSync 没有超时会卡死整个测试，改为最多等 10 秒
        CountDownLatch idle = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().waitForIdle(idle::countDown);
        idle.await(10, TimeUnit.SECONDS);
        SystemClock.sleep(700);
        scenario.onActivity(activity -> {
            WebView web = activity.getGameWebView();
            int[] location = new int[2];
            web.getLocationOnScreen(location);
            android.graphics.Insets bars = web.getRootWindowInsets().getInsets(
                android.view.WindowInsets.Type.systemBars());
            assertTrue("Content overlaps status bar", location[1] >= bars.top);
            assertTrue("Content overlaps navigation bar", location[1] + web.getHeight() <=
                activity.getWindowManager().getCurrentWindowMetrics().getBounds().height() - bars.bottom);
        });
        File dir = new File(InstrumentationRegistry.getArguments().getString("additionalTestOutputDir"));
        assertTrue(dir.isDirectory() || dir.mkdirs());
        Bitmap bitmap = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(bitmap);
        try (FileOutputStream stream = new FileOutputStream(new File(dir, name))) {
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream);
        }
        bitmap.recycle();
    }
    // 整体超时：万一再卡住，会带着卡住位置的调用栈失败，而不是拖到 CI 超时被取消
    @Test(timeout = 240000) public void offlineGameLifecycleAndSave() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitFor(scenario, "!!document.querySelector('.menu-btn.primary')");
            assertEquals("\"https://appassets.androidplatform.net\"", js(scenario, "location.origin"));
            assertEquals("false", js(scenario, "document.documentElement.scrollWidth > innerWidth + 1"));
            screenshot(scenario, "01-title.png");
            js(scenario, "document.querySelector('.menu-btn.primary').click()");
            waitFor(scenario, "!!document.querySelector('.level-node')");
            js(scenario, "document.querySelector('.level-node').click()");
            // 首次进入城市会先播放剧情对话，逐句点掉
            js(scenario, "(function(){var n=0;while(document.querySelector('.dlg-overlay')&&n++<20)document.querySelector('.dlg-overlay').click();return n;})()");
            waitFor(scenario, "!!document.querySelector('.modal-buttons .primary')");
            js(scenario, "document.querySelector('.modal-buttons .primary').click()");
            waitFor(scenario, "!!document.querySelector('.game') && !!SC._view");
            waitFor(scenario, "SC._view.flight.time > 0");
            screenshot(scenario, "02-flight.png");
            scenario.onActivity(MainActivity::onBackPressed);
            waitFor(scenario, "SC._view.flight.paused && SC.UI.hasModal()");
            js(scenario, "Array.from(document.querySelectorAll('.modal-buttons button')).find(b => b.textContent === '继续').click()");
            waitFor(scenario, "!SC._view.flight.paused && !SC.UI.hasModal()");
            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            waitFor(scenario, "SC._view.flight.paused");
            assertEquals("false", js(scenario, "document.documentElement.scrollWidth > innerWidth + 1"));
            js(scenario, "SC.Save.data.coins = 321; SC.Save.save()");
            scenario.recreate();
            waitFor(scenario, "!!document.querySelector('.title-screen')");
            assertEquals("321", js(scenario, "SC.Save.data.coins"));
            assertEquals("true", js(scenario, "JSON.parse(localStorage.getItem('skychef_save_v1')).coins === 321"));
        }
    }
}
