package expo.modules.lockscreen

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/** Restarts the lock-screen service after a reboot if the user had it switched on (#17). */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != ACTION_QUICKBOOT) return
    if (!LockscreenModule.supported || !LockscreenPrefs.isEnabled(context)) return
    try {
      context.startForegroundService(Intent(context, LockscreenService::class.java))
    } catch (e: Exception) {
      Log.e(LockscreenService.TAG, "could not restart service after boot", e)
      LockscreenPrefs.setLastError(context, "boot: ${e.javaClass.simpleName}: ${e.message}")
    }
  }

  private companion object {
    // Some Xiaomi builds send this instead of / in addition to BOOT_COMPLETED.
    const val ACTION_QUICKBOOT = "android.intent.action.QUICKBOOT_POWERON"
  }
}
