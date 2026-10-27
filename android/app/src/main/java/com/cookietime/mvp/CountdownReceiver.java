package com.cookietime.mvp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class CountdownReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        NativeNotifications.showCountdown(context,intent.getStringExtra("title"),intent.getIntExtra("minutes",0));
    }
}
