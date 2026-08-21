package com.alpitel.controleoperacional;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class FleetLocationDbHelper extends SQLiteOpenHelper {
    private static final String TAG = "FleetLocationDbHelper";
    private static final String DATABASE_NAME = "fleet_telemetry.db";
    private static final int DATABASE_VERSION = 1;

    public static final String TABLE_OFFLINE_LOGS = "offline_logs";
    public static final String COLUMN_ID = "id";
    public static final String COLUMN_TYPE = "type"; // "shift_update" or "gps_log"
    public static final String COLUMN_SHIFT_ID = "shift_id";
    public static final String COLUMN_AUDITOR = "auditor";
    public static final String COLUMN_DATE = "date";
    public static final String COLUMN_LAT = "lat";
    public static final String COLUMN_LNG = "lng";
    public static final String COLUMN_ACCURACY = "accuracy";
    public static final String COLUMN_SPEED = "speed";
    public static final String COLUMN_HEADING = "heading";
    public static final String COLUMN_IS_MOVING = "is_moving";
    public static final String COLUMN_CREATED_AT = "created_at";

    private static final String TABLE_CREATE =
            "CREATE TABLE " + TABLE_OFFLINE_LOGS + " (" +
                    COLUMN_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, " +
                    COLUMN_TYPE + " TEXT NOT NULL, " +
                    COLUMN_SHIFT_ID + " TEXT NOT NULL, " +
                    COLUMN_AUDITOR + " TEXT, " +
                    COLUMN_DATE + " TEXT, " +
                    COLUMN_LAT + " REAL NOT NULL, " +
                    COLUMN_LNG + " REAL NOT NULL, " +
                    COLUMN_ACCURACY + " REAL, " +
                    COLUMN_SPEED + " REAL, " +
                    COLUMN_HEADING + " REAL, " +
                    COLUMN_IS_MOVING + " INTEGER, " +
                    COLUMN_CREATED_AT + " TEXT NOT NULL" +
                    ");";

    public static class OfflinePoint {
        public long id;
        public String type;
        public String shiftId;
        public String auditor;
        public String date;
        public double lat;
        public double lng;
        public Double accuracy;
        public Double speed;
        public Double heading;
        public boolean isMoving;
        public String createdAt;

        public JSONObject toJson() {
            JSONObject json = new JSONObject();
            try {
                if ("shift_update".equals(type)) {
                    json.put("gps_lat", lat);
                    json.put("gps_lng", lng);
                    json.put("gps_last_update", createdAt);
                } else {
                    json.put("shift_id", shiftId);
                    json.put("auditor", auditor);
                    json.put("date", date);
                    json.put("lat", lat);
                    json.put("lng", lng);
                    if (accuracy != null) json.put("accuracy", accuracy);
                    if (speed != null) json.put("speed", speed);
                    if (heading != null) json.put("heading", heading);
                    json.put("is_moving", isMoving);
                    json.put("created_at", createdAt);
                }
            } catch (Exception e) {
                Log.e(TAG, "Erro ao converter OfflinePoint para JSON: " + e.getMessage());
            }
            return json;
        }
    }

    public FleetLocationDbHelper(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(TABLE_CREATE);
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_OFFLINE_LOGS);
        onCreate(db);
    }

    public synchronized long insertLog(String type, String shiftId, String auditor, String date,
                                       double lat, double lng, Double accuracy, Double speed,
                                       Double heading, boolean isMoving, String createdAt) {
        SQLiteDatabase db = null;
        try {
            db = this.getWritableDatabase();
            ContentValues values = new ContentValues();
            values.put(COLUMN_TYPE, type);
            values.put(COLUMN_SHIFT_ID, shiftId);
            values.put(COLUMN_AUDITOR, auditor);
            values.put(COLUMN_DATE, date);
            values.put(COLUMN_LAT, lat);
            values.put(COLUMN_LNG, lng);
            if (accuracy != null) values.put(COLUMN_ACCURACY, accuracy);
            if (speed != null) values.put(COLUMN_SPEED, speed);
            if (heading != null) values.put(COLUMN_HEADING, heading);
            values.put(COLUMN_IS_MOVING, isMoving ? 1 : 0);
            values.put(COLUMN_CREATED_AT, createdAt);

            long rowId = db.insert(TABLE_OFFLINE_LOGS, null, values);
            Log.d(TAG, "Ponto salvo no SQLite Offline (ID: " + rowId + ", Tipo: " + type + ")");
            return rowId;
        } catch (Exception e) {
            Log.e(TAG, "Erro ao inserir no SQLite: " + e.getMessage());
            return -1;
        }
    }

    public synchronized List<OfflinePoint> getPendingPoints(int limit) {
        List<OfflinePoint> points = new ArrayList<>();
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            db = this.getReadableDatabase();
            cursor = db.query(TABLE_OFFLINE_LOGS, null, null, null, null, null, COLUMN_ID + " ASC", String.valueOf(limit));
            if (cursor != null && cursor.moveToFirst()) {
                do {
                    OfflinePoint p = new OfflinePoint();
                    p.id = cursor.getLong(cursor.getColumnIndexOrThrow(COLUMN_ID));
                    p.type = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_TYPE));
                    p.shiftId = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_SHIFT_ID));
                    p.auditor = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_AUDITOR));
                    p.date = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_DATE));
                    p.lat = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_LAT));
                    p.lng = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_LNG));
                    
                    int accIdx = cursor.getColumnIndexOrThrow(COLUMN_ACCURACY);
                    p.accuracy = cursor.isNull(accIdx) ? null : cursor.getDouble(accIdx);

                    int speedIdx = cursor.getColumnIndexOrThrow(COLUMN_SPEED);
                    p.speed = cursor.isNull(speedIdx) ? null : cursor.getDouble(speedIdx);

                    int headIdx = cursor.getColumnIndexOrThrow(COLUMN_HEADING);
                    p.heading = cursor.isNull(headIdx) ? null : cursor.getDouble(headIdx);

                    p.isMoving = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_IS_MOVING)) == 1;
                    p.createdAt = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_CREATED_AT));

                    points.add(p);
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao buscar pontos offline: " + e.getMessage());
        } finally {
            if (cursor != null) cursor.close();
        }
        return points;
    }

    public synchronized int deletePoints(List<Long> ids) {
        if (ids == null || ids.isEmpty()) return 0;
        SQLiteDatabase db = null;
        int deletedCount = 0;
        try {
            db = this.getWritableDatabase();
            db.beginTransaction();
            for (Long id : ids) {
                deletedCount += db.delete(TABLE_OFFLINE_LOGS, COLUMN_ID + " = ?", new String[]{String.valueOf(id)});
            }
            db.setTransactionSuccessful();
        } catch (Exception e) {
            Log.e(TAG, "Erro ao deletar lote de pontos: " + e.getMessage());
        } finally {
            if (db != null && db.inTransaction()) {
                db.endTransaction();
            }
        }
        return deletedCount;
    }

    public synchronized int deletePoint(long id) {
        try {
            SQLiteDatabase db = this.getWritableDatabase();
            return db.delete(TABLE_OFFLINE_LOGS, COLUMN_ID + " = ?", new String[]{String.valueOf(id)});
        } catch (Exception e) {
            Log.e(TAG, "Erro ao deletar ponto: " + e.getMessage());
            return 0;
        }
    }

    public synchronized int getPendingCount() {
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            db = this.getReadableDatabase();
            cursor = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_OFFLINE_LOGS, null);
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getInt(0);
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro ao contar pendentes: " + e.getMessage());
        } finally {
            if (cursor != null) cursor.close();
        }
        return 0;
    }
}
