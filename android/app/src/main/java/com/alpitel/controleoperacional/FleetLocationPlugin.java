package com.alpitel.controleoperacional;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "FleetLocation",
        permissions = {
                @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION}, alias = "location"),
                @Permission(strings = {Manifest.permission.ACCESS_COARSE_LOCATION}, alias = "coarseLocation"),
                @Permission(strings = {Manifest.permission.POST_NOTIFICATIONS}, alias = "notifications")
        }
)
public class FleetLocationPlugin extends Plugin {
    private static final String TAG = "FleetLocationPlugin";
    private static final String CHANNEL_DESPACHO_ID = "fleet_despacho_channel_v3";
    private static final String CHANNEL_OPERACIONAL_ID = "fleet_operacional_channel_v3";
    private BroadcastReceiver locationReceiver;

    @Override
    public void load() {
        super.load();
        createNotificationChannels();

        // Registrar receptor para encaminhar dados de localização e atualizações operacionais para o JavaScript
        locationReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent != null) {
                    if (FleetLocationService.ACTION_LOCATION_BROADCAST.equals(intent.getAction())) {
                        JSObject ret = new JSObject();
                        ret.put("latitude", intent.getDoubleExtra("lat", 0.0));
                        ret.put("longitude", intent.getDoubleExtra("lng", 0.0));
                        if (intent.hasExtra("accuracy")) ret.put("accuracy", intent.getDoubleExtra("accuracy", 0.0));
                        if (intent.hasExtra("speed")) ret.put("speed", intent.getDoubleExtra("speed", 0.0));
                        if (intent.hasExtra("heading")) ret.put("heading", intent.getDoubleExtra("heading", 0.0));
                        ret.put("timestamp", intent.getStringExtra("timestamp"));

                        notifyListeners("locationUpdate", ret);
                    } else if (FleetLocationService.ACTION_OPERATIONAL_BROADCAST.equals(intent.getAction())) {
                        notifyListeners("operationalUpdate", new JSObject());
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(FleetLocationService.ACTION_LOCATION_BROADCAST);
        filter.addAction(FleetLocationService.ACTION_OPERATIONAL_BROADCAST);
        LocalBroadcastManager.getInstance(getContext()).registerReceiver(locationReceiver, filter);
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                        .build();

                // 1. Canal de Despacho de Novas OS (Prioridade Máxima com Banner Heads-Up e Som)
                NotificationChannel despachoChannel = new NotificationChannel(
                        CHANNEL_DESPACHO_ID,
                        "Novas OS & Despacho de Campo",
                        NotificationManager.IMPORTANCE_HIGH
                );
                despachoChannel.setDescription("Alertas de novas ordens de serviço atribuídas ao auditor.");
                despachoChannel.enableLights(true);
                despachoChannel.setLightColor(Color.BLUE);
                despachoChannel.enableVibration(true);
                despachoChannel.setVibrationPattern(new long[]{0, 350, 150, 350, 150, 600});
                despachoChannel.setSound(soundUri, audioAttributes);
                despachoChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                despachoChannel.setBypassDnd(true);
                manager.createNotificationChannel(despachoChannel);

                // 2. Canal de Alterações Operacionais (Remoção, Suspensão, Mudança de Rota, Encerramento de Turno)
                NotificationChannel opChannel = new NotificationChannel(
                        CHANNEL_OPERACIONAL_ID,
                        "Alterações Operacionais & Rota WFM",
                        NotificationManager.IMPORTANCE_HIGH
                );
                opChannel.setDescription("Avisos de alterações de rota, remoção ou suspensão de tarefas.");
                opChannel.enableLights(true);
                opChannel.setLightColor(Color.rgb(249, 115, 22)); // Laranja
                opChannel.enableVibration(true);
                opChannel.setVibrationPattern(new long[]{0, 400, 200, 400});
                opChannel.setSound(soundUri, audioAttributes);
                opChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(opChannel);
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // GERENCIAMENTO DE PERMISSÕES NATIVAS (Android 10+, 13+, Doze Mode)
    // ═════════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        Context context = getContext();

        // 1. Localização em Primeiro Plano (Fine / Coarse)
        boolean hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean locationForeground = hasFine || hasCoarse;

        // 2. Localização em Segundo Plano (Android 10+ / API 29+)
        boolean locationBackground = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            locationBackground = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED;
        }

        // 3. Notificações (Android 13+ / API 33+ ou NotificationManager)
        boolean notifications = NotificationManagerCompat.from(context).areNotificationsEnabled();

        // 4. Bateria (Isenção de otimização / Doze Mode)
        boolean batteryIgnored = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                batteryIgnored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        }
        boolean batteryOptimized = !batteryIgnored;

        boolean allGranted = locationForeground && locationBackground && notifications && batteryIgnored;

        JSObject res = new JSObject();
        res.put("locationForeground", locationForeground);
        res.put("locationBackground", locationBackground);
        res.put("notifications", notifications);
        res.put("batteryOptimized", batteryOptimized);
        res.put("batteryIgnored", batteryIgnored);
        res.put("allGranted", allGranted);

        call.resolve(res);
    }

    @PluginMethod
    public void requestLocationForeground(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }
        requestPermissionForAlias("location", call, "locationCallback");
    }

    @PermissionCallback
    private void locationCallback(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        JSObject res = new JSObject();
        res.put("granted", granted);
        call.resolve(res);
    }

    @PluginMethod
    public void requestLocationBackground(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                JSObject res = new JSObject();
                res.put("granted", true);
                call.resolve(res);
                return;
            }

            // Abre as configurações do app para o usuário selecionar "Permitir o tempo todo"
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);

                JSObject res = new JSObject();
                res.put("granted", false);
                res.put("openedSettings", true);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("Erro ao abrir configurações de localização: " + e.getMessage());
            }
        } else {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
        }
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }

        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissionForAlias("notifications", call, "notificationPermCallback");
        } else {
            openNotificationSettings(call);
        }
    }

    @PermissionCallback
    private void notificationPermCallback(PluginCall call) {
        boolean granted = NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
        JSObject res = new JSObject();
        res.put("granted", granted);
        call.resolve(res);
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        Context context = getContext();
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        boolean isIgnoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
            isIgnoring = pm.isIgnoringBatteryOptimizations(context.getPackageName());
        }
        JSObject ret = new JSObject();
        ret.put("isIgnoring", isIgnoring);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                try {
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + context.getPackageName()));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);

                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("isIgnoring", false);
                    res.put("action", "dialog_opened");
                    call.resolve(res);
                    return;
                } catch (Exception e) {
                    Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);

                    JSObject res = new JSObject();
                    res.put("success", true);
                    res.put("isIgnoring", false);
                    res.put("action", "settings_opened");
                    call.resolve(res);
                    return;
                }
            }
        }
        JSObject res = new JSObject();
        res.put("success", true);
        res.put("isIgnoring", true);
        res.put("action", "already_ignored");
        call.resolve(res);
    }

    @PluginMethod
    public void isLocationEnabled(PluginCall call) {
        Context context = getContext();
        boolean enabled = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            android.location.LocationManager lm = (android.location.LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            enabled = lm != null && lm.isLocationEnabled();
        } else {
            int mode = Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.LOCATION_MODE, Settings.Secure.LOCATION_MODE_OFF);
            enabled = (mode != Settings.Secure.LOCATION_MODE_OFF);
        }
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void openLocationSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + context.getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            intent.putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName());
        } else {
            intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        call.resolve(new JSObject().put("success", true));
    }

    // ═════════════════════════════════════════════════════════════════════════
    // NOTIFICAÇÕES OPERACIONAIS NATIVAS (Áudio Ringtone + Vibração + Heads-Up)
    // ═════════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void sendNativeNotification(PluginCall call) {
        String title = call.getString("title", "Controle Operacional");
        String message = call.getString("message", "");
        String type = call.getString("type", "dispatch"); // dispatch | removal | suspend | route | shift_end
        String osNumber = call.getString("osNumber", "");

        Context context = getContext();
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        createNotificationChannels();

        String channelId = "dispatch".equals(type) ? CHANNEL_DESPACHO_ID : CHANNEL_OPERACIONAL_ID;

        // PendingIntent para abrir o aplicativo na tela atual
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            pendingIntent = PendingIntent.getActivity(
                    context,
                    (int) System.currentTimeMillis(),
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        long[] vibrationPattern;
        if ("dispatch".equals(type)) {
            vibrationPattern = new long[]{0, 350, 150, 350, 150, 600};
        } else if ("removal".equals(type) || "shift_end".equals(type)) {
            vibrationPattern = new long[]{0, 500, 200, 500};
        } else {
            vibrationPattern = new long[]{0, 300, 150, 300};
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(vibrationPattern)
                .setContentIntent(pendingIntent);

        int notifId = (int) (System.currentTimeMillis() % 100000);
        try {
            notificationManager.notify(notifId, builder.build());

            // Disparo de áudio e vibração explícito para garantia 100% audível
            triggerHardwareVibration(vibrationPattern);
            playRingtoneSound(soundUri);

            JSObject res = new JSObject();
            res.put("success", true);
            res.put("notificationId", notifId);
            call.resolve(res);
        } catch (SecurityException e) {
            call.reject("Permissão de notificação negada: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Erro ao disparar notificação nativa: " + e.getMessage());
        }
    }

    private void triggerHardwareVibration(long[] pattern) {
        try {
            Vibrator vibrator = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
                } else {
                    vibrator.vibrate(pattern, -1);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao disparar vibração de hardware: " + e.getMessage());
        }
    }

    private void playRingtoneSound(Uri soundUri) {
        try {
            Ringtone r = RingtoneManager.getRingtone(getContext(), soundUri);
            if (r != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    r.setVolume(1.0f);
                }
                r.play();
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao tocar som de notificação: " + e.getMessage());
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // SERVIÇO DE RASTREAMENTO FOREGROUND
    // ═════════════════════════════════════════════════════════════════════════

    @PluginMethod
    public void startTracking(PluginCall call) {
        String shiftId = call.getString("shiftId", "");
        String auditor = call.getString("auditor", "");
        String date = call.getString("date", "");
        String supabaseUrl = call.getString("supabaseUrl", "");
        String anonKey = call.getString("anonKey", "");

        if (shiftId.isEmpty()) {
            call.reject("shiftId é obrigatório para iniciar o rastreamento.");
            return;
        }

        Context context = getContext();
        Intent serviceIntent = new Intent(context, FleetLocationService.class);
        serviceIntent.putExtra(FleetLocationService.EXTRA_SHIFT_ID, shiftId);
        serviceIntent.putExtra(FleetLocationService.EXTRA_AUDITOR, auditor);
        serviceIntent.putExtra(FleetLocationService.EXTRA_DATE, date);
        serviceIntent.putExtra(FleetLocationService.EXTRA_SUPABASE_URL, supabaseUrl);
        serviceIntent.putExtra(FleetLocationService.EXTRA_ANON_KEY, anonKey);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("message", "FleetLocationService iniciado com sucesso em Foreground.");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao iniciar serviço em primeiro plano: " + e.getMessage(), e);
            call.reject("Falha ao iniciar serviço nativo: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Context context = getContext();
        Intent serviceIntent = new Intent(context, FleetLocationService.class);
        context.stopService(serviceIntent);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "FleetLocationService parado com sucesso.");
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isRunning", FleetLocationService.isRunning);
        ret.put("latitude", FleetLocationService.lastLatitude);
        ret.put("longitude", FleetLocationService.lastLongitude);
        ret.put("lastUpdateTimeMs", FleetLocationService.lastUpdateTimeMs);
        ret.put("totalPointsSent", FleetLocationService.totalPointsSent);
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        if (locationReceiver != null) {
            LocalBroadcastManager.getInstance(getContext()).unregisterReceiver(locationReceiver);
            locationReceiver = null;
        }
        super.handleOnDestroy();
    }
}
