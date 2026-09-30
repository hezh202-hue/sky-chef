package com.hezh202.skychef;

import android.app.Activity;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.webkit.WebView;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry;
import androidx.test.runner.lifecycle.Stage;
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
    // CI 模拟器是软件渲染，CSS 动画一多每帧都超过 16ms，主线程永远等不到"空闲"。
    // scenario.onActivity 内部会无超时地 waitForIdleSync，所以这里改为直接投递到主线程并自带超时。
    private MainActivity activity;
    private void onUi(Runnable action) throws Exception {
        AtomicReference<Throwable> error = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        new Handler(Looper.getMainLooper()).post(() -> {
            try { action.run(); } catch (Throwable t) { error.set(t); } finally { done.countDown(); }
        });
        assertTrue("Main thread task timed out", done.await(15, TimeUnit.SECONDS));
        if (error.get() instanceof Error) throw (Error) error.get();
        if (error.get() != null) throw new RuntimeException(error.get());
    }
    private void bind() throws Exception {
        // 启动和重建后拿到当前前台的 Activity（不经过 onActivity，避免空闲等待）
        onUi(() -> {
            for (Activity a : ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(Stage.RESUMED)) {
                if (a instanceof MainActivity) activity = (MainActivity) a;
            }
        });
        assertNotNull("MainActivity not resumed", activity);
    }
    private String js(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);
        onUi(() -> activity.getGameWebView().evaluateJavascript(script, value -> {
            result.set(value); latch.countDown();
        }));
        assertTrue("JavaScript callback timed out", latch.await(15, TimeUnit.SECONDS));
        return result.get();
    }
    // 测试环境关掉 CSS 动画和过渡（CI 的 disable-animations 只管系统动画，管不到 WebView），
    // 否则 moveToState / recreate 内部的空闲等待也可能卡死
    private void freezeCssAnimations(ActivityScenario<MainActivity> scenario) throws Exception {
        js(scenario, "(() => { const s = document.createElement('style');"
            + " s.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';"
            + " document.head.appendChild(s); return true; })()");
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
        onUi(() -> activity.getGameWebView().postVisualStateCallback(1, new WebView.VisualStateCallback() {
            @Override public void onComplete(long id) { draw.countDown(); }
        }));
        assertTrue("WebView draw timed out", draw.await(15, TimeUnit.SECONDS));
        // 有持续动画时主线程可能一直不空闲，waitForIdleSync 没有超时会卡死整个测试，改为最多等 10 秒
        CountDownLatch idle = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().waitForIdle(idle::countDown);
        idle.await(10, TimeUnit.SECONDS);
        // 软件渲染的模拟器上画面上屏比 JS 状态慢，等 2 秒，否则会拍到切换前的旧画面
        SystemClock.sleep(2000);
        onUi(() -> {
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
            bind();
            waitFor(scenario, "!!document.querySelector('.menu-btn.primary')");
            freezeCssAnimations(scenario);
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
            onUi(activity::onBackPressed);
            waitFor(scenario, "SC._view.flight.paused && SC.UI.hasModal()");
            js(scenario, "Array.from(document.querySelectorAll('.modal-buttons button')).find(b => b.textContent === '继续').click()");
            waitFor(scenario, "!SC._view.flight.paused && !SC.UI.hasModal()");
            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            waitFor(scenario, "SC._view.flight.paused");
            assertEquals("false", js(scenario, "document.documentElement.scrollWidth > innerWidth + 1"));
            js(scenario, "SC.Save.data.coins = 321; SC.Save.save()");
            scenario.recreate();
            activity = null;
            bind();
            waitFor(scenario, "!!document.querySelector('.title-screen')");
            assertEquals("321", js(scenario, "SC.Save.data.coins"));
            assertEquals("true", js(scenario, "JSON.parse(localStorage.getItem('skychef_save_v1')).coins === 321"));
        }
    }
}
