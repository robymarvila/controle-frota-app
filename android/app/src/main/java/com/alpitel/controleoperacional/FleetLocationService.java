package com.alpitel.controleoperacional;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.location.Location;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.Process;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class FleetLocationService extends Service {
    private static final String TAG = "FleetLocationService";
    private static final String CHANNEL_LOCATION_ID = "fleet_location_channel_v2";
    public static final String CHANNEL_DESPACHO_ID = "fleet_despacho_channel_v3";
    public static final String CHANNEL_OPERACIONAL_ID = "fleet_operacional_channel_v3";
    private static final int NOTIFICATION_ID = 77319;

    public static final String ACTION_LOCATION_BROADCAST = "com.alpitel.controleoperacional.LOCATION_UPDATE";
    public static final String ACTION_OPERATIONAL_BROADCAST = "com.alpitel.controleoperacional.OPERATIONAL_UPDATE";
    private static final String PREFS_NAME = "fleet_location_prefs";

    public static final String EXTRA_SHIFT_ID = "extra_shift_id";
    public static final String EXTRA_AUDITOR = "extra_auditor";
    public static final String EXTRA_DATE = "extra_date";
    public static final String EXTRA_SUPABASE_URL = "extra_supabase_url";
    public static final String EXTRA_ANON_KEY = "extra_anon_key";

    public static volatile boolean isRunning = false;
    public static volatile double lastLatitude = 0.0;
    public static volatile double lastLongitude = 0.0;
    public static volatile long lastUpdateTimeMs = 0;
    public static volatile int totalPointsSent = 0;

    private PowerManager.WakeLock wakeLock;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private HandlerThread locationHandlerThread;
    private FleetLocationDbHelper dbHelper;
    private OkHttpClient httpClient;
    private ExecutorService networkExecutor;
    private ScheduledExecutorService scheduledExecutor;

    private String shiftId = "";
    private String auditor = "";
    private String date = "";
    private String supabaseUrl = "";
    private String anonKey = "";

    // Memória nativa das tarefas para monitoramento autônomo com tela apagada
    private static class TaskSnapshot {
        String id;
        String osId;
        String status;
        String plannedStart;
        String endereco;
        String tipoAtividade;
        String suspendReason;
    }

    private final Map<String, TaskSnapshot> knownTasks = new ConcurrentHashMap<>();
    private boolean isInitialTaskSyncDone = false;
    private boolean isShiftClosedNotified = false;

    private long lastLoggedHistoryTimeMs = 0;
    private static final long HISTORY_LOG_INTERVAL_REST_MS = 60000;
    private static final MediaType JSON_MEDIA_TYPE = MediaType.parse("application/json; charset=utf-8");

    @Override
    public void onCreate() {
        super.onCreate();
        dbHelper = new FleetLocationDbHelper(this);
        networkExecutor = Executors.newSingleThreadExecutor();
        scheduledExecutor = Executors.newScheduledThreadPool(3);

        httpClient = new OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .writeTimeout(15, TimeUnit.SECONDS)
                .build();

        // 1. Partial WakeLock não contado para manter a CPU 100% ativa mesmo com tela apagada
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "FleetOperacao:LocationTrackingLock");
                wakeLock.setReferenceCounted(false);
                wakeLock.acquire();
                Log.d(TAG, "WakeLock adquirido (tela desligada não suspenderá a CPU).");
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao adquirir WakeLock: " + e.getMessage());
        }

        // 2. Restaurar credenciais salvas de sessão prévia se houver
        loadSavedConfig();

        // 3. Criar todos os canais de notificação
        createAllNotificationChannels();

        // 4. HandlerThread dedicada de segundo plano para processar GPS independentemente da UI
        locationHandlerThread = new HandlerThread("FleetLocationBgThread", Process.THREAD_PRIORITY_MORE_FAVORABLE);
        locationHandlerThread.start();

        // 5. Inicializar FusedLocationClient
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        createLocationCallback();

        // 6. Iniciar Timers de Segurança: Heartbeat (10s), Auto-Flush (15s) e Monitor Operacional Nativo (4s)
        startScheduledTasks();
    }

    private void saveConfig(String sId, String aud, String dt, String url, String key) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString("shiftId", sId)
                .putString("auditor", aud)
                .putString("date", dt)
                .putString("supabaseUrl", url)
                .putString("anonKey", key)
                .apply();
    }

    private void loadSavedConfig() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (this.shiftId.isEmpty()) this.shiftId = prefs.getString("shiftId", "");
        if (this.auditor.isEmpty()) this.auditor = prefs.getString("auditor", "");
        if (this.date.isEmpty()) this.date = prefs.getString("date", "");
        if (this.supabaseUrl.isEmpty()) this.supabaseUrl = prefs.getString("supabaseUrl", "");
        if (this.anonKey.isEmpty()) this.anonKey = prefs.getString("anonKey", "");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String newShiftId = intent.getStringExtra(EXTRA_SHIFT_ID);
            String newAuditor = intent.getStringExtra(EXTRA_AUDITOR);
            String newDate = intent.getStringExtra(EXTRA_DATE);
            String newSupabaseUrl = intent.getStringExtra(EXTRA_SUPABASE_URL);
            String newAnonKey = intent.getStringExtra(EXTRA_ANON_KEY);

            if (newShiftId != null && !newShiftId.isEmpty()) this.shiftId = newShiftId;
            if (newAuditor != null) this.auditor = newAuditor;
            if (newDate != null) this.date = newDate;
            if (newSupabaseUrl != null && !newSupabaseUrl.isEmpty()) this.supabaseUrl = newSupabaseUrl;
            if (newAnonKey != null && !newAnonKey.isEmpty()) this.anonKey = newAnonKey;

            saveConfig(this.shiftId, this.auditor, this.date, this.supabaseUrl, this.anonKey);
        }

        if (!isRunning) {
            startForegroundNotification();
            startLocationUpdates();
            isRunning = true;
        }

        // Dispara envio imediato da fila acumulada e checagem de tarefas
        networkExecutor.execute(this::flushOfflineQueue);
        networkExecutor.execute(this::checkOperationalUpdatesFromSupabase);

        return START_STICKY;
    }

    private void createAllNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                // 1. Canal Silencioso de Serviço de Localização
                NotificationChannel locChannel = new NotificationChannel(
                        CHANNEL_LOCATION_ID,
                        "Rastreamento de Telemetria Operacional",
                        NotificationManager.IMPORTANCE_LOW
                );
                locChannel.setDescription("Mantém a telemetria GPS ativa em segundo plano.");
                locChannel.enableLights(false);
                locChannel.enableVibration(false);
                locChannel.setSound(null, null);
                manager.createNotificationChannel(locChannel);

                Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                        .build();

                // 2. Canal de Despacho de Novas OS (Prioridade Máxima com Banner Heads-Up e Som)
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

                // 3. Canal de Alterações Operacionais (Remoção, Suspensão, Mudança de Rota, Encerramento de Turno)
                NotificationChannel opChannel = new NotificationChannel(
                        CHANNEL_OPERACIONAL_ID,
                        "Alterações Operacionais & Rota WFM",
                        NotificationManager.IMPORTANCE_HIGH
                );
                opChannel.setDescription("Avisos de alterações de rota, remoção ou suspensão de tarefas.");
                opChannel.enableLights(true);
                opChannel.setLightColor(Color.rgb(249, 115, 22));
                opChannel.enableVibration(true);
                opChannel.setVibrationPattern(new long[]{0, 400, 200, 400});
                opChannel.setSound(soundUri, audioAttributes);
                opChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
                manager.createNotificationChannel(opChannel);
            }
        }
    }

    private void startForegroundNotification() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pendingIntent = null;
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            pendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_LOCATION_ID)
                .setContentTitle("Controle Operacional — Turno Ativo")
                .setContentText("Telemetria e rastreamento em tempo real em execução.")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setContentIntent(pendingIntent)
                .build();

        try {
            if (Build.VERSION.SDK_INT >= 34) {
                startForeground(
                        NOTIFICATION_ID,
                        notification,
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Falha ao iniciar Foreground Service: " + e.getMessage(), e);
        }
    }

    private void startLocationUpdates() {
        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 5000L)
                .setMinUpdateIntervalMillis(2000L)
                .setMinUpdateDistanceMeters(0.0f)
                .setMaxUpdateDelayMillis(5000L)
                .setWaitForAccurateLocation(false)
                .build();

        try {
            Looper bgLooper = (locationHandlerThread != null) ? locationHandlerThread.getLooper() : Looper.getMainLooper();
            fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, bgLooper);
            Log.d(TAG, "LocationUpdates ativadas com sucesso na Background HandlerThread (5s / 0m).");
        } catch (SecurityException e) {
            Log.e(TAG, "Permissão de localização negada: " + e.getMessage());
        }
    }

    private void createLocationCallback() {
        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult locationResult) {
                if (locationResult == null) return;
                for (Location loc : locationResult.getLocations()) {
                    if (loc != null) {
                        handleNewLocation(loc);
                    }
                }
            }
        };
    }

    private void startScheduledTasks() {
        // 1. Heartbeat GPS a cada 10 segundos
        scheduledExecutor.scheduleWithFixedDelay(() -> {
            try {
                if (!isRunning || shiftId.isEmpty()) return;
                long now = System.currentTimeMillis();
                if (now - lastUpdateTimeMs >= 10000) {
                    CancellationTokenSource cts = new CancellationTokenSource();
                    fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cts.getToken())
                            .addOnSuccessListener(loc -> {
                                if (loc != null) {
                                    handleNewLocation(loc);
                                } else {
                                    fusedLocationClient.getLastLocation().addOnSuccessListener(lastLoc -> {
                                        if (lastLoc != null) handleNewLocation(lastLoc);
                                    });
                                }
                            });
                }
            } catch (Exception e) {
                Log.e(TAG, "Erro no Heartbeat: " + e.getMessage());
            }
        }, 10, 10, TimeUnit.SECONDS);

        // 2. Auto-Flush a cada 15 segundos
        scheduledExecutor.scheduleWithFixedDelay(() -> {
            try {
                if (!isRunning) return;
                flushOfflineQueue();
            } catch (Exception e) {
                Log.e(TAG, "Erro no Auto-Flush: " + e.getMessage());
            }
        }, 15, 15, TimeUnit.SECONDS);

        // 3. Monitor Operacional Nativo a cada 4 segundos (Executa com 100% de precisão mesmo com a tela apagada)
        scheduledExecutor.scheduleWithFixedDelay(() -> {
            try {
                if (!isRunning) return;
                checkOperationalUpdatesFromSupabase();
            } catch (Exception e) {
                Log.e(TAG, "Erro no monitor operacional nativo: " + e.getMessage());
            }
        }, 4, 4, TimeUnit.SECONDS);
    }

    private boolean isAuditorMatch(String taskAuditor, String targetAuditor) {
        if (taskAuditor == null || targetAuditor == null) return false;
        String a1 = taskAuditor.trim().toLowerCase();
        String a2 = targetAuditor.trim().toLowerCase();
        if (a1.equals(a2)) return true;
        String prefix1 = a1.contains("@") ? a1.split("@")[0] : a1;
        String prefix2 = a2.contains("@") ? a2.split("@")[0] : a2;
        return prefix1.equals(prefix2);
    }

    /**
     * Monitor autônomo nativo em Java que consulta o Supabase e dispara notificações
     * com som, vibração e banner flutuante mesmo com a tela do celular apagada!
     */
    private void checkOperationalUpdatesFromSupabase() {
        if (supabaseUrl.isEmpty() || anonKey.isEmpty() || auditor.isEmpty()) {
            loadSavedConfig();
            if (supabaseUrl.isEmpty() || anonKey.isEmpty() || auditor.isEmpty()) return;
        }

        // A. Checagem de Tarefas (wfm_tarefas)
        try {
            String url = supabaseUrl + "/rest/v1/wfm_tarefas?select=id,id_origem,auditor,status,planned_start,payload_dados&order=id.desc";
            Request req = new Request.Builder()
                    .url(url)
                    .get()
                    .addHeader("apikey", anonKey)
                    .addHeader("Authorization", "Bearer " + anonKey)
                    .build();

            try (Response res = httpClient.newCall(req).execute()) {
                if (res.isSuccessful() && res.body() != null) {
                    String jsonStr = res.body().string();
                    JSONArray arr = new JSONArray(jsonStr);

                    Map<String, TaskSnapshot> currentServerTasks = new ConcurrentHashMap<>();
                    Set<String> currentAuditorTaskIds = new HashSet<>();

                    for (int i = 0; i < arr.length(); i++) {
                        JSONObject obj = arr.getJSONObject(i);
                        String tAuditor = obj.optString("auditor", "");
                        String tId = String.valueOf(obj.opt("id"));

                        if (isAuditorMatch(tAuditor, auditor)) {
                            TaskSnapshot s = new TaskSnapshot();
                            s.id = tId;
                            s.osId = obj.optString("id_origem", tId);
                            s.status = obj.optString("status", "");
                            s.plannedStart = obj.optString("planned_start", "");

                            JSONObject payload = obj.optJSONObject("payload_dados");
                            if (payload != null) {
                                if (payload.has("osid")) s.osId = payload.optString("osid");
                                s.endereco = payload.optString("endereco_completo", payload.optString("rua", ""));
                                s.tipoAtividade = payload.optString("tipo_atividade", payload.optString("categoria", "Fiscalização"));
                            }

                            currentServerTasks.put(tId, s);
                            currentAuditorTaskIds.add(tId);
                        }
                    }

                    if (!isInitialTaskSyncDone) {
                        // Primeira carga: memoriza o estado inicial sem disparar notificações
                        knownTasks.clear();
                        knownTasks.putAll(currentServerTasks);
                        isInitialTaskSyncDone = true;
                        Log.d(TAG, "Sincronismo inicial de tarefas concluído. Conhecidas: " + knownTasks.size());
                        return;
                    }

                    // 1. Detectar Novas OS ou Alterações
                    for (Map.Entry<String, TaskSnapshot> entry : currentServerTasks.entrySet()) {
                        String tId = entry.getKey();
                        TaskSnapshot current = entry.getValue();

                        if (!knownTasks.containsKey(tId)) {
                            // 🚨 NOVA OS DESPACHADA
                            Log.i(TAG, "🚨 Nova OS despachada detectada pelo Java em background: #" + current.osId);
                            String timeDesc = !current.plannedStart.isEmpty() ? "[" + current.plannedStart.substring(Math.max(0, current.plannedStart.length() - 8)) + "] " : "";
                            String body = timeDesc + (current.tipoAtividade != null ? current.tipoAtividade + " • " : "") + (current.endereco != null ? current.endereco : "Verifique os detalhes no app.");

                            triggerNativeNotification(
                                    "🚨 Nova OS Despachada: #" + current.osId,
                                    body,
                                    "dispatch",
                                    current.osId
                            );
                            knownTasks.put(tId, current);
                            notifyWebViewOperationalUpdate();
                        } else {
                            TaskSnapshot previous = knownTasks.get(tId);
                            if (previous != null) {
                                // ⏸️ OS SUSPENSA
                                if (("suspensa".equalsIgnoreCase(current.status) || "suspended".equalsIgnoreCase(current.status))
                                        && !("suspensa".equalsIgnoreCase(previous.status) || "suspended".equalsIgnoreCase(previous.status))) {
                                    Log.i(TAG, "⏸️ OS suspensa detectada pelo Java: #" + current.osId);
                                    triggerNativeNotification(
                                            "⏸️ OS Suspensa: #" + current.osId,
                                            "A ordem de serviço foi suspensa pelo controlador.",
                                            "suspend",
                                            current.osId
                                    );
                                    knownTasks.put(tId, current);
                                    notifyWebViewOperationalUpdate();
                                }
                                // 🔄 REORDENAÇÃO DE ROTA
                                else if (!current.plannedStart.isEmpty() && !current.plannedStart.equals(previous.plannedStart)) {
                                    Log.i(TAG, "🔄 Reordenação de rota detectada pelo Java: #" + current.osId);
                                    triggerNativeNotification(
                                            "🔄 Reordenação de Rota",
                                            "O controlador alterou a ordem de atendimento das tarefas da sua rota.",
                                            "route",
                                            current.osId
                                    );
                                    knownTasks.put(tId, current);
                                    notifyWebViewOperationalUpdate();
                                }
                            }
                        }
                    }

                    // 2. Detectar OS Retirada da Carga
                    List<String> removedIds = new ArrayList<>();
                    for (Map.Entry<String, TaskSnapshot> entry : knownTasks.entrySet()) {
                        String tId = entry.getKey();
                        if (!currentAuditorTaskIds.contains(tId)) {
                            // ⚠️ OS RETIRADA DA CARGA
                            TaskSnapshot removed = entry.getValue();
                            Log.i(TAG, "⚠️ OS retirada da carga detectada pelo Java: #" + removed.osId);
                            triggerNativeNotification(
                                    "⚠️ OS Retirada da Carga: #" + removed.osId,
                                    "A ordem de serviço foi retirada da sua carga pelo controlador.",
                                    "removal",
                                    removed.osId
                            );
                            removedIds.add(tId);
                            notifyWebViewOperationalUpdate();
                        }
                    }
                    for (String rId : removedIds) {
                        knownTasks.remove(rId);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Erro ao checar tarefas no Supabase: " + e.getMessage());
        }

        // B. Checagem de Encerramento de Turno (autofiscalizacao_shifts)
        if (!shiftId.isEmpty() && !isShiftClosedNotified) {
            try {
                String shiftCheckUrl = supabaseUrl + "/rest/v1/autofiscalizacao_shifts?id=eq." + shiftId + "&select=end_time";
                Request req = new Request.Builder()
                        .url(shiftCheckUrl)
                        .get()
                        .addHeader("apikey", anonKey)
                        .addHeader("Authorization", "Bearer " + anonKey)
                        .build();

                try (Response res = httpClient.newCall(req).execute()) {
                    if (res.isSuccessful() && res.body() != null) {
                        String jsonStr = res.body().string();
                        JSONArray arr = new JSONArray(jsonStr);
                        if (arr.length() > 0) {
                            JSONObject obj = arr.getJSONObject(0);
                            String endTime = obj.optString("end_time", "");
                            if (!endTime.isEmpty() && !"null".equalsIgnoreCase(endTime)) {
                                isShiftClosedNotified = true;
                                triggerNativeNotification(
                                        "🛑 Turno Encerrado pelo Operador",
                                        "Seu turno operacional foi finalizado pelo controlador.",
                                        "shift_end",
                                        ""
                                );
                                notifyWebViewOperationalUpdate();
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Erro ao checar encerramento de turno: " + e.getMessage());
            }
        }
    }

    private void notifyWebViewOperationalUpdate() {
        try {
            Intent broadcast = new Intent(ACTION_OPERATIONAL_BROADCAST);
            LocalBroadcastManager.getInstance(this).sendBroadcast(broadcast);
        } catch (Exception e) {}
    }

    public void triggerNativeNotification(String title, String message, String type, String osNumber) {
        Context context = this;
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        String channelId = "dispatch".equals(type) ? CHANNEL_DESPACHO_ID : CHANNEL_OPERACIONAL_ID;

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

            // Vibração de hardware
            try {
                Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(vibrationPattern, -1));
                    } else {
                        vibrator.vibrate(vibrationPattern, -1);
                    }
                }
            } catch (Exception e) {}

            // Som de ringtone
            try {
                Ringtone r = RingtoneManager.getRingtone(this, soundUri);
                if (r != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        r.setVolume(1.0f);
                    }
                    r.play();
                }
            } catch (Exception e) {}

        } catch (Exception e) {
            Log.e(TAG, "Erro ao disparar notificação no Service: " + e.getMessage());
        }
    }

    private void handleNewLocation(Location location) {
        if (location.getLatitude() < -90 || location.getLatitude() > 90 ||
            location.getLongitude() < -180 || location.getLongitude() > 180) {
            return;
        }

        double lat = location.getLatitude();
        double lng = location.getLongitude();
        Double accuracy = location.hasAccuracy() ? (double) location.getAccuracy() : null;
        Double speedKmh = location.hasSpeed() ? (double) (location.getSpeed() * 3.6f) : 0.0;
        Double heading = location.hasBearing() ? (double) location.getBearing() : null;
        boolean isMoving = speedKmh != null && speedKmh > 3.0;

        lastLatitude = lat;
        lastLongitude = lng;
        lastUpdateTimeMs = System.currentTimeMillis();

        String isoNow = getIsoTimestamp();

        // 1. Broadcast local para a WebView (atualiza o mapa ao vivo se a tela estiver acesa)
        try {
            Intent broadcast = new Intent(ACTION_LOCATION_BROADCAST);
            broadcast.putExtra("lat", lat);
            broadcast.putExtra("lng", lng);
            broadcast.putExtra("accuracy", accuracy);
            broadcast.putExtra("speed", speedKmh);
            broadcast.putExtra("heading", heading);
            broadcast.putExtra("timestamp", isoNow);
            LocalBroadcastManager.getInstance(this).sendBroadcast(broadcast);
        } catch (Exception e) {
            Log.w(TAG, "Erro ao emitir broadcast local: " + e.getMessage());
        }

        // 2. Transmissão HTTP Nativa Assíncrona Direta para o Supabase (Bypass da WebView)
        networkExecutor.execute(() -> {
            transmitLocationToSupabase(lat, lng, accuracy, speedKmh, heading, isMoving, isoNow);
        });
    }

    private void transmitLocationToSupabase(double lat, double lng, Double accuracy, Double speed,
                                            Double heading, boolean isMoving, String isoNow) {
        if (supabaseUrl == null || supabaseUrl.isEmpty() || anonKey == null || anonKey.isEmpty() || shiftId.isEmpty()) {
            loadSavedConfig();
            if (supabaseUrl.isEmpty() || anonKey.isEmpty() || shiftId.isEmpty()) {
                Log.w(TAG, "Configurações do Supabase ou shiftId ausentes no Service.");
                return;
            }
        }

        // A. Atualizar o turno ativo (autofiscalizacao_shifts)
        try {
            JSONObject shiftUpdateJson = new JSONObject();
            shiftUpdateJson.put("gps_lat", lat);
            shiftUpdateJson.put("gps_lng", lng);
            shiftUpdateJson.put("gps_last_update", isoNow);

            String shiftUrl = supabaseUrl + "/rest/v1/autofiscalizacao_shifts?id=eq." + shiftId;
            RequestBody body = RequestBody.create(shiftUpdateJson.toString(), JSON_MEDIA_TYPE);

            Request request = new Request.Builder()
                    .url(shiftUrl)
                    .patch(body)
                    .addHeader("apikey", anonKey)
                    .addHeader("Authorization", "Bearer " + anonKey)
                    .addHeader("Content-Type", "application/json")
                    .addHeader("Prefer", "return=minimal")
                    .build();

            try (Response response = httpClient.newCall(request).execute()) {
                if (response.isSuccessful()) {
                    totalPointsSent++;
                } else {
                    Log.w(TAG, "Falha ao atualizar shift: HTTP " + response.code());
                    dbHelper.insertLog("shift_update", shiftId, auditor, date, lat, lng, accuracy, speed, heading, isMoving, isoNow);
                }
            }
        } catch (IOException e) {
            Log.w(TAG, "Sem rede ao atualizar shift. Gravando offline no SQLite.");
            dbHelper.insertLog("shift_update", shiftId, auditor, date, lat, lng, accuracy, speed, heading, isMoving, isoNow);
        } catch (Exception e) {
            Log.e(TAG, "Erro inesperado ao atualizar shift: " + e.getMessage());
        }

        // B. Inserir ponto histórico (autofiscalizacao_gps_logs)
        long nowMs = System.currentTimeMillis();
        boolean shouldLogHistory = isMoving || (nowMs - lastLoggedHistoryTimeMs >= HISTORY_LOG_INTERVAL_REST_MS);

        if (shouldLogHistory) {
            lastLoggedHistoryTimeMs = nowMs;
            try {
                JSONObject logJson = new JSONObject();
                logJson.put("shift_id", shiftId);
                logJson.put("auditor", auditor);
                logJson.put("date", date);
                logJson.put("lat", lat);
                logJson.put("lng", lng);
                if (accuracy != null) logJson.put("accuracy", accuracy);
                if (speed != null) logJson.put("speed", speed);
                if (heading != null) logJson.put("heading", heading);
                logJson.put("is_moving", isMoving);
                logJson.put("created_at", isoNow);

                String logsUrl = supabaseUrl + "/rest/v1/autofiscalizacao_gps_logs";
                RequestBody body = RequestBody.create(logJson.toString(), JSON_MEDIA_TYPE);

                Request request = new Request.Builder()
                        .url(logsUrl)
                        .post(body)
                        .addHeader("apikey", anonKey)
                        .addHeader("Authorization", "Bearer " + anonKey)
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Prefer", "return=minimal")
                        .build();

                try (Response response = httpClient.newCall(request).execute()) {
                    if (!response.isSuccessful()) {
                        Log.w(TAG, "Falha ao inserir gps_log: HTTP " + response.code());
                        dbHelper.insertLog("gps_log", shiftId, auditor, date, lat, lng, accuracy, speed, heading, isMoving, isoNow);
                    }
                }
            } catch (IOException e) {
                Log.w(TAG, "Sem rede ao inserir gps_log. Gravando offline no SQLite.");
                dbHelper.insertLog("gps_log", shiftId, auditor, date, lat, lng, accuracy, speed, heading, isMoving, isoNow);
            } catch (Exception e) {
                Log.e(TAG, "Erro inesperado ao inserir gps_log: " + e.getMessage());
            }
        }
    }

    private synchronized void flushOfflineQueue() {
        if (supabaseUrl.isEmpty() || anonKey.isEmpty()) {
            loadSavedConfig();
            if (supabaseUrl.isEmpty() || anonKey.isEmpty()) return;
        }

        List<FleetLocationDbHelper.OfflinePoint> points = dbHelper.getPendingPoints(40);
        if (points.isEmpty()) return;

        Log.d(TAG, "Descarregando " + points.size() + " pontos pendentes do SQLite...");

        List<FleetLocationDbHelper.OfflinePoint> shiftUpdates = new ArrayList<>();
        List<FleetLocationDbHelper.OfflinePoint> gpsLogs = new ArrayList<>();

        for (FleetLocationDbHelper.OfflinePoint p : points) {
            if ("shift_update".equals(p.type)) {
                shiftUpdates.add(p);
            } else {
                gpsLogs.add(p);
            }
        }

        // 1. Processar shift_updates
        for (FleetLocationDbHelper.OfflinePoint p : shiftUpdates) {
            try {
                String targetUrl = supabaseUrl + "/rest/v1/autofiscalizacao_shifts?id=eq." + p.shiftId;
                RequestBody body = RequestBody.create(p.toJson().toString(), JSON_MEDIA_TYPE);
                Request req = new Request.Builder()
                        .url(targetUrl)
                        .patch(body)
                        .addHeader("apikey", anonKey)
                        .addHeader("Authorization", "Bearer " + anonKey)
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Prefer", "return=minimal")
                        .build();

                try (Response res = httpClient.newCall(req).execute()) {
                    if (res.isSuccessful()) {
                        dbHelper.deletePoint(p.id);
                    } else {
                        return;
                    }
                }
            } catch (IOException e) {
                return;
            } catch (Exception e) {
                dbHelper.deletePoint(p.id);
            }
        }

        // 2. Processar gps_logs em lote (Batch POST no Supabase)
        if (!gpsLogs.isEmpty()) {
            try {
                JSONArray batchArray = new JSONArray();
                List<Long> batchIds = new ArrayList<>();

                for (FleetLocationDbHelper.OfflinePoint p : gpsLogs) {
                    batchArray.put(p.toJson());
                    batchIds.add(p.id);
                }

                String logsUrl = supabaseUrl + "/rest/v1/autofiscalizacao_gps_logs";
                RequestBody body = RequestBody.create(batchArray.toString(), JSON_MEDIA_TYPE);
                Request req = new Request.Builder()
                        .url(logsUrl)
                        .post(body)
                        .addHeader("apikey", anonKey)
                        .addHeader("Authorization", "Bearer " + anonKey)
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Prefer", "return=minimal")
                        .build();

                try (Response res = httpClient.newCall(req).execute()) {
                    if (res.isSuccessful()) {
                        dbHelper.deletePoints(batchIds);
                        Log.d(TAG, "Lote de " + batchIds.size() + " pontos offline enviado e removido com sucesso do SQLite.");
                    }
                }
            } catch (IOException e) {
                Log.w(TAG, "Sem rede ao enviar lote offline.");
            } catch (Exception e) {
                Log.e(TAG, "Erro ao enviar lote offline: " + e.getMessage());
            }
        }
    }

    private String getIsoTimestamp() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
        return sdf.format(new Date());
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        isRunning = false;

        if (fusedLocationClient != null && locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            Log.d(TAG, "LocationUpdates removidas.");
        }

        if (locationHandlerThread != null) {
            locationHandlerThread.quitSafely();
            locationHandlerThread = null;
        }

        if (scheduledExecutor != null) {
            scheduledExecutor.shutdownNow();
            scheduledExecutor = null;
        }

        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock liberado.");
        }

        if (networkExecutor != null) {
            networkExecutor.shutdown();
        }

        stopForeground(true);
        Log.d(TAG, "FleetLocationService finalizado com sucesso.");
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
