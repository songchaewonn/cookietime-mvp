package com.cookietime.mvp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashSet;
import java.util.Set;

final class TaskAlarmScheduler {
    private static final int[] LEADS={10,5,3,1,0};
    private TaskAlarmScheduler() {}
    static void sync(Context context, String tasksJson) {
        try {
            android.content.SharedPreferences prefs=context.getSharedPreferences("cookie-native",Context.MODE_PRIVATE);
            if(tasksJson.equals(prefs.getString("last-tasks",""))) return;
            AlarmManager alarm=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
            Set<String> previous=prefs.getStringSet("alarm-ids",new HashSet<>());
            for(String id:previous) cancel(context,alarm,Integer.parseInt(id));
            Set<String> next=new HashSet<>(); JSONArray tasks=new JSONArray(tasksJson); long now=System.currentTimeMillis();
            for(int i=0;i<tasks.length();i++) {
                JSONObject task=tasks.getJSONObject(i); if(task.optBoolean("done",false)) continue;
                String start=task.optString("start",""); if(start.isEmpty()) continue;
                long startAt=LocalDateTime.parse(start).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
                String title=task.optString("title","할 일"); String taskId=task.optString("id",title);
                for(int lead:LEADS) {
                    long at=startAt-lead*60_000L; if(at<=now) continue;
                    int request=(taskId+":"+lead).hashCode(); next.add(String.valueOf(request));
                    Intent intent=new Intent(context,CountdownReceiver.class).putExtra("title",title).putExtra("minutes",lead);
                    PendingIntent pending=PendingIntent.getBroadcast(context,request,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
                    if(Build.VERSION.SDK_INT>=31 && !alarm.canScheduleExactAlarms()) alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending);
                    else alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending);
                }
            }
            prefs.edit().putStringSet("alarm-ids",next).putString("last-tasks",tasksJson).apply();
        } catch(Exception ignored) { }
    }
    private static void cancel(Context context, AlarmManager alarm, int request) {
        PendingIntent pending=PendingIntent.getBroadcast(context,request,new Intent(context,CountdownReceiver.class),PendingIntent.FLAG_NO_CREATE|PendingIntent.FLAG_IMMUTABLE);
        if(pending!=null) alarm.cancel(pending);
    }
}
