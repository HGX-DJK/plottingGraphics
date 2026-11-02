package com.geoplot.gis;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new NativeAndroidInterface(), "AndroidNative");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public class NativeAndroidInterface {

        /**
         * 将 Base64 图片保存至 Android 系统相册/图库 (MediaStore)
         */
        @JavascriptInterface
        public boolean saveImageToGallery(String base64Data, String filename) {
            try {
                if (base64Data == null || base64Data.isEmpty()) return false;
                if (base64Data.contains(",")) {
                    base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                }
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getContentResolver();
                    ContentValues contentValues = new ContentValues();
                    contentValues.put(MediaStore.Images.Media.DISPLAY_NAME, filename);
                    contentValues.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    contentValues.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/PlottingMaps");
                    contentValues.put(MediaStore.Images.Media.IS_PENDING, 1);

                    Uri uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);
                    if (uri != null) {
                        try (OutputStream outputStream = resolver.openOutputStream(uri)) {
                            if (outputStream != null) {
                                outputStream.write(decodedBytes);
                                outputStream.flush();
                            }
                        }
                        contentValues.clear();
                        contentValues.put(MediaStore.Images.Media.IS_PENDING, 0);
                        resolver.update(uri, contentValues, null, null);

                        runOnUiThread(() -> Toast.makeText(MainActivity.this, "✓ 成果图已成功保存至手机系统相册/图库！", Toast.LENGTH_LONG).show());
                        return true;
                    }
                } else {
                    File picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                    File appDir = new File(picturesDir, "PlottingMaps");
                    if (!appDir.exists()) {
                        appDir.mkdirs();
                    }
                    File imageFile = new File(appDir, filename);

                    try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                        fos.write(decodedBytes);
                        fos.flush();
                    }

                    MediaStore.Images.Media.insertImage(getContentResolver(), imageFile.getAbsolutePath(), filename, "标绘成果专题图");
                    sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(imageFile)));

                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "✓ 成果图已成功保存至系统相册！", Toast.LENGTH_LONG).show());
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "保存至相册失败: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
            return false;
        }

        /**
         * 将文本内容（JSON / GeoJSON 等）保存至 Android 系统「下载」目录 (MediaStore Downloads)
         *
         * 背景：Android WebView 不支持 <a download> 属性触发的 Blob 下载，
         * 纯前端 downloadFile() 在 App 内点击无任何反应。此方法提供原生落盘能力，
         * 让「下载 GeoJSON / 下载工程 JSON」在真机上真正生成文件。
         *
         * @param content   完整文本内容
         * @param filename  目标文件名（含扩展名）
         * @param mimeType  MIME 类型，如 application/json / application/geo+json
         * @return 是否保存成功
         */
        @JavascriptInterface
        public boolean saveTextToDownloads(String content, String filename, String mimeType) {
            try {
                if (content == null || content.isEmpty()) return false;
                if (filename == null || filename.trim().isEmpty()) return false;
                if (mimeType == null || mimeType.trim().isEmpty()) {
                    mimeType = "application/json";
                }
                byte[] bytes = content.getBytes("UTF-8");

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getContentResolver();
                    ContentValues contentValues = new ContentValues();
                    contentValues.put(MediaStore.Downloads.Media.DISPLAY_NAME, filename);
                    contentValues.put(MediaStore.Downloads.Media.MIME_TYPE, mimeType);
                    contentValues.put(MediaStore.Downloads.Media.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);
                    contentValues.put(MediaStore.Downloads.Media.IS_PENDING, 1);

                    Uri uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                    if (uri == null) return false;

                    try (OutputStream outputStream = resolver.openOutputStream(uri)) {
                        if (outputStream != null) {
                            outputStream.write(bytes);
                            outputStream.flush();
                        }
                    }
                    contentValues.clear();
                    contentValues.put(MediaStore.Downloads.Media.IS_PENDING, 0);
                    resolver.update(uri, contentValues, null, null);

                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "✓ 已保存至手机「下载」目录: " + filename, Toast.LENGTH_LONG).show());
                    return true;
                } else {
                    // Android 9 及以下：直接写入公共下载目录（需 WRITE_EXTERNAL_STORAGE，已在清单声明）
                    File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                    if (!downloadsDir.exists()) {
                        downloadsDir.mkdirs();
                    }
                    File target = new File(downloadsDir, filename);
                    try (FileOutputStream fos = new FileOutputStream(target)) {
                        fos.write(bytes);
                        fos.flush();
                    }
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "✓ 已保存至手机「下载」目录: " + filename, Toast.LENGTH_LONG).show());
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "保存到下载目录失败: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
            return false;
        }

        /**
         * 调起系统原生分享面板，支持一键发送微信好友/微信朋友圈/钉钉/QQ
         */
        @JavascriptInterface
        public boolean shareImage(String base64Data, String filename, String title) {
            try {
                if (base64Data == null || base64Data.isEmpty()) return false;
                if (base64Data.contains(",")) {
                    base64Data = base64Data.substring(base64Data.indexOf(",") + 1);
                }
                byte[] decodedBytes = Base64.decode(base64Data, Base64.DEFAULT);

                File cachePath = new File(getCacheDir(), "shared_images");
                if (!cachePath.exists()) {
                    cachePath.mkdirs();
                }
                File newFile = new File(cachePath, filename);

                try (FileOutputStream stream = new FileOutputStream(newFile)) {
                    stream.write(decodedBytes);
                    stream.flush();
                }

                Uri contentUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", newFile);

                if (contentUri != null) {
                    Intent shareIntent = new Intent();
                    shareIntent.setAction(Intent.ACTION_SEND);
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    shareIntent.setDataAndType(contentUri, getContentResolver().getType(contentUri));
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    shareIntent.setType("image/png");

                    Intent chooser = Intent.createChooser(shareIntent, title != null ? title : "分享标绘成果图至微信/其他应用");
                    chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(chooser);
                    return true;
                }
            } catch (Exception e) {
                e.printStackTrace();
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "调起分享失败: " + e.getMessage(), Toast.LENGTH_SHORT).show());
            }
            return false;
        }
    }
}
